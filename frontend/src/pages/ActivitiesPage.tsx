import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activityCrowdLevel } from '../components/map/CardMapPreview';
import { InteractiveMapCard } from '../components/ui/InteractiveMapCard';
import type { AppUser } from '../data/mockUser';
import { cancelActivity, getActivities, getActivityCalendarUrl, googleCalendarUrl, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'open'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  useEffect(() => {
    void loadActivities();
  }, []);

  // Auto-open popup when navigating from the map with ?open=<id>
  useEffect(() => {
    if (!openId || activities.length === 0) return;
    const target = activities.find((a) => String(a.id) === openId);
    if (target) setSelectedActivity(target);
  }, [activities, openId]);

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

  const baseActivities = useMemo(
    () => activities.filter((activity) => !hasInterests || userInterests!.includes(activity.category)),
    [activities, hasInterests, userInterests],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    baseActivities.forEach((activity) => counts.set(activity.category, (counts.get(activity.category) ?? 0) + 1));
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }, [baseActivities]);

  const visibleActivities = useMemo(
    () => baseActivities.filter((activity) => {
      const q = search.trim().toLowerCase();
      if (category !== 'all' && activity.category !== category) return false;
      if (timeFilter === 'open' && activity.status === 'completa') return false;
      if (timeFilter === 'today' && activity.dateTime) {
        const eventDate = new Date(activity.dateTime);
        const today = new Date();
        if (
          eventDate.getFullYear() !== today.getFullYear()
          || eventDate.getMonth() !== today.getMonth()
          || eventDate.getDate() !== today.getDate()
        ) return false;
      }
      if (!q) return true;
      return `${activity.title} ${activity.description || ''} ${activity.category} ${activity.location || ''}`.toLowerCase().includes(q);
    }),
    [baseActivities, category, search, timeFilter],
  );

  const myActivities = useMemo(
    () => activities.filter((a) => userId && (a.participantIds?.includes(userId) || a.creator?.id === userId)),
    [activities, userId],
  );

  const featuredActivity = visibleActivities[0];

  const openActivities = visibleActivities.filter((activity) => activity.status !== 'completa').length;

  useEffect(() => {
    if (!selectedActivity) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedActivity(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedActivity]);

  return (
    <section className="activities-page">
      <header className="activities-hero">
        <label className="city-search activity-search">
          <span>Cerca</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cerca attività, zona, categoria" />
        </label>
        <div className="time-filter" aria-label="Filtro attività">
          <button className={timeFilter === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('all')}>Tutte</button>
          <button className={timeFilter === 'today' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('today')}>Oggi</button>
          <button className={timeFilter === 'open' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('open')}>Aperte</button>
        </div>
        <div className="activities-hero-stats">
          <span><strong>{visibleActivities.length}</strong> disponibili</span>
          <span><strong>{openActivities}</strong> aperte</span>
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

      {/* ── Le mie attività (always shown when logged in) ── */}
      {userId && !isLoading && (
        <section className="my-activities-section">
          <h2>Le mie attività</h2>
          {myActivities.length === 0 ? (
            <p className="muted-copy">Non hai ancora creato o a cui partecipi a nessuna attività.</p>
          ) : (
            <div className="activity-card-flow">
              {myActivities.map((activity) => (
                <article key={activity.id} className="activity-card">
                  <div className="interactive-map-card-header">
                    <span>{activity.category}</span>
                    <small className={activity.creator?.id === userId ? 'badge' : undefined}>
                      {activity.creator?.id === userId ? 'Creata da te' : 'Partecipante'}
                    </small>
                  </div>
                  <h2>{activity.title}</h2>
                  <dl>
                    <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
                    <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
                    <div><dt>Stato</dt><dd>{activity.status || 'attiva'}</dd></div>
                  </dl>
                  <div className="card-actions-row">
                    {activity.creator?.id === userId ? (
                      <button className="danger-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={() => handleCancel(activity.id)}>
                        {actionLoading === activity.id ? '...' : 'Cancella'}
                      </button>
                    ) : activity.participantIds?.includes(userId) && (
                      <button className="ghost-button compact-button" type="button" disabled={actionLoading === activity.id} onClick={() => handleLeave(activity.id)}>
                        {actionLoading === activity.id ? '...' : 'Abbandona'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!isLoading && !error && visibleActivities.length > 0 && (
        <div className="activities-layout">
          <aside className="activity-discovery-panel">
            <div className="category-pill-list">
              <button className={category === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setCategory('all')}>Tutte</button>
              {categoryCounts.map((item) => (
                <button className={category === item.category ? 'active-filter' : undefined} key={item.category} type="button" onClick={() => setCategory(item.category)}>
                  {item.category}<strong>{item.count}</strong>
                </button>
              ))}
            </div>
            {featuredActivity && (
              <div className="activity-focus-note">
                <strong>Più vicina al pieno</strong>
                <p>{featuredActivity.title}: {featuredActivity.participantCount} partecipanti su {featuredActivity.maxParticipants}.</p>
              </div>
            )}
          </aside>

          <section className="activity-results">
            {featuredActivity && (
              <article className="activity-featured">
                <div>
                  <div className="feature-badges" aria-label="Stato attività">
                    <span>{featuredActivity.category}</span>
                    <span>{featuredActivity.status || 'attiva'}</span>
                  </div>
                  <h2>{featuredActivity.title}</h2>
                  <p>{featuredActivity.description || 'Attività spontanea organizzata dalla community.'}</p>
                </div>
                <dl>
                  <div><dt>Quando</dt><dd>{formatDateTime(featuredActivity.dateTime)}</dd></div>
                  <div><dt>Partecipanti</dt><dd>{featuredActivity.participantCount} / {featuredActivity.maxParticipants}</dd></div>
                </dl>
              </article>
            )}

            <div className="activity-card-flow">
              {visibleActivities.map((activity) => (
                <InteractiveMapCard
                  key={activity.id}
                  id={activity.id}
                  className="activity-card"
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
                    <div>
                      <dt>Luogo</dt>
                      <dd>{activity.location || 'Non specificato'}</dd>
                    </div>
                    <div>
                      <dt>Quando</dt>
                      <dd>{formatDateTime(activity.dateTime)}</dd>
                    </div>
                    <div>
                      <dt>Partecipanti</dt>
                      <dd>{activity.participantCount} / {activity.maxParticipants}</dd>
                    </div>
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
                      ? <button className="ghost-button" type="button" disabled={actionLoading === activity.id} onClick={() => handleLeave(activity.id)}>{actionLoading === activity.id ? '...' : 'Abbandona'}</button>
                      : activity.status !== 'completa'
                        ? <button className="primary-button" type="button" disabled={actionLoading === activity.id} onClick={() => handleJoin(activity.id)}>{actionLoading === activity.id ? '...' : 'Partecipa'}</button>
                        : <span className="muted-copy">Al completo</span>
                  )}
                </InteractiveMapCard>
              ))}
            </div>
          </section>
        </div>
      )}
      {selectedActivity && (
        <div className="activity-popup-backdrop" role="presentation" onClick={() => setSelectedActivity(null)}>
          <article
            className="activity-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="activity-popup-close" type="button" onClick={() => setSelectedActivity(null)} aria-label="Chiudi">
              ×
            </button>
            <span className="section-eyebrow">{selectedActivity.category}</span>
            <h2 id="activity-popup-title">{selectedActivity.title}</h2>
            <p>{selectedActivity.description || 'Attività spontanea organizzata dalla community.'}</p>
            <dl>
              <div><dt>Luogo</dt><dd>{selectedActivity.location || 'Non specificato'}</dd></div>
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
