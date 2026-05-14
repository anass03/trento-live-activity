import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getActivities,
  getDashboardStats,
  getEvents,
  getMapMarkers,
  type ApiActivity,
  type ApiEvent,
  type DashboardStats,
  type MapMarker,
} from '../lib/api';

function formatDate(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function crowdLevel(marker: MapMarker) {
  if (Number.isFinite(marker.crowdLevel)) return marker.crowdLevel;
  return { green: 20, yellow: 50, orange: 72, red: 90 }[marker.crowdingStatus] ?? 20;
}

function itemTime(item: ApiActivity | ApiEvent) {
  return item.dateTime ? new Date(item.dateTime).getTime() : Number.MAX_SAFE_INTEGER;
}

export function ComuneDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    setError(null);
    Promise.all([
      getDashboardStats(),
      getMapMarkers(),
      getActivities({ limit: 6 }),
      getEvents({ limit: 6 }),
    ])
      .then(([nextStats, nextMarkers, nextActivities, nextEvents]) => {
        setStats(nextStats);
        setMarkers(nextMarkers);
        setActivities(nextActivities);
        setEvents(nextEvents);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore nel caricamento del dashboard.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  const alerts = useMemo(
    () => markers
      .filter((marker) => marker.crowdingStatus === 'red' || marker.crowdingStatus === 'orange' || crowdLevel(marker) >= 70)
      .sort((a, b) => crowdLevel(b) - crowdLevel(a))
      .slice(0, 4),
    [markers],
  );

  const recentItems = useMemo(
    () => [...activities, ...events]
      .sort((a, b) => itemTime(a) - itemTime(b))
      .slice(0, 6),
    [activities, events],
  );

  return (
    <section className="data-page comune-page comune-dashboard-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Dashboard Comune</h1>
          <p>Stato operativo della città, dati live e azioni rapide.</p>
        </div>
        <button type="button" onClick={load}>Aggiorna</button>
      </header>

      {isLoading && <div className="state-panel liquid-panel">Caricamento dati comunali...</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button type="button" onClick={load}>Riprova</button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <>
          <div className="kpi-grid">
            <article className="kpi liquid-card"><span className="kpi-label">Utenti</span><strong className="kpi-value">{stats.totalUsers}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Attività attive</span><strong className="kpi-value">{stats.totalActivities}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Eventi</span><strong className="kpi-value">{stats.totalEvents}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">POI</span><strong className="kpi-value">{stats.totalPOIs}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Partecipazioni</span><strong className="kpi-value">{stats.totalParticipations}</strong></article>
          </div>

          <div className="comune-overview-grid">
            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Live city status</span>
                <strong>Affollamento e avvisi</strong>
              </div>
              {alerts.length === 0 ? (
                <p className="muted-copy">Nessun alert critico dai dati mappa.</p>
              ) : (
                <div className="alert-list">
                  {alerts.map((marker) => (
                    <article className={`alert-item alert-${marker.crowdingStatus}`} key={marker.id}>
                      <i aria-hidden="true" />
                      <div>
                        <h3>{marker.title}</h3>
                        <p>{marker.type.toUpperCase()} · {Math.round(crowdLevel(marker))}/100</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Movimento recente</span>
                <strong>Prossimi elementi</strong>
              </div>
              {recentItems.length === 0 ? (
                <p className="muted-copy">Nessuna attività o evento disponibile.</p>
              ) : (
                <ol className="timeline-list">
                  {recentItems.map((item) => (
                    <li key={item.id}>
                      <time>{formatDate(item.dateTime)}</time>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.category} · {item.location || 'luogo non specificato'}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">Azioni rapide</span>
                <strong>Strumenti Comune</strong>
              </div>
              <div className="quick-action-list">
                <Link className="primary-button" to="/comune/statistiche">Apri statistiche</Link>
                <Link className="primary-button" to="/comune/export">Esporta dati</Link>
                <Link className="ghost-button" to="/">Vai alla mappa</Link>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
