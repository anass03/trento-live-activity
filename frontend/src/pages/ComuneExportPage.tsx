import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  downloadDashboardExport,
  getDashboardStats,
  type DashboardFilters,
  type DashboardStats,
} from '../lib/api';
import { AreaMapPicker } from '../components/map/AreaMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';

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
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportType] = useState<ExportType>('stats');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function loadPreview(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    getDashboardStats(cleanFilters(nextFilters))
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : t('comune.export.errorPreview')))
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
      setMessage(t('comune.export.exported'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('comune.export.errorExport'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="data-page comune-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('comune.export.title')}</h1>
          <p>{t('comune.export.subtitle')}</p>
        </div>
        <button type="button" className="refresh-button" onClick={() => loadPreview(filters)}>{t('comune.export.refresh')}</button>
      </header>

      <div className="comune-export-grid">
        <form className="auth-form liquid-card" onSubmit={(event) => { event.preventDefault(); void handleExport(); }}>
          <h2>{t('comune.export.params')}</h2>
          <label>
            <span>{t('comune.export.dataset')}</span>
            <select value={exportType} disabled>
              <option value="stats">{t('comune.export.statsAggregate')}</option>
            </select>
          </label>
          <label>
            <span>{t('comune.export.format')}</span>
            <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <div className="filter-row">
            <label><span>{t('comune.export.from')}</span><input type="date" value={filters.da || ''} onChange={(event) => update('da', event.target.value)} /></label>
            <label><span>{t('comune.export.to')}</span><input type="date" value={filters.a || ''} onChange={(event) => update('a', event.target.value)} /></label>
          </div>
          <label>
            <span>{t('comune.export.activityType')}</span>
            <input type="text" value={filters.tipo || ''} onChange={(event) => update('tipo', event.target.value)} placeholder={t('comune.export.activityTypePlaceholder')} />
          </label>
          <div className="area-picker-row">
            <span>{t('comune.export.geoArea')}</span>
            {filters.centerLat && filters.centerLng ? (
              <span className="area-picker-value">
                <GeocodedLocation value={`${filters.centerLat}, ${filters.centerLng}`} />
                {filters.radiusKm && <em> · {filters.radiusKm} km</em>}
              </span>
            ) : (
              <em className="muted-copy">{t('comune.export.noArea')}</em>
            )}
            <div className="filter-actions" style={{ marginTop: 4 }}>
              <button type="button" onClick={() => setShowAreaPicker(true)}>
                {filters.centerLat ? t('comune.export.editArea') : t('comune.export.chooseArea')}
              </button>
              {filters.centerLat && (
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, centerLat: undefined, centerLng: undefined, radiusKm: undefined }))}>
                  {t('comune.export.removeArea')}
                </button>
              )}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="filter-actions">
            <button className="primary-button" type="submit" disabled={isExporting}>
              {isExporting ? t('comune.export.exporting') : t('comune.export.download', { format: format.toUpperCase() })}
            </button>
            <button type="button" className="ghost-button" onClick={() => loadPreview(filters)}>{t('comune.export.updatePreview')}</button>
          </div>
        </form>

        <aside className="liquid-card comune-panel">
          <div className="widget-heading">
            <span className="section-eyebrow">{t('comune.export.previewTitle')}</span>
            <strong>{t('comune.export.aggregateStats')}</strong>
          </div>
          {isLoading && <p className="muted-copy">{t('comune.export.loadingPreview')}</p>}
          {!isLoading && stats && (
            <div className="export-preview-grid">
              <article><strong>{stats.totalActivities}</strong><span>{t('comune.export.activities')}</span></article>
              <article><strong>{stats.totalEvents}</strong><span>{t('comune.export.events')}</span></article>
              <article><strong>{stats.totalPOIs}</strong><span>{t('comune.export.pois')}</span></article>
            </div>
          )}
        </aside>
      </div>

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
