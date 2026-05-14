import { useEffect, useState } from 'react';
import {
  downloadDashboardExport,
  getDashboardStats,
  type DashboardFilters,
  type DashboardStats,
} from '../lib/api';

type ExportFormat = 'csv' | 'pdf';
type ExportType = 'stats';

const EMPTY_FILTERS: DashboardFilters = {};

function cleanFilters(filters: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')) as DashboardFilters;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ComuneExportPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportType, setExportType] = useState<ExportType>('stats');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  function loadPreview(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    getDashboardStats(cleanFilters(nextFilters))
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore nel caricamento anteprima export.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { loadPreview(EMPTY_FILTERS); }, []);

  function update(key: keyof DashboardFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleExport() {
    setError(null);
    setMessage(null);
    setIsExporting(true);
    try {
      const blob = await downloadDashboardExport(format, cleanFilters(filters));
      downloadBlob(blob, `trento-live-${exportType}.${format}`);
      setMessage('Export generato correttamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante export.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="data-page comune-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Export Comune</h1>
          <p>Generazione file autenticata dai dati statistici comunali.</p>
        </div>
        <button type="button" onClick={() => loadPreview(filters)}>Aggiorna anteprima</button>
      </header>

      <div className="comune-export-grid">
        <form className="auth-form liquid-card" onSubmit={(event) => { event.preventDefault(); void handleExport(); }}>
          <h2>Parametri export</h2>
          <label>
            <span>Dataset</span>
            <select value={exportType} onChange={(event) => setExportType(event.target.value as ExportType)}>
              <option value="stats">Statistiche aggregate</option>
            </select>
          </label>
          <label>
            <span>Formato</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <div className="filter-row">
            <label><span>Dal</span><input type="date" value={filters.da || ''} onChange={(event) => update('da', event.target.value)} /></label>
            <label><span>Al</span><input type="date" value={filters.a || ''} onChange={(event) => update('a', event.target.value)} /></label>
          </div>
          <div className="filter-row">
            <label><span>Tipo attività</span><input type="text" value={filters.tipo || ''} onChange={(event) => update('tipo', event.target.value)} placeholder="sport, cultura..." /></label>
            <label><span>Raggio (km)</span><input type="number" step="0.5" value={filters.radiusKm || ''} onChange={(event) => update('radiusKm', event.target.value)} /></label>
          </div>
          <div className="filter-row">
            <label><span>Latitudine centro</span><input type="number" step="0.0001" value={filters.centerLat || ''} onChange={(event) => update('centerLat', event.target.value)} /></label>
            <label><span>Longitudine centro</span><input type="number" step="0.0001" value={filters.centerLng || ''} onChange={(event) => update('centerLng', event.target.value)} /></label>
          </div>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="filter-actions">
            <button className="primary-button" type="submit" disabled={isExporting}>
              {isExporting ? 'Generazione...' : `Scarica ${format.toUpperCase()}`}
            </button>
            <button type="button" onClick={() => loadPreview(filters)}>Aggiorna anteprima</button>
          </div>
        </form>

        <aside className="liquid-card comune-panel">
          <div className="widget-heading">
            <span className="section-eyebrow">Anteprima dataset</span>
            <strong>Statistiche aggregate</strong>
          </div>
          {isLoading && <p className="muted-copy">Caricamento anteprima...</p>}
          {!isLoading && stats && (
            <div className="export-preview-grid">
              <article><strong>{stats.totalUsers}</strong><span>Utenti</span></article>
              <article><strong>{stats.totalActivities}</strong><span>Attività</span></article>
              <article><strong>{stats.totalEvents}</strong><span>Eventi</span></article>
              <article><strong>{stats.totalPOIs}</strong><span>POI</span></article>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
