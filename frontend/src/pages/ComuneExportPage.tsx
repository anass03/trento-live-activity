import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  downloadDashboardExport,
  getDashboardStats,
  getDashboardServiceRequests,
  type DashboardFilters,
  type DashboardStats,
  type ServiceRequestStats,
} from '../lib/api';
import { AreaMapPicker } from '../components/map/AreaMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';

type ExportFormat = 'csv' | 'pdf';
type ExportDataset = 'stats' | 'poi_snapshot' | 'service_requests';

const EMPTY_FILTERS: DashboardFilters = {};

function cleanFilters(f: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) as DashboardFilters;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Small preview table skeleton based on selected dataset */
function DatasetPreview({
  dataset,
  stats,
  needs,
  loading,
  t,
}: {
  dataset: ExportDataset;
  stats: DashboardStats | null;
  needs: ServiceRequestStats | null;
  loading: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (loading) return <p className="muted-copy">{t('comune.export.loadingPreview')}</p>;

  if (dataset === 'stats' && stats) {
    return (
      <div className="export-preview-grid">
        <article><strong>{stats.totalActivities}</strong><span>{t('comune.export.activities')}</span></article>
        <article><strong>{stats.totalEvents}</strong><span>{t('comune.export.events')}</span></article>
        <article><strong>{stats.totalPOIs}</strong><span>{t('comune.export.pois')}</span></article>
        <article><strong>{stats.totalParticipations}</strong><span>{t('comune.export.participations')}</span></article>
      </div>
    );
  }

  if (dataset === 'poi_snapshot' && stats) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <p className="muted-copy" style={{ fontSize: 13, margin: 0 }}>{t('comune.export.poiSnapshotHint')}</p>
        <table className="stats-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('admin.poi.type')}</th>
              <th>{t('admin.poi.maxCapacity')}</th>
              <th>{t('admin.poi.crowding')}</th>
            </tr>
          </thead>
          <tbody>
            {(stats.topCrowdedPOIs ?? []).slice(0, 4).map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.tipo || '—'}</td>
                <td style={{ textAlign: 'right' }}>{p.capacitaMax}</td>
                <td><span className={`crowding-dot ${p.statoAffollamento}`} />{p.statoAffollamento}</td>
              </tr>
            ))}
            {(stats.topCrowdedPOIs ?? []).length === 0 && (
              <tr><td colSpan={4} className="muted-copy">{t('comune.export.noPreview')}</td></tr>
            )}
          </tbody>
        </table>
        <p className="muted-copy" style={{ fontSize: 11, margin: 0 }}>{t('comune.export.fullExportNote')}</p>
      </div>
    );
  }

  if (dataset === 'service_requests' && needs) {
    if (needs.total === 0) {
      return <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.export.noNeedsData')}</p>;
    }
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <p className="muted-copy" style={{ fontSize: 13, margin: 0 }}>{t('comune.export.needsHint', { total: needs.total })}</p>
        <table className="stats-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>{t('comune.export.colCategory')}</th>
              <th style={{ textAlign: 'right' }}>{t('comune.export.colCount')}</th>
            </tr>
          </thead>
          <tbody>
            {needs.byCategory.map((r) => (
              <tr key={r.categoria}>
                <td>{t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria })}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="muted-copy">{t('comune.export.loadingPreview')}</p>;
}

export function ComuneExportPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needs, setNeeds] = useState<ServiceRequestStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dataset, setDataset] = useState<ExportDataset>('stats');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function loadPreview(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    const cf = cleanFilters(nextFilters);
    Promise.all([
      getDashboardStats(cf),
      getDashboardServiceRequests({ centerLat: cf.centerLat, centerLng: cf.centerLng, radiusKm: cf.radiusKm }),
    ])
      .then(([s, n]) => { setStats(s); setNeeds(n); })
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
      const cf = cleanFilters(filters);
      const blob = await downloadDashboardExport(format, { ...cf, dataset });
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      downloadBlob(blob, `trento-live-${dataset}.${ext}`);
      setMessage(t('comune.export.exported'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('comune.export.errorExport'));
    } finally {
      setIsExporting(false);
    }
  }

  const datasetOptions: Array<{ value: ExportDataset; label: string; hint: string }> = [
    { value: 'stats',            label: t('comune.export.statsAggregate'),  hint: t('comune.export.statsHint') },
    { value: 'poi_snapshot',     label: t('comune.export.poisSnapshot'),    hint: t('comune.export.poisHint') },
    { value: 'service_requests', label: t('comune.export.citizenNeeds'),    hint: t('comune.export.needsHintShort') },
  ];

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
        <form className="auth-form liquid-card" onSubmit={(e) => { e.preventDefault(); void handleExport(); }}>
          <h2>{t('comune.export.params')}</h2>

          {/* Dataset selector */}
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>{t('comune.export.dataset')}</span>
            <div style={{ display: 'grid', gap: 6 }}>
              {datasetOptions.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    border: `1px solid ${dataset === opt.value ? 'var(--color-primary)' : 'var(--color-surface-line)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: dataset === opt.value ? 'var(--color-primary-soft)' : 'var(--color-bg-elevated)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="dataset"
                    value={opt.value}
                    checked={dataset === opt.value}
                    onChange={() => setDataset(opt.value)}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontWeight: 720, fontSize: 14 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <label>
            <span>{t('comune.export.format')}</span>
            <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </label>

          {/* Filters — only relevant for stats and service_requests */}
          {dataset !== 'poi_snapshot' && (
            <>
              <div className="filter-row">
                <label><span>{t('comune.export.from')}</span><input type="date" value={filters.da || ''} onChange={(e) => update('da', e.target.value)} /></label>
                <label><span>{t('comune.export.to')}</span><input type="date" value={filters.a || ''} onChange={(e) => update('a', e.target.value)} /></label>
              </div>
              {dataset === 'stats' && (
                <label>
                  <span>{t('comune.export.activityType')}</span>
                  <input type="text" value={filters.tipo || ''} onChange={(e) => update('tipo', e.target.value)} placeholder={t('comune.export.activityTypePlaceholder')} />
                </label>
              )}
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
                    <button type="button" onClick={() => setFilters((p) => ({ ...p, centerLat: undefined, centerLng: undefined, radiusKm: undefined }))}>
                      {t('comune.export.removeArea')}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="filter-actions">
            <button className="primary-button" type="submit" disabled={isExporting}>
              {isExporting ? t('comune.export.exporting') : t('comune.export.download', { format: format.toUpperCase() })}
            </button>
            <button type="button" className="ghost-button" onClick={() => loadPreview(filters)}>
              {t('comune.export.updatePreview')}
            </button>
          </div>
        </form>

        <aside className="liquid-card comune-panel">
          <div className="widget-heading">
            <span className="section-eyebrow">{t('comune.export.previewTitle')}</span>
            <strong>{datasetOptions.find((o) => o.value === dataset)?.label ?? ''}</strong>
          </div>
          <DatasetPreview dataset={dataset} stats={stats} needs={needs} loading={isLoading} t={t} />
        </aside>
      </div>

      {showAreaPicker && (
        <AreaMapPicker
          initial={{ centerLat: filters.centerLat, centerLng: filters.centerLng, radiusKm: filters.radiusKm }}
          onCancel={() => setShowAreaPicker(false)}
          onConfirm={({ centerLat, centerLng, radiusKm }) => {
            setFilters((p) => ({ ...p, centerLat: String(centerLat), centerLng: String(centerLng), radiusKm: String(radiusKm) }));
            setShowAreaPicker(false);
          }}
        />
      )}
    </section>
  );
}
