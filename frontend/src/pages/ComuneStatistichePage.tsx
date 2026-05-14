import { useEffect, useMemo, useState } from 'react';
import { getDashboardStats, type DashboardFilters, type DashboardStats } from '../lib/api';

const EMPTY_FILTERS: DashboardFilters = {};

function cleanFilters(filters: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')) as DashboardFilters;
}

function maxCount(rows: Array<{ count: number | string }>) {
  return Math.max(1, ...rows.map((row) => Number(row.count) || 0));
}

export function ComuneStatistichePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    getDashboardStats(cleanFilters(nextFilters))
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore nel caricamento statistiche.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(EMPTY_FILTERS); }, []);

  function update(key: keyof DashboardFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  }

  const activityMax = useMemo(() => maxCount(stats?.activitiesByType || []), [stats]);
  const poiMax = useMemo(() => maxCount(stats?.poiCrowding || []), [stats]);

  return (
    <section className="data-page comune-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Statistiche Comune</h1>
          <p>Metriche aggregate, filtri territoriali e distribuzioni operative.</p>
        </div>
        <button type="button" onClick={() => load(filters)}>Aggiorna</button>
      </header>

      <div className="liquid-card filter-bar">
        <h2>Filtri analisi</h2>
        <div className="filter-row">
          <label>
            <span>Tipo attività</span>
            <select value={filters.tipo || ''} onChange={(event) => update('tipo', event.target.value)}>
              <option value="">Tutti</option>
              <option value="sport">Sport</option>
              <option value="cultura">Cultura</option>
              <option value="musica">Musica</option>
              <option value="studio">Studio</option>
            </select>
          </label>
          <label><span>Dal</span><input type="date" value={filters.da || ''} onChange={(event) => update('da', event.target.value)} /></label>
          <label><span>Al</span><input type="date" value={filters.a || ''} onChange={(event) => update('a', event.target.value)} /></label>
        </div>
        <div className="filter-row">
          <label><span>Latitudine centro</span><input type="number" step="0.0001" value={filters.centerLat || ''} onChange={(event) => update('centerLat', event.target.value)} placeholder="46.0664" /></label>
          <label><span>Longitudine centro</span><input type="number" step="0.0001" value={filters.centerLng || ''} onChange={(event) => update('centerLng', event.target.value)} placeholder="11.1216" /></label>
          <label><span>Raggio (km)</span><input type="number" step="0.5" value={filters.radiusKm || ''} onChange={(event) => update('radiusKm', event.target.value)} placeholder="2" /></label>
        </div>
        <div className="filter-actions">
          <button type="button" className="primary-button" onClick={() => load(filters)}>Applica filtri</button>
          <button type="button" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {isLoading && <div className="state-panel liquid-panel">Caricamento statistiche...</div>}
      {error && <div className="state-panel liquid-panel"><p>{error}</p><button type="button" onClick={() => load(filters)}>Riprova</button></div>}

      {stats && !isLoading && !error && (
        <>
          <div className="kpi-grid">
            <article className="kpi liquid-card"><span className="kpi-label">Utenti</span><strong className="kpi-value">{stats.totalUsers}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Attività</span><strong className="kpi-value">{stats.totalActivities}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Eventi</span><strong className="kpi-value">{stats.totalEvents}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">POI</span><strong className="kpi-value">{stats.totalPOIs}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">Partecipazioni</span><strong className="kpi-value">{stats.totalParticipations}</strong></article>
          </div>

          <div className="comune-analytics-grid">
            <section className="dashboard-section liquid-card">
              <h2>Attività per tipo</h2>
              {stats.activitiesByType.length === 0 ? (
                <p className="muted-copy">Nessun dato per i filtri applicati.</p>
              ) : (
                <div className="metric-bar-list">
                  {stats.activitiesByType.map((row) => (
                    <article className="metric-bar" key={row.tipo}>
                      <span>{row.tipo}</span>
                      <div><i style={{ inlineSize: `${(Number(row.count) / activityMax) * 100}%` }} /></div>
                      <strong>{row.count}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section liquid-card">
              <h2>POI per affollamento</h2>
              {stats.poiCrowding.length === 0 ? (
                <p className="muted-copy">Nessun dato per i filtri applicati.</p>
              ) : (
                <div className="metric-bar-list">
                  {stats.poiCrowding.map((row) => (
                    <article className="metric-bar" key={row.statoAffollamento}>
                      <span><span className={`crowding-dot ${row.statoAffollamento}`} />{row.statoAffollamento}</span>
                      <div><i style={{ inlineSize: `${(Number(row.count) / poiMax) * 100}%` }} /></div>
                      <strong>{row.count}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
