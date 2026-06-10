import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { activityCrowdLevel } from '../components/map/CardMapPreview';
import { InteractiveMapCard } from '../components/ui/InteractiveMapCard';
import type { AppUser } from '../data/mockUser';
import { cancelActivity, getActivities, getActivityCalendarUrl, googleCalendarUrl, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDateTime, formatDay } from '../lib/formatters';
import { resolveActivityTitle } from '../lib/activityTitle';

function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasExplicitTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (!hasExplicitTimezone) {
    const localDate = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (localDate) {
      return new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]), Number(localDate[4] ?? 0), Number(localDate[5] ?? 0), Number(localDate[6] ?? 0));
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endDateFromStartAndTime(start: Date, endTime?: string | null): Date {
  const end = new Date(start);
  const time = endTime?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!time) return end;
  end.setHours(Number(time[1]), Number(time[2]), Number(time[3] ?? 0), 0);
  if (end < start) end.setDate(end.getDate() + 1);
  return end;
}

function happensToday(activity: ApiActivity, ref: Date): boolean {
  const start = parseLocalDateTime(activity.dateTime);
  if (!start) return false;
  const end = endDateFromStartAndTime(start, activity.endTime);
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return start < dayEnd && end >= dayStart;
}

function isUpcomingWeekend(dateStr: string | null | undefined): boolean {
  const date = parseLocalDateTime(dateStr);
  if (!date) return false;
  const day = date.getDay();
  return date >= new Date() && (day === 0 || day === 6);
}

export function ActivitiesPage({ user }: { user?: AppUser }) {
  const { t } = useTranslation();
  const translateStatus = (s?: string | null) => {
    if (!s || s === 'attiva') return t('activities.statusActive');
    if (s === 'cancellata') return t('activities.statusCancelled');
    if (s === 'conclusa') return t('activities.statusCompleted');
    return s;
  };
  const activityTitle = (a: { category?: string | null }) => resolveActivityTitle(a.category, t);
  const userInterests = user?.interessi ?? [];
  const userId = user?.id;
  const canParticipate = user?.role === 'registered_user';
  const [searchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ApiActivity | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'weekend' | 'open'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const hasInterests = userInterests.length > 0;

  async function loadActivities(silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    try { setActivities(await getActivities()); }
    catch (e) { if (!silent) setError(e instanceof Error ? e.message : t('activities.loading')); }
    finally { if (!silent) setIsLoading(false); }
  }

  useEffect(() => { void loadActivities(); }, []);
  useAutoRefresh(() => loadActivities(true), 30_000);

  useEffect(() => {
    if (!openId || activities.length === 0) return;
    const target = activities.find((a) => String(a.id) === openId);
    if (target) setSelectedActivity(target);
  }, [activities, openId]);

  useEffect(() => {
    if (!selectedActivity) return undefined;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedActivity(null); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedActivity]);

  async function handleJoin(activityId: string) {
    setActionLoading(activityId);
    try {
      const updated = await joinActivity(activityId);
      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, ...updated } : a)));
      setSelectedActivity((prev) => (prev?.id === activityId ? { ...prev, ...updated } : prev));
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setActionLoading(null); }
  }

  async function handleLeave(activityId: string) {
    setActionLoading(activityId);
    try { await leaveActivity(activityId); await loadActivities(); setSelectedActivity(null); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setActionLoading(null); }
  }

  async function handleCancel(activityId: string) {
    if (!window.confirm(t('activities.cancelConfirm'))) return;
    setActionLoading(activityId);
    try { await cancelActivity(activityId); await loadActivities(); setSelectedActivity(null); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setActionLoading(null); }
  }

  const createdByMe = useMemo(() => activities.filter((a) => userId && a.creator?.id === userId), [activities, userId]);
  const participatingIn = useMemo(() => activities.filter((a) => userId && a.creator?.id !== userId && a.participantIds?.includes(userId)), [activities, userId]);

  const categoryCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      if (timeFilter === 'open' && activity.status === 'completa') return;
      if (timeFilter === 'today' && !happensToday(activity, new Date())) return;
      if (timeFilter === 'weekend' && !isUpcomingWeekend(activity.dateTime)) return;
      if (q && !`${activity.title} ${activity.description || ''} ${activity.category} ${activity.location || ''}`.toLowerCase().includes(q)) return;
      counts.set(activity.category, (counts.get(activity.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([cat, count]) => ({ category: cat, count }));
  }, [activities, search, timeFilter]);

  const filteredActivities = useMemo(
    () => activities.filter((activity) => {
      const q = search.trim().toLowerCase();
      if (category !== 'all' && activity.category !== category) return false;
      if (timeFilter === 'open' && activity.status === 'completa') return false;
      if (timeFilter === 'today' && !happensToday(activity, new Date())) return false;
      if (timeFilter === 'weekend' && !isUpcomingWeekend(activity.dateTime)) return false;
      if (!q) return true;
      return `${activity.title} ${activity.description || ''} ${activity.category} ${activity.location || ''}`.toLowerCase().includes(q);
    }),
    [activities, category, search, timeFilter],
  );

  const recommendedActivities = useMemo(
    () => (hasInterests ? filteredActivities.filter((a) => userInterests.includes(a.category)) : filteredActivities),
    [filteredActivities, hasInterests, userInterests],
  );
  const otherFilteredActivities = useMemo(
    () => (hasInterests ? filteredActivities.filter((a) => !userInterests.includes(a.category)) : []),
    [filteredActivities, hasInterests, userInterests],
  );

  const now = new Date();
  const upcomingAvailable = recommendedActivities.filter((a) => !a.dateTime || new Date(a.dateTime) >= now).slice().sort((a, b) => {
    const ta = a.dateTime ? new Date(a.dateTime).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.dateTime ? new Date(b.dateTime).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
  const pastAvailable = recommendedActivities.filter((a) => a.dateTime && new Date(a.dateTime) < now).slice().sort((a, b) => new Date(b.dateTime!).getTime() - new Date(a.dateTime!).getTime());
  const featuredActivity = upcomingAvailable[0];
  const timelineActivities = upcomingAvailable.slice(0, 5);
  const timelineByDay = useMemo(() => {
    const groups = new Map<string, typeof timelineActivities>();
    timelineActivities.forEach((a) => {
      const key = a.dateTime ? new Date(a.dateTime).toISOString().slice(0, 10) : 'unknown';
      const arr = groups.get(key) ?? [];
      arr.push(a);
      groups.set(key, arr);
    });
    return Array.from(groups.entries());
  }, [timelineActivities]);

  const filteredOpenActivities = filteredActivities.filter((a) => a.status !== 'completa').length;
  const filteredUpcomingActivities = filteredActivities.filter((a) => !a.dateTime || new Date(a.dateTime) >= now).length;

  function renderActivityCard(activity: ApiActivity, className = '') {
    return (
      <InteractiveMapCard
        key={activity.id} id={activity.id}
        className={`activity-card ${className}`}
        onSelect={() => setSelectedActivity(activity)}
        map={{ latitude: activity.latitude, longitude: activity.longitude, title: activity.title, category: activity.category, description: activity.description || t('activities.defaultDescription'), dateTime: activity.dateTime, type: 'activity', crowdLevel: activityCrowdLevel(activity.participantCount, activity.maxParticipants) }}
      >
        <div className="interactive-map-card-header">
          <span>{t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}</span>
          <small>{translateStatus(activity.status)}</small>
        </div>
        <h2>{activityTitle(activity)}</h2>
        <p>{activity.description || t('activities.defaultDescription')}</p>
        <dl>
          <div><dt>{t('common.where')}</dt><dd><GeocodedLocation value={activity.location} /></dd></div>
          <div><dt>{t('common.when')}</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
          <div><dt>{t('common.participants')}</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
        </dl>
        {activity.dateTime && (
          <CalendarButton icsUrl={getActivityCalendarUrl(activity.id)} icsFilename={`attivita-${activity.id}.ics`} googleUrl={googleCalendarUrl(activity.title, activity.dateTime, activity.location)} />
        )}
        {canParticipate && userId && (
          activity.participantIds?.includes(userId)
            ? <button className="ghost-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleLeave(activity.id); }}>{actionLoading === activity.id ? '...' : t('activities.leave')}</button>
            : activity.status !== 'completa'
              ? <button className="primary-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleJoin(activity.id); }}>{actionLoading === activity.id ? '...' : t('activities.join')}</button>
              : <span className="muted-copy">{t('activities.full')}</span>
        )}
      </InteractiveMapCard>
    );
  }

  return (
    <section className="activities-page">
      <header className="activities-hero">
        <label className="city-search activity-search">
          <span>{t('common.search')}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder={t('activities.searchPlaceholder')} />
        </label>
        <div className="time-filter" aria-label={t('activities.loading')}>
          <button className={timeFilter === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('all')}>{t('filters.all')}</button>
          <button className={timeFilter === 'today' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('today')}>{t('filters.today')}</button>
          <button className={timeFilter === 'weekend' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('weekend')}>{t('filters.weekend')}</button>
          <button className={timeFilter === 'open' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('open')}>{t('filters.open')}</button>
        </div>
        <div className="activities-hero-stats">
          <span>
            <strong>{timeFilter === 'open' ? filteredOpenActivities : filteredUpcomingActivities}</strong>
            {' '}
            {timeFilter === 'open' ? t('activities.openStat') : timeFilter === 'today' ? t('activities.todayStat') : t('activities.activitiesStat')}
          </span>
          {isLoading && <span className="muted-copy auto-refresh-hint">{t('common.updating')}</span>}
        </div>
      </header>

      {isLoading && <div className="state-panel liquid-panel">{t('activities.loading')}</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button onClick={() => loadActivities()} type="button">{t('common.retry')}</button>
        </div>
      )}
      {!isLoading && !error && activities.length === 0 && (
        <div className="state-panel liquid-panel">{t('activities.noActivities')}</div>
      )}
      {!isLoading && !error && activities.length > 0 && recommendedActivities.length === 0 && otherFilteredActivities.length === 0 && (
        <div className="state-panel liquid-panel">{t('activities.noResults')}</div>
      )}

      {userId && !isLoading && createdByMe.length > 0 && (
        <section className="my-activities-section" aria-label={t('activities.createdByMe')}>
          <h2>{t('activities.createdByMe')} <span className="section-count">{createdByMe.length}</span></h2>
          <div className="event-card-strip">
            {createdByMe.map((activity) => (
              <article key={activity.id} className="activity-card event-explorer-card" onClick={() => setSelectedActivity(activity)}>
                <div className="interactive-map-card-header">
                  <span>{t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}</span>
                  <small className="badge">{t('activities.createdByMeBadge')}</small>
                </div>
                <h2>{activityTitle(activity)}</h2>
                <dl>
                  <div><dt>{t('common.when')}</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
                  <div><dt>{t('common.participants')}</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
                  <div><dt>{t('common.status')}</dt><dd>{translateStatus(activity.status)}</dd></div>
                </dl>
                <div className="card-actions-row">
                  <button className="danger-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleCancel(activity.id); }}>
                    {actionLoading === activity.id ? '...' : t('activities.cancel')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {userId && !isLoading && participatingIn.length > 0 && (
        <section className="my-activities-section" aria-label={t('activities.participating')}>
          <h2>{t('activities.participating')} <span className="section-count">{participatingIn.length}</span></h2>
          <div className="event-card-strip">
            {participatingIn.map((activity) => (
              <article key={activity.id} className="activity-card event-explorer-card" onClick={() => setSelectedActivity(activity)}>
                <div className="interactive-map-card-header">
                  <span>{t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}</span>
                  <small>{t('activities.participantBadge')}</small>
                </div>
                <h2>{activityTitle(activity)}</h2>
                <dl>
                  <div><dt>{t('common.when')}</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
                  <div><dt>{t('common.participants')}</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
                </dl>
                <div className="card-actions-row">
                  <button className="ghost-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleLeave(activity.id); }}>
                    {actionLoading === activity.id ? '...' : t('activities.leave')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!isLoading && !error && hasInterests && filteredActivities.length > 0 && (
        <section className="preference-section" aria-label={t('activities.recommendedTitle')}>
          <div className="preference-section-header">
            <div>
              <span className="section-eyebrow">{t('activities.recommended')}</span>
              <h2>{t('activities.recommendedTitle')} <span className="section-count">{recommendedActivities.length}</span></h2>
            </div>
          </div>
          {recommendedActivities.length === 0 && <div className="preference-empty-state">{t('activities.noRecommended')}</div>}
          {recommendedActivities.length > 0 && upcomingAvailable.length === 0 && <div className="preference-empty-state">{t('activities.noRecommendedScheduled')}</div>}
          {upcomingAvailable.length > 0 && (
            <div className="event-editorial-layout">
              {featuredActivity && (
                <div className="featured-activity-story-stack">
                  <h3 className="section-eyebrow featured-section-title">{t('activities.next')}</h3>
                  <article className="event-feature-story">
                    <div className="event-date-tile">
                      <strong>{formatDay(featuredActivity.dateTime)}</strong>
                      <span>{formatDateTime(featuredActivity.dateTime)}</span>
                    </div>
                    <div>
                      <div className="feature-badges" aria-label={t('common.category')}><span>{t(`categories.${featuredActivity.category?.toLowerCase()}`, { defaultValue: featuredActivity.category })}</span></div>
                      <h2>{activityTitle(featuredActivity)}</h2>
                      <p>{featuredActivity.description || t('activities.defaultDescription')}</p>
                    </div>
                  </article>
                </div>
              )}
              <aside className="event-timeline-panel">
                <span className="section-eyebrow">{t('activities.timeline')}</span>
                <ol className="event-timeline-grouped">
                  {timelineByDay.map(([day, acts]) => (
                    <li key={day} className="event-timeline-day">
                      <time>{day !== 'unknown' ? formatDay(day) : t('common.dateTBD')}</time>
                      <ul>{acts.map((a) => <li key={a.id}>{activityTitle(a)}</li>)}</ul>
                    </li>
                  ))}
                </ol>
                {categoryCounts.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <span className="section-eyebrow">{t('common.category')}</span>
                    <div className="category-pill-list" style={{ marginTop: 8 }}>
                      <button className={category === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setCategory('all')}>{t('activities.allCategories')}</button>
                      {categoryCounts.map((item) => (
                        <button className={category === item.category ? 'active-filter' : undefined} key={item.category} type="button" onClick={() => setCategory(item.category)}>
                          {t(`categories.${item.category?.toLowerCase()}`, { defaultValue: item.category })} <strong>{item.count}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
              <div className="event-card-strip">{upcomingAvailable.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}</div>
            </div>
          )}
        </section>
      )}

      {!isLoading && !error && !hasInterests && upcomingAvailable.length > 0 && (
        <section className="preference-section" aria-label={t('activities.featuredTitle')}>
          <div className="preference-section-header">
            <div>
              <span className="section-eyebrow">{t('activities.featured')}</span>
              <h2>{t('activities.featuredTitle')} <span className="section-count">{upcomingAvailable.length}</span></h2>
            </div>
          </div>
          <div className="event-editorial-layout">
            {featuredActivity && (
              <div className="featured-activity-story-stack">
                <h3 className="section-eyebrow featured-section-title">{t('activities.next')}</h3>
                <article className="event-feature-story">
                  <div className="event-date-tile">
                    <strong>{formatDay(featuredActivity.dateTime)}</strong>
                    <span>{formatDateTime(featuredActivity.dateTime)}</span>
                  </div>
                  <div>
                    <div className="feature-badges" aria-label={t('common.category')}><span>{t(`categories.${featuredActivity.category?.toLowerCase()}`, { defaultValue: featuredActivity.category })}</span></div>
                    <h2>{activityTitle(featuredActivity)}</h2>
                    <p>{featuredActivity.description || t('activities.defaultDescription')}</p>
                  </div>
                </article>
              </div>
            )}
            <aside className="event-timeline-panel">
              <span className="section-eyebrow">{t('activities.timeline')}</span>
              <ol className="event-timeline-grouped">
                {timelineByDay.map(([day, acts]) => (
                  <li key={day} className="event-timeline-day">
                    <time>{day !== 'unknown' ? formatDay(day) : t('common.dateTBD')}</time>
                    <ul>{acts.map((a) => <li key={a.id}>{activityTitle(a)}</li>)}</ul>
                  </li>
                ))}
              </ol>
              {categoryCounts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <span className="section-eyebrow">{t('common.category')}</span>
                  <div className="category-pill-list" style={{ marginTop: 8 }}>
                    <button className={category === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setCategory('all')}>{t('activities.allCategories')}</button>
                    {categoryCounts.map((item) => (
                      <button className={category === item.category ? 'active-filter' : undefined} key={item.category} type="button" onClick={() => setCategory(item.category)}>
                        {t(`categories.${item.category?.toLowerCase()}`, { defaultValue: item.category })} <strong>{item.count}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
            <div className="event-card-strip">{upcomingAvailable.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}</div>
          </div>
        </section>
      )}

      {!isLoading && pastAvailable.length > 0 && (
        <section className="my-activities-section" aria-label={t('activities.past')}>
          <button type="button" className="ghost-button compact-button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast}>
            {showPast ? '▾' : '▸'} {t('activities.past')} <span className="section-count">{pastAvailable.length}</span>
          </button>
          {showPast && <div className="event-card-strip" style={{ marginTop: 14, opacity: 0.85 }}>{pastAvailable.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}</div>}
        </section>
      )}

      {!isLoading && !error && hasInterests && otherFilteredActivities.length > 0 && (
        <section className="preference-section preference-section-secondary" aria-label={t('activities.others')}>
          <div className="preference-section-header">
            <div>
              <span className="section-eyebrow">{t('activities.discover')}</span>
              <h2>{t('activities.others')} <span className="section-count">{otherFilteredActivities.length}</span></h2>
            </div>
          </div>
          <div className="event-card-strip">{otherFilteredActivities.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}</div>
        </section>
      )}

      {selectedActivity && (
        <div className="activity-popup-backdrop" role="presentation" onClick={() => setSelectedActivity(null)}>
          <article className="activity-popup" role="dialog" aria-modal="true" aria-labelledby="activity-popup-title" onClick={(e) => e.stopPropagation()}>
            <button className="activity-popup-close" type="button" onClick={() => setSelectedActivity(null)} aria-label={t('common.close')}>×</button>
            <span className="section-eyebrow">{t(`categories.${selectedActivity.category?.toLowerCase()}`, { defaultValue: selectedActivity.category })}</span>
            <h2 id="activity-popup-title">{activityTitle(selectedActivity)}</h2>
            <p>{selectedActivity.description || t('activities.defaultDescription')}</p>
            <dl>
              <div><dt>{t('common.where')}</dt><dd><GeocodedLocation value={selectedActivity.location} /></dd></div>
              <div><dt>{t('common.when')}</dt><dd>{formatDateTime(selectedActivity.dateTime)}</dd></div>
              <div><dt>{t('common.participants')}</dt><dd>{selectedActivity.participantCount} / {selectedActivity.maxParticipants}</dd></div>
            </dl>
            <div className="activity-popup-actions">
              {selectedActivity.dateTime && (
                <CalendarButton icsUrl={getActivityCalendarUrl(selectedActivity.id)} icsFilename={`attivita-${selectedActivity.id}.ics`} googleUrl={googleCalendarUrl(selectedActivity.title, selectedActivity.dateTime, selectedActivity.location)} />
              )}
              {canParticipate && userId && (
                selectedActivity.creator?.id === userId
                  ? <button className="danger-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleCancel(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : t('activities.cancel')}</button>
                  : selectedActivity.participantIds?.includes(userId)
                    ? <button className="ghost-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleLeave(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : t('activities.leave')}</button>
                    : selectedActivity.status !== 'completa'
                      ? <button className="primary-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleJoin(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : t('activities.join')}</button>
                      : <span className="muted-copy">{t('activities.full')}</span>
              )}
              <button className="ghost-button" type="button" onClick={() => setSelectedActivity(null)}>{t('common.close')}</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
