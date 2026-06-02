import { useEffect, useMemo, useState } from 'react';
import { getDashboardStats, type DashboardFilters, type DashboardStats } from '../lib/api';
import { AreaMapPicker } from '../components/map/AreaMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';
import { useAutoRefresh } from '../lib/useAutoRefresh';

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
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function load(nextFilters = filters, silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    getDashboardStats(cleanFilters(nextFilters))
      .then(setStats)
      .catch((e) => { if (!silent) setError(e instanceof Error ? e.message : 'Errore nel caricamento statistiche.'); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }

  // I filtri si applicano automaticamente al cambio (niente pulsante "Aggiorna").
  useEffect(() => { load(filters); }, [filters]);
  // Auto-aggiornamento periodico silenzioso con i filtri correnti.
  useAutoRefresh(() => load(filters, true), 60_000);

  function update(key: keyof DashboardFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
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
        {isLoading && <span className="muted-copy auto-refresh-hint">Aggiornamento…</span>}
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
        <div className="filter-row area-picker-row">
          <div className="area-picker-summary">
            <span>Area geografica</span>
            {filters.centerLat && filters.centerLng ? (
              <span className="area-picker-value">
                <GeocodedLocation value={`${filters.centerLat}, ${filters.centerLng}`} />
                {filters.radiusKm && <em> · {filters.radiusKm} km</em>}
              </span>
            ) : (
              <em className="muted-copy">Nessuna area selezionata</em>
            )}
          </div>
          <div className="filter-actions" style={{ marginTop: 0 }}>
            <button type="button" onClick={() => setShowAreaPicker(true)}>
              {filters.centerLat ? '📍 Modifica area' : '📍 Scegli area sulla mappa'}
            </button>
            {filters.centerLat && (
              <button type="button" onClick={() => setFilters((prev) => ({ ...prev, centerLat: undefined, centerLng: undefined, radiusKm: undefined }))}>
                Rimuovi area
              </button>
            )}
          </div>
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
      {showAreaPicker && (
        <AreaMapPicker
          initial={{ centerLat: filters.centerLat, centerLng: filters.centerLng, radiusKm: filters.radiusKm }}
          onCancel={() => setShowAreaPicker(false)}
          onConfirm={({ centerLat, centerLng, radiusKm }) => {
            setFilters((prev) => ({ ...prev, centerLat: String(centerLat), centerLng: String(centerLng), radiusKm: String(radiusKm) }));
            setShowAreaPicker(false);
          }}
        />
      )}
    </section>
  );
}
