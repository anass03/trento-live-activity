import { useEffect, useState } from 'react';
import { getDashboardExportUrl, getDashboardStats, type DashboardStats } from '../lib/api';

type Filters = {
  tipo?: string;
  da?: string;
  a?: string;
  centerLat?: string;
  centerLng?: string;
  radiusKm?: string;
};

export function DashboardComunePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(activeFilters: Filters = filters) {
    setIsLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    Object.entries(activeFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    getDashboardStats(params)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load({}); }, []);

  function update(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function applyFilters() { load(filters); }
  function resetFilters() { setFilters({}); load({}); }

  function buildExportUrl(format: 'csv' | 'pdf') {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    return getDashboardExportUrl(format, params);
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Dashboard Comune di Trento</h1>
          <p>Statistiche aggregate sull'attività cittadina</p>
        </div>
        <div className="actions">
          <a className="primary-button" href={buildExportUrl('pdf')} target="_blank" rel="noreferrer">Esporta PDF</a>
          <a className="primary-button" href={buildExportUrl('csv')} target="_blank" rel="noreferrer">Esporta CSV</a>
        </div>
      </header>

      <div className="liquid-card filter-bar">
        <h2>Filtri</h2>
        <div className="filter-row">
          <label>
            <span>Tipo attività</span>
            <select value={filters.tipo || ''} onChange={(e) => update('tipo', e.target.value)}>
              <option value="">Tutti</option>
              <option value="sport">Sport</option>
              <option value="cultura">Cultura</option>
              <option value="musica">Musica</option>
              <option value="studio">Studio</option>
            </select>
          </label>
          <label>
            <span>Dal</span>
            <input type="date" value={filters.da || ''} onChange={(e) => update('da', e.target.value)} />
          </label>
          <label>
            <span>Al</span>
            <input type="date" value={filters.a || ''} onChange={(e) => update('a', e.target.value)} />
          </label>
        </div>
        <div className="filter-row">
          <label>
            <span>Latitudine centro</span>
            <input type="number" step="0.0001" value={filters.centerLat || ''} onChange={(e) => update('centerLat', e.target.value)} placeholder="46.0664" />
          </label>
          <label>
            <span>Longitudine centro</span>
            <input type="number" step="0.0001" value={filters.centerLng || ''} onChange={(e) => update('centerLng', e.target.value)} placeholder="11.1216" />
          </label>
          <label>
            <span>Raggio (km)</span>
            <input type="number" step="0.5" value={filters.radiusKm || ''} onChange={(e) => update('radiusKm', e.target.value)} placeholder="2" />
          </label>
        </div>
        <div className="filter-actions">
          <button type="button" className="primary-button" onClick={applyFilters}>Applica filtri</button>
          <button type="button" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {isLoading && <div className="state-panel liquid-panel">Caricamento statistiche...</div>}
      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}

      {stats && !isLoading && !error && (
        <>
          <div className="kpi-grid">
            <article className="kpi liquid-card">
              <span className="kpi-label">Utenti registrati</span>
              <strong className="kpi-value">{stats.totalUsers}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Attività</span>
              <strong className="kpi-value">{stats.totalActivities}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Eventi certificati</span>
              <strong className="kpi-value">{stats.totalEvents}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">POI</span>
              <strong className="kpi-value">{stats.totalPOIs}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">Partecipazioni</span>
              <strong className="kpi-value">{stats.totalParticipations}</strong>
            </article>
          </div>

          <div className="dashboard-section liquid-card">
            <h2>Attività per tipo</h2>
            <table className="stats-table">
              <thead><tr><th>Tipo</th><th>Numero</th></tr></thead>
              <tbody>
                {stats.activitiesByType.length === 0 && <tr><td colSpan={2}>Nessun dato</td></tr>}
                {stats.activitiesByType.map((r) => (
                  <tr key={r.tipo}><td>{r.tipo}</td><td>{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dashboard-section liquid-card">
            <h2>POI per stato di affollamento</h2>
            <table className="stats-table">
              <thead><tr><th>Stato</th><th>Numero POI</th></tr></thead>
              <tbody>
                {stats.poiCrowding.length === 0 && <tr><td colSpan={2}>Nessun dato</td></tr>}
                {stats.poiCrowding.map((r) => (
                  <tr key={r.statoAffollamento}>
                    <td><span className={`crowding-dot ${r.statoAffollamento}`} /> {r.statoAffollamento}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
