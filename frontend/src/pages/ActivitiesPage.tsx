import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activityCrowdLevel } from '../components/map/CardMapPreview';
import { InteractiveMapCard } from '../components/ui/InteractiveMapCard';
import type { AppUser } from '../data/mockUser';
import { cancelActivity, getActivities, getActivityCalendarUrl, googleCalendarUrl, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDay(value?: string | null) {
  if (!value) return 'Da definire';
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
}

function isSameDay(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function isThisWeekend(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const dow = today.getDay();
  const sat = new Date(today);
  sat.setHours(0, 0, 0, 0);
  sat.setDate(today.getDate() + (dow === 0 ? -1 : 6 - dow));
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return isSameDay(dateStr, sat) || isSameDay(dateStr, sun);
}

export function ActivitiesPage({ user }: { user?: AppUser }) {
  const userInterests = user?.interessi;
  const userId = user?.id;
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
  const hasInterests = Array.isArray(userInterests) && userInterests.length > 0;

  async function loadActivities() {
    setIsLoading(true);
    setError(null);
    try {
      setActivities(await getActivities());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento delle attività.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadActivities(); }, []);

  // Auto-open popup when navigating from the map with ?open=<id>
  useEffect(() => {
    if (!openId || activities.length === 0) return;
    const target = activities.find((a) => String(a.id) === openId);
    if (target) setSelectedActivity(target);
  }, [activities, openId]);

  useEffect(() => {
    if (!selectedActivity) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedActivity(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedActivity]);

  async function handleJoin(activityId: string) {
    setActionLoading(activityId);
    try {
      const updated = await joinActivity(activityId);
      setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, ...updated } : a)));
      setSelectedActivity((prev) => (prev?.id === activityId ? { ...prev, ...updated } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeave(activityId: string) {
    setActionLoading(activityId);
    try {
      await leaveActivity(activityId);
      await loadActivities();
      setSelectedActivity(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(activityId: string) {
    if (!window.confirm('Vuoi cancellare questa attività? L\'operazione è irreversibile.')) return;
    setActionLoading(activityId);
    try {
      await cancelActivity(activityId);
      await loadActivities();
      setSelectedActivity(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setActionLoading(null);
    }
  }

  // Top-strip summaries (unchanged — just for the cards shown above the main layout)
  const createdByMe = useMemo(
    () => activities.filter((a) => userId && a.creator?.id === userId),
    [activities, userId],
  );
  const participatingIn = useMemo(
    () => activities.filter((a) => userId && a.creator?.id !== userId && a.participantIds?.includes(userId)),
    [activities, userId],
  );

  // Main list: ALL activities (like EventsPage shows all events), filtered only by
  // search/category/time — participation status does not remove items from the list.
  const baseVisible = useMemo(
    () => activities.filter((a) => !hasInterests || userInterests!.includes(a.category)),
    [activities, hasInterests, userInterests],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    baseVisible.forEach((a) => counts.set(a.category, (counts.get(a.category) ?? 0) + 1));
    return Array.from(counts.entries()).map(([cat, count]) => ({ category: cat, count }));
  }, [baseVisible]);

  const visibleActivities = useMemo(
    () => baseVisible.filter((activity) => {
      const q = search.trim().toLowerCase();
      if (category !== 'all' && activity.category !== category) return false;
      if (timeFilter === 'open' && activity.status === 'completa') return false;
      if (timeFilter === 'today') {
        if (!activity.dateTime || !isSameDay(activity.dateTime, new Date())) return false;
      }
      if (timeFilter === 'weekend') {
        if (!isThisWeekend(activity.dateTime)) return false;
      }
      if (!q) return true;
      return `${activity.title} ${activity.description || ''} ${activity.category} ${activity.location || ''}`.toLowerCase().includes(q);
    }),
    [baseVisible, category, search, timeFilter],
  );

  const now = new Date();
  const upcomingAvailable = visibleActivities
    .filter((a) => !a.dateTime || new Date(a.dateTime) >= now)
    .slice()
    .sort((a, b) => {
      const ta = a.dateTime ? new Date(a.dateTime).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.dateTime ? new Date(b.dateTime).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  const pastAvailable = visibleActivities
    .filter((a) => a.dateTime && new Date(a.dateTime) < now)
    .slice()
    .sort((a, b) => new Date(b.dateTime!).getTime() - new Date(a.dateTime!).getTime());

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

  const openActivities = visibleActivities.filter((a) => a.status !== 'completa').length;

  function renderActivityCard(activity: ApiActivity, className = '') {
    return (
      <InteractiveMapCard
        key={activity.id}
        id={activity.id}
        className={`activity-card ${className}`}
        onSelect={() => setSelectedActivity(activity)}
        map={{
          latitude: activity.latitude,
          longitude: activity.longitude,
          title: activity.title,
          category: activity.category,
          description: activity.description || 'Attività spontanea organizzata dalla community.',
          dateTime: activity.dateTime,
          type: 'activity',
          crowdLevel: activityCrowdLevel(activity.participantCount, activity.maxParticipants),
        }}
      >
        <div className="interactive-map-card-header">
          <span>{activity.category}</span>
          <small>{activity.status || 'attiva'}</small>
        </div>
        <h2>{activity.title}</h2>
        <p>{activity.description || 'Attività spontanea organizzata dalla community.'}</p>
        <dl>
          <div><dt>Luogo</dt><dd><GeocodedLocation value={activity.location} /></dd></div>
          <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
          <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
        </dl>
        {activity.dateTime && (
          <CalendarButton
            icsUrl={getActivityCalendarUrl(activity.id)}
            icsFilename={`attivita-${activity.id}.ics`}
            googleUrl={googleCalendarUrl(activity.title, activity.dateTime, activity.location)}
          />
        )}
        {userId && (
          activity.participantIds?.includes(userId)
            ? <button className="ghost-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleLeave(activity.id); }}>{actionLoading === activity.id ? '...' : 'Abbandona'}</button>
            : activity.status !== 'completa'
              ? <button className="primary-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleJoin(activity.id); }}>{actionLoading === activity.id ? '...' : 'Partecipa'}</button>
              : <span className="muted-copy">Al completo</span>
        )}
      </InteractiveMapCard>
    );
  }

  return (
    <section className="activities-page">
      <header className="activities-hero">
        <label className="city-search activity-search">
          <span>Cerca</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Cerca attività, zona, categoria" />
        </label>
        <div className="time-filter" aria-label="Filtro attività">
          <button className={timeFilter === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('all')}>Tutte</button>
          <button className={timeFilter === 'today' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('today')}>Oggi</button>
          <button className={timeFilter === 'weekend' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('weekend')}>Weekend</button>
          <button className={timeFilter === 'open' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('open')}>Aperte</button>
        </div>
        <div className="activities-hero-stats">
          <span>
            <strong>{timeFilter === 'open' ? openActivities : upcomingAvailable.length}</strong>
            {' '}
            {timeFilter === 'open' ? 'aperte' : timeFilter === 'today' ? 'oggi' : 'attività'}
          </span>
          <button className="refresh-button" onClick={loadActivities} type="button">Aggiorna</button>
        </div>
      </header>

      {isLoading && <div className="state-panel liquid-panel">Caricamento attività...</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button onClick={loadActivities} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && activities.length === 0 && (
        <div className="state-panel liquid-panel">Nessuna attività trovata nel database.</div>
      )}

      {/* ── Le mie attività ─────────────────────────────────────────── */}
      {userId && !isLoading && createdByMe.length > 0 && (
        <section className="my-activities-section" aria-label="Attività create da me">
          <h2>Le mie attività <span className="section-count">{createdByMe.length}</span></h2>
          <div className="event-card-strip">
            {createdByMe.map((activity) => (
              <article key={activity.id} className="activity-card event-explorer-card" onClick={() => setSelectedActivity(activity)}>
                <div className="interactive-map-card-header">
                  <span>{activity.category}</span>
                  <small className="badge">Creata da te</small>
                </div>
                <h2>{activity.title}</h2>
                <dl>
                  <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
                  <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
                  <div><dt>Stato</dt><dd>{activity.status || 'attiva'}</dd></div>
                </dl>
                <div className="card-actions-row">
                  <button className="danger-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleCancel(activity.id); }}>
                    {actionLoading === activity.id ? '...' : 'Cancella attività'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Sto partecipando ────────────────────────────────────────── */}
      {userId && !isLoading && participatingIn.length > 0 && (
        <section className="my-activities-section" aria-label="Attività a cui partecipo">
          <h2>Sto partecipando <span className="section-count">{participatingIn.length}</span></h2>
          <div className="event-card-strip">
            {participatingIn.map((activity) => (
              <article key={activity.id} className="activity-card event-explorer-card" onClick={() => setSelectedActivity(activity)}>
                <div className="interactive-map-card-header">
                  <span>{activity.category}</span>
                  <small>Partecipante</small>
                </div>
                <h2>{activity.title}</h2>
                <dl>
                  <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
                  <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
                </dl>
                <div className="card-actions-row">
                  <button className="ghost-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={(e) => { e.stopPropagation(); handleLeave(activity.id); }}>
                    {actionLoading === activity.id ? '...' : 'Abbandona'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!isLoading && !error && upcomingAvailable.length > 0 && (
        <div className="event-editorial-layout">
          {featuredActivity && (
            <>
              <h3 className="section-eyebrow featured-section-title">Prossima Attività</h3>
              <article className="event-feature-story">
                <div className="event-date-tile">
                  <strong>{formatDay(featuredActivity.dateTime)}</strong>
                  <span>{formatDateTime(featuredActivity.dateTime)}</span>
                </div>
                <div>
                  <div className="feature-badges" aria-label="Categoria attività">
                    <span>{featuredActivity.category}</span>
                  </div>
                  <h2>{featuredActivity.title}</h2>
                  <p>{featuredActivity.description || 'Attività spontanea organizzata dalla community.'}</p>
                </div>
              </article>
            </>
          )}

          <aside className="event-timeline-panel">
            <span className="section-eyebrow">Timeline</span>
            <ol className="event-timeline-grouped">
              {timelineByDay.map(([day, acts]) => (
                <li key={day} className="event-timeline-day">
                  <time>{day !== 'unknown' ? formatDay(day) : 'Data da definire'}</time>
                  <ul>
                    {acts.map((a) => (
                      <li key={a.id}>{a.title}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            {categoryCounts.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="section-eyebrow">Categoria</span>
                <div className="category-pill-list" style={{ marginTop: 8 }}>
                  <button className={category === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setCategory('all')}>Tutte</button>
                  {categoryCounts.map((item) => (
                    <button className={category === item.category ? 'active-filter' : undefined} key={item.category} type="button" onClick={() => setCategory(item.category)}>
                      {item.category} <strong>{item.count}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="event-card-strip">
            {upcomingAvailable.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}
          </div>
        </div>
      )}

      {/* ── Attività passate ────────────────────────────────────────── */}
      {!isLoading && pastAvailable.length > 0 && (
        <section className="my-activities-section" aria-label="Attività passate">
          <button
            type="button"
            className="ghost-button compact-button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
          >
            {showPast ? '▾' : '▸'} Attività passate <span className="section-count">{pastAvailable.length}</span>
          </button>
          {showPast && (
            <div className="event-card-strip" style={{ marginTop: 14, opacity: 0.85 }}>
              {pastAvailable.map((activity) => renderActivityCard(activity, 'event-explorer-card'))}
            </div>
          )}
        </section>
      )}

      {/* ── Popup dettaglio ─────────────────────────────────────────── */}
      {selectedActivity && (
        <div className="activity-popup-backdrop" role="presentation" onClick={() => setSelectedActivity(null)}>
          <article
            className="activity-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="activity-popup-close" type="button" onClick={() => setSelectedActivity(null)} aria-label="Chiudi">
              ×
            </button>
            <span className="section-eyebrow">{selectedActivity.category}</span>
            <h2 id="activity-popup-title">{selectedActivity.title}</h2>
            <p>{selectedActivity.description || 'Attività spontanea organizzata dalla community.'}</p>
            <dl>
              <div><dt>Luogo</dt><dd><GeocodedLocation value={selectedActivity.location} /></dd></div>
              <div><dt>Quando</dt><dd>{formatDateTime(selectedActivity.dateTime)}</dd></div>
              <div><dt>Partecipanti</dt><dd>{selectedActivity.participantCount} / {selectedActivity.maxParticipants}</dd></div>
            </dl>
            <div className="activity-popup-actions">
              {selectedActivity.dateTime && (
                <CalendarButton
                  icsUrl={getActivityCalendarUrl(selectedActivity.id)}
                  icsFilename={`attivita-${selectedActivity.id}.ics`}
                  googleUrl={googleCalendarUrl(selectedActivity.title, selectedActivity.dateTime, selectedActivity.location)}
                />
              )}
              {userId && (
                selectedActivity.creator?.id === userId
                  ? <button className="danger-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleCancel(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : 'Cancella attività'}</button>
                  : selectedActivity.participantIds?.includes(userId)
                    ? <button className="ghost-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleLeave(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : 'Abbandona'}</button>
                    : selectedActivity.status !== 'completa'
                      ? <button className="primary-button" type="button" disabled={actionLoading === selectedActivity.id} onClick={() => handleJoin(selectedActivity.id)}>{actionLoading === selectedActivity.id ? '...' : 'Partecipa'}</button>
                      : <span className="muted-copy">Al completo</span>
              )}
              <button className="ghost-button" type="button" onClick={() => setSelectedActivity(null)}>Chiudi</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
