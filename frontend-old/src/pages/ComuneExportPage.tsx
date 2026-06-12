import { useEffect, useMemo, useState } from 'react';
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
type DatasetId = 'kpi' | 'activities' | 'poi_crowding' | 'poi_inventory' | 'supply_demand' | 'citizen_needs';

const ALL_DATASETS: Array<{
  id: DatasetId;
  icon: string;
  labelKey: string;
  hintKey: string;
  /** Which sections get exported — shown as sub-bullets */
  sectionsKey: string;
}> = [
  { id: 'kpi',           icon: '📊', labelKey: 'comune.export.ds_kpi',           hintKey: 'comune.export.ds_kpi_hint',           sectionsKey: 'comune.export.ds_kpi_sections' },
  { id: 'activities',    icon: '🏃', labelKey: 'comune.export.ds_activities',    hintKey: 'comune.export.ds_activities_hint',    sectionsKey: 'comune.export.ds_activities_sections' },
  { id: 'poi_crowding',  icon: '🔴', labelKey: 'comune.export.ds_poi_crowding',  hintKey: 'comune.export.ds_poi_crowding_hint',  sectionsKey: 'comune.export.ds_poi_crowding_sections' },
  { id: 'poi_inventory', icon: '📍', labelKey: 'comune.export.ds_poi_inventory', hintKey: 'comune.export.ds_poi_inventory_hint', sectionsKey: 'comune.export.ds_poi_inventory_sections' },
  { id: 'supply_demand', icon: '⚖️', labelKey: 'comune.export.ds_supply_demand', hintKey: 'comune.export.ds_supply_demand_hint', sectionsKey: 'comune.export.ds_supply_demand_sections' },
  { id: 'citizen_needs', icon: '📢', labelKey: 'comune.export.ds_citizen_needs', hintKey: 'comune.export.ds_citizen_needs_hint', sectionsKey: 'comune.export.ds_citizen_needs_sections' },
];

const PRESETS: Array<{ labelKey: string; ids: DatasetId[] }> = [
  { labelKey: 'comune.export.presetMonthly',       ids: ['kpi', 'activities', 'poi_crowding', 'citizen_needs'] },
  { labelKey: 'comune.export.presetInfrastructure', ids: ['poi_inventory', 'supply_demand', 'citizen_needs'] },
  { labelKey: 'comune.export.presetFull',           ids: ['kpi', 'activities', 'poi_crowding', 'poi_inventory', 'supply_demand', 'citizen_needs'] },
];

const EMPTY_FILTERS: DashboardFilters = {};

function cleanFilters(f: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) as DashboardFilters;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** Compact summary of what each selected dataset will contain */
function ExportPreview({
  selected, stats, needs, loading, t,
}: {
  selected: Set<DatasetId>;
  stats: DashboardStats | null;
  needs: ServiceRequestStats | null;
  loading: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (loading) return <p className="muted-copy">{t('comune.export.loadingPreview')}</p>;
  if (selected.size === 0) return <p className="muted-copy">{t('comune.export.noSelection')}</p>;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Row of summary chips — one per selected dataset */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ALL_DATASETS.filter((d) => selected.has(d.id)).map((d) => {
          let detail = '';
          if (d.id === 'kpi' && stats)             detail = `${stats.totalActivities} att. · ${stats.totalPOIs} POI`;
          if (d.id === 'activities' && stats)       detail = `${stats.activitiesByType.length} tipi · ${(stats.activitiesByDay ?? []).filter(r => r.count > 0).length}/14d`;
          if (d.id === 'poi_crowding' && stats)     detail = `${(stats.topCrowdedPOIs ?? []).filter(p => p.statoAffollamento === 'rosso').length} critici`;
          if (d.id === 'poi_inventory' && stats)    detail = `${stats.totalPOIs} POI`;
          if (d.id === 'supply_demand' && stats)    detail = `${stats.activitiesByType.length} categorie`;
          if (d.id === 'citizen_needs' && needs)    detail = `${needs.total} segnalazioni`;
          return (
            <span key={d.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 12,
              background: 'var(--color-primary-soft)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
              color: 'var(--color-primary)',
            }}>
              {d.icon} {t(d.labelKey)}
              {detail && <em style={{ fontStyle: 'normal', fontWeight: 400, opacity: 0.75 }}> · {detail}</em>}
            </span>
          );
        })}
      </div>

      {/* Detail preview for first 1-2 selected datasets */}
      {selected.has('kpi') && stats && (
        <div>
          <p className="muted-copy" style={{ fontSize: 12, marginBottom: 6 }}>{t('comune.export.ds_kpi')}</p>
          <div className="export-preview-grid">
            <article><strong>{stats.totalActivities}</strong><span>{t('comune.export.activities')}</span></article>
            <article><strong>{stats.totalEvents}</strong><span>{t('comune.export.events')}</span></article>
            <article><strong>{stats.totalPOIs}</strong><span>{t('comune.export.pois')}</span></article>
            <article><strong>{stats.totalParticipations}</strong><span>{t('comune.export.participations')}</span></article>
          </div>
        </div>
      )}

      {selected.has('poi_crowding') && stats && (stats.topCrowdedPOIs ?? []).length > 0 && (
        <div>
          <p className="muted-copy" style={{ fontSize: 12, marginBottom: 6 }}>{t('comune.export.ds_poi_crowding')} — {t('comune.export.previewSample')}</p>
          <table className="stats-table" style={{ fontSize: 12, width: '100%' }}>
            <thead><tr>
              <th>{t('common.name')}</th>
              <th>{t('admin.poi.type')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.poi.crowding')}</th>
            </tr></thead>
            <tbody>
              {(stats.topCrowdedPOIs ?? []).slice(0, 4).map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.tipo || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`crowding-dot ${p.statoAffollamento}`} /> {p.statoAffollamento}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.has('supply_demand') && stats && stats.activitiesByType.length > 0 && (
        <div>
          <p className="muted-copy" style={{ fontSize: 12, marginBottom: 6 }}>{t('comune.export.ds_supply_demand')} — {t('comune.export.previewSample')}</p>
          <table className="stats-table" style={{ fontSize: 12, width: '100%' }}>
            <thead><tr>
              <th>{t('comune.stats.supplyColCategory')}</th>
              <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColDemand')}</th>
              <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColStatus')}</th>
            </tr></thead>
            <tbody>
              {stats.activitiesByType.slice(0, 4).map((r) => (
                <tr key={r.tipo}>
                  <td>{t(`categories.${r.tipo}`, { defaultValue: r.tipo })}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</td>
                  <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-secondary)' }}>{t('comune.export.inExport')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.has('citizen_needs') && needs && needs.total > 0 && (
        <div>
          <p className="muted-copy" style={{ fontSize: 12, marginBottom: 6 }}>
            {t('comune.export.ds_citizen_needs')} · {needs.total} {t('comune.export.totalRequests')}
            {(needs.bySubcategory ?? []).length > 0 && ` · ${needs.bySubcategory!.length} ${t('comune.export.withSubcat')}`}
          </p>
          <table className="stats-table" style={{ fontSize: 12, width: '100%' }}>
            <thead><tr>
              <th>{t('comune.export.colCategory')}</th>
              <th style={{ textAlign: 'right' }}>{t('comune.export.colCount')}</th>
            </tr></thead>
            <tbody>
              {needs.byCategory.slice(0, 5).map((r) => (
                <tr key={r.categoria}>
                  <td>{t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria })}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected.has('poi_inventory') && stats && (
        <p className="muted-copy" style={{ fontSize: 12 }}>
          {t('comune.export.ds_poi_inventory')} · {stats.totalPOIs} POI · {t('comune.export.fullExportNote')}
        </p>
      )}

      {selected.has('activities') && stats && (stats.activitiesByDay ?? []).length > 0 && (
        <p className="muted-copy" style={{ fontSize: 12 }}>
          {t('comune.export.ds_activities')} · {(stats.activitiesByDay ?? []).filter(r => r.count > 0).length}/14 {t('comune.export.activeDays')}
          {(stats.activitiesByHour ?? []).length > 0 && ` · ${(stats.activitiesByHour ?? []).filter(r => Number(r.count) > 0).length} ${t('comune.export.activeHours')}`}
        </p>
      )}
    </div>
  );
}

export function ComuneExportPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needs, setNeeds] = useState<ServiceRequestStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedDatasets, setSelectedDatasets] = useState<Set<DatasetId>>(new Set(['kpi', 'activities', 'poi_crowding']));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function loadPreview(nextFilters = filters) {
    setIsLoading(true); setError(null);
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

  function toggleDataset(id: DatasetId) {
    setSelectedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function applyPreset(ids: DatasetId[]) {
    setSelectedDatasets(new Set(ids));
  }

  async function handleExport() {
    if (selectedDatasets.size === 0) return;
    setError(null); setMessage(null); setIsExporting(true);
    try {
      const cf = cleanFilters(filters);
      const datasets = [...selectedDatasets].join(',');
      const blob = await downloadDashboardExport(format, { ...cf, datasets });
      const dateStr = new Date().toISOString().slice(0, 10);
      const slug = [...selectedDatasets].sort().join('+');
      downloadBlob(blob, `trento-live-${dateStr}-${slug}.${format}`);
      setMessage(t('comune.export.exported'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('comune.export.errorExport'));
    } finally {
      setIsExporting(false);
    }
  }

  // Show filters when any non-inventory dataset is selected
  const showFilters = useMemo(
    () => ['kpi', 'activities', 'poi_crowding', 'supply_demand', 'citizen_needs'].some((d) => selectedDatasets.has(d as DatasetId)),
    [selectedDatasets],
  );

  return (
    <section className="data-page comune-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('comune.export.title')}</h1>
          <p>{t('comune.export.subtitle')}</p>
        </div>
        <button type="button" className="refresh-button" onClick={() => loadPreview(filters)}>
          {t('comune.export.refresh')}
        </button>
      </header>

      <div className="comune-export-grid">
        {/* ── Left: form ── */}
        <form className="auth-form liquid-card" onSubmit={(e) => { e.preventDefault(); void handleExport(); }}>
          <h2>{t('comune.export.params')}</h2>

          {/* Presets */}
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>
              {t('comune.export.presets')}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map((preset) => {
                const active = preset.ids.every((id) => selectedDatasets.has(id)) && selectedDatasets.size === preset.ids.length;
                return (
                  <button
                    key={preset.labelKey}
                    type="button"
                    className={active ? 'primary-button' : 'ghost-button'}
                    style={{ fontSize: 12, padding: '4px 12px', minHeight: 30 }}
                    onClick={() => applyPreset(preset.ids)}
                  >
                    {t(preset.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dataset checkboxes */}
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 780, color: 'var(--color-text-secondary)' }}>
              {t('comune.export.dataset')}
              <span className="muted-copy" style={{ fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
                {t('comune.export.multiSelectHint')}
              </span>
            </span>
            <div className="dataset-option-list">
              {ALL_DATASETS.map((opt) => {
                const checked = selectedDatasets.has(opt.id);
                return (
                  <label key={opt.id} className={`dataset-option${checked ? ' dataset-option--checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDataset(opt.id)}
                    />
                    <div className="dataset-option-body">
                      <span className="dataset-option-label">
                        <span aria-hidden="true">{opt.icon}</span>
                        {t(opt.labelKey)}
                      </span>
                      <span className="dataset-option-hint">{t(opt.hintKey)}</span>
                    </div>
                  </label>
                );
              })}
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

          {/* Filters — only shown when relevant datasets are selected */}
          {showFilters && (
            <>
              <div className="filter-row">
                <label><span>{t('comune.export.from')}</span><input type="date" value={filters.da || ''} onChange={(e) => update('da', e.target.value)} /></label>
                <label><span>{t('comune.export.to')}</span><input type="date" value={filters.a || ''} onChange={(e) => update('a', e.target.value)} /></label>
              </div>
              {(selectedDatasets.has('kpi') || selectedDatasets.has('activities') || selectedDatasets.has('supply_demand')) && (
                <label>
                  <span>{t('comune.export.activityType')}</span>
                  <select value={filters.tipo || ''} onChange={(e) => update('tipo', e.target.value)}>
                    <option value="">{t('comune.stats.all')}</option>
                    <option value="sport">{t('categories.sport')}</option>
                    <option value="cultura">{t('categories.cultura')}</option>
                    <option value="musica">{t('categories.musica')}</option>
                    <option value="studio">{t('categories.studio')}</option>
                    <option value="arte">{t('categories.arte')}</option>
                    <option value="gastronomia">{t('categories.gastronomia')}</option>
                  </select>
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
            <button
              className="primary-button" type="submit"
              disabled={isExporting || selectedDatasets.size === 0}
            >
              {isExporting
                ? t('comune.export.exporting')
                : `${t('comune.export.download', { format: format.toUpperCase() })} (${selectedDatasets.size})`}
            </button>
            <button type="button" className="ghost-button" onClick={() => loadPreview(filters)}>
              {t('comune.export.updatePreview')}
            </button>
          </div>
        </form>

        {/* ── Right: preview ── */}
        <aside className="liquid-card comune-panel">
          <div className="widget-heading">
            <span className="section-eyebrow">{t('comune.export.previewTitle')}</span>
            <strong>
              {selectedDatasets.size === 0
                ? t('comune.export.noSelection')
                : t('comune.export.selectedCount', { n: selectedDatasets.size })}
            </strong>
          </div>
          <ExportPreview
            selected={selectedDatasets}
            stats={stats}
            needs={needs}
            loading={isLoading}
            t={t}
          />
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
