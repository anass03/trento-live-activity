import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CROWD_LABEL: Record<string, string> = {
  verde:  'admin.poi.crowdingLow',
  giallo: 'admin.poi.crowdingMedium',
  rosso:  'admin.poi.crowdingHigh',
};
import {
  getDashboardStats,
  getDashboardServiceRequests,
  type DashboardFilters,
  type DashboardStats,
  type ServiceRequestStats,
} from '../lib/api';
import { AreaMapPicker } from '../components/map/AreaMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';

type Tab = 'overview' | 'trends' | 'supply';

const EMPTY_FILTERS: DashboardFilters = {};

const POI_KEYWORDS: Record<string, string[]> = {
  sport:       ['sport', 'campo', 'piscina', 'palest', 'stadio', 'gym', 'fitness', 'calcio'],
  cultura:     ['cultur', 'museo', 'teatro', 'galleri', 'bibliote', 'mostra'],
  musica:      ['music', 'concert', 'auditor', 'sala'],
  studio:      ['studi', 'bibliote', 'univer', 'aula', 'cowork', 'scuola'],
  arte:        ['arte', 'atelier', 'galleri'],
  gastronomia: ['gastro', 'mercato', 'ristor', 'bar ', 'café', 'cafe', 'food'],
};

function matchPOICount(tipo: string, poiByType: Array<{ tipo: string | null; count: number }>) {
  const keys = POI_KEYWORDS[tipo] ?? [tipo];
  return poiByType
    .filter((p) => p.tipo && keys.some((k) => (p.tipo as string).toLowerCase().includes(k)))
    .reduce((s, p) => s + Number(p.count), 0);
}

function gapStatus(ratio: number, t: (k: string) => string) {
  if (ratio >= 4) return { label: t('comune.stats.supplyStatusCritical'), color: 'var(--color-danger)' };
  if (ratio >= 2) return { label: t('comune.stats.supplyStatusWarning'), color: 'var(--color-warning)' };
  return { label: t('comune.stats.supplyStatusOk'), color: 'var(--color-success)' };
}

function cleanFilters(f: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) as DashboardFilters;
}

function maxCount(rows: Array<{ count: number | string }>) {
  return Math.max(1, ...rows.map((r) => Number(r.count) || 0));
}

/** Full SVG sparkline with date labels */
function Sparkline({ days }: { days: Array<{ date: string; count: number }> }) {
  const values = days.map((d) => Number(d.count));
  const max = Math.max(...values);
  if (max === 0 || days.length < 2) return null;
  const normMax = Math.max(max, 1);
  const W = 640; const H = 80; const PAD = 6;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / normMax) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const peakIdx = values.indexOf(max);
  const peakX = PAD + (peakIdx / (values.length - 1)) * (W - PAD * 2);
  const peakY = H - PAD - (values[peakIdx] / normMax) * (H - PAD * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - (v / normMax) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r={v > 0 ? 3 : 2} fill={v > 0 ? 'var(--color-primary)' : 'var(--color-border)'} opacity={v > 0 && i !== peakIdx ? 0.5 : 1} />;
      })}
      {/* Peak label */}
      <circle cx={peakX} cy={peakY} r="5" fill="var(--color-primary)" />
      <text x={peakX} y={peakY - 9} textAnchor="middle" fontSize="10" fill="var(--color-primary)" fontWeight="700">
        {values[peakIdx]}
      </text>
    </svg>
  );
}

/** Horizontal bar for peak hours (0-23) */
function HourBar({ hour, count, max }: { hour: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="metric-bar">
      <span style={{ fontSize: 12, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {hour.padStart(2, '0')}:00
      </span>
      <div><i style={{ inlineSize: `${pct}%` }} /></div>
      <strong style={{ fontSize: 12 }}>{count}</strong>
    </div>
  );
}

export function ComuneStatistichePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needs, setNeeds] = useState<ServiceRequestStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function load(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    const cf = cleanFilters(nextFilters);
    Promise.all([
      getDashboardStats(cf),
      getDashboardServiceRequests({ centerLat: cf.centerLat, centerLng: cf.centerLng, radiusKm: cf.radiusKm }),
    ])
      .then(([s, n]) => { setStats(s); setNeeds(n); })
      .catch((e) => setError(e instanceof Error ? e.message : t('comune.stats.loading')))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(EMPTY_FILTERS); }, []);

  function update(key: keyof DashboardFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function resetFilters() { setFilters(EMPTY_FILTERS); load(EMPTY_FILTERS); }

  const activityMax = useMemo(() => maxCount(stats?.activitiesByType ?? []), [stats]);
  const poiMax = useMemo(() => maxCount(stats?.poiCrowding ?? []), [stats]);
  const hourMax = useMemo(() => maxCount(stats?.activitiesByHour ?? []), [stats]);

  // Fill all 24 hours so the chart is always complete
  const hourlyData = useMemo(() => {
    const map = Object.fromEntries((stats?.activitiesByHour ?? []).map((r) => [r.hour, Number(r.count)]));
    return Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, '0'), count: map[String(i).padStart(2, '0')] ?? 0 }));
  }, [stats]);

  // Fill all 14 days — show a continuous line even with sparse data
  const filledDays = useMemo(() => {
    const map = Object.fromEntries((stats?.activitiesByDay ?? []).map((r) => [r.date, Number(r.count)]));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const date = d.toISOString().slice(0, 10);
      return { date, count: map[date] ?? 0 };
    });
  }, [stats]);

  const nonZeroDays = useMemo(() => filledDays.filter((d) => d.count > 0).length, [filledDays]);

  // Supply/demand table
  const supplyRows = useMemo(() => {
    if (!stats) return [];
    const poiByType = stats.poiByType ?? [];
    return stats.activitiesByType
      .map((row) => {
        const demand = Number(row.count);
        const supply = matchPOICount(row.tipo, poiByType);
        const ratio = supply > 0 ? demand / supply : demand;
        return { tipo: row.tipo, demand, supply, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [stats]);

  return (
    <section className="data-page comune-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('comune.stats.title')}</h1>
          <p>{t('comune.stats.subtitle')}</p>
        </div>
        <button type="button" className="refresh-button" onClick={() => load(filters)}>{t('comune.stats.refresh')}</button>
      </header>

      {/* Filters */}
      <div className="liquid-card filter-bar">
        <h2>{t('comune.stats.filtersTitle')}</h2>
        <div className="filter-row">
          <label>
            <span>{t('comune.stats.activityType')}</span>
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
          <label><span>{t('comune.stats.from')}</span><input type="date" value={filters.da || ''} onChange={(e) => update('da', e.target.value)} /></label>
          <label><span>{t('comune.stats.to')}</span><input type="date" value={filters.a || ''} onChange={(e) => update('a', e.target.value)} /></label>
        </div>
        <div className="filter-row area-picker-row">
          <div className="area-picker-summary">
            <span>{t('comune.stats.geoArea')}</span>
            {filters.centerLat && filters.centerLng ? (
              <span className="area-picker-value">
                <GeocodedLocation value={`${filters.centerLat}, ${filters.centerLng}`} />
                {filters.radiusKm && <em> · {filters.radiusKm} km</em>}
              </span>
            ) : (
              <em className="muted-copy">{t('comune.stats.noArea')}</em>
            )}
          </div>
          <div className="filter-actions" style={{ marginTop: 0 }}>
            <button type="button" onClick={() => setShowAreaPicker(true)}>
              {filters.centerLat ? t('comune.stats.editArea') : t('comune.stats.chooseArea')}
            </button>
            {filters.centerLat && (
              <button type="button" onClick={() => setFilters((p) => ({ ...p, centerLat: undefined, centerLng: undefined, radiusKm: undefined }))}>
                {t('comune.stats.removeArea')}
              </button>
            )}
          </div>
        </div>
        <div className="filter-actions">
          <button type="button" className="primary-button" onClick={() => load(filters)}>{t('comune.stats.applyFilters')}</button>
          <button type="button" onClick={resetFilters}>{t('comune.stats.reset')}</button>
        </div>
      </div>

      {isLoading && <div className="state-panel liquid-panel">{t('comune.stats.loading')}</div>}
      {error && <div className="state-panel liquid-panel"><p>{error}</p><button type="button" onClick={() => load(filters)}>{t('comune.stats.retry')}</button></div>}

      {stats && !isLoading && !error && (
        <>
          {/* KPIs — always shown regardless of tab */}
          <div className="kpi-grid">
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.activeActivities')}</span><strong className="kpi-value">{stats.totalActivities}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.certifiedEvents')}</span><strong className="kpi-value">{stats.totalEvents}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.pointsOfInterest')}</span><strong className="kpi-value">{stats.totalPOIs}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.participations')}</span><strong className="kpi-value">{stats.totalParticipations}</strong></article>
            {needs && (
              <article className="kpi liquid-card">
                <span className="kpi-label">{t('comune.stats.citizenNeeds')}</span>
                <strong className="kpi-value">{needs.total}</strong>
              </article>
            )}
          </div>

          {/* Tab strip */}
          <div className="tab-strip liquid-card" role="tablist">
            {(['overview', 'trends', 'supply'] as Tab[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`tab-btn${tab === id ? ' active' : ''}`}
                onClick={() => setTab(id)}
              >
                {t(`comune.stats.tab_${id}`)}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {tab === 'overview' && (
            <div className="comune-analytics-grid">
              <section className="dashboard-section liquid-card">
                <h2>{t('comune.stats.byType')}</h2>
                {stats.activitiesByType.length === 0 ? (
                  <p className="muted-copy">{t('comune.stats.noData')}</p>
                ) : (
                  <div className="metric-bar-list">
                    {stats.activitiesByType.map((row) => (
                      <article className="metric-bar" key={row.tipo}>
                        <span>{t(`categories.${row.tipo}`, { defaultValue: row.tipo })}</span>
                        <div><i style={{ inlineSize: `${(Number(row.count) / activityMax) * 100}%` }} /></div>
                        <strong>{row.count}</strong>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-section liquid-card">
                <h2>{t('comune.stats.byCrowding')}</h2>
                {stats.poiCrowding.length === 0 ? (
                  <p className="muted-copy">{t('comune.stats.noData')}</p>
                ) : (
                  <div className="metric-bar-list">
                    {stats.poiCrowding.map((row) => (
                      <article className="metric-bar" key={row.statoAffollamento}>
                        <span>
                          <span className={`crowding-dot ${row.statoAffollamento}`} />
                          {t(CROWD_LABEL[row.statoAffollamento] ?? 'admin.poi.crowdingLow')}
                        </span>
                        <div><i style={{ inlineSize: `${(Number(row.count) / poiMax) * 100}%` }} /></div>
                        <strong>{row.count}</strong>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {(stats.eventsByCategory ?? []).length > 0 && (
                <section className="dashboard-section liquid-card">
                  <h2>{t('comune.dashboard.categories')}</h2>
                  <div className="metric-bar-list">
                    {(stats.eventsByCategory ?? []).map((row) => {
                      const eMax = maxCount(stats.eventsByCategory ?? []);
                      return (
                        <article className="metric-bar" key={row.categoria}>
                          <span>{t(`categories.${row.categoria.toLowerCase()}`, { defaultValue: row.categoria })}</span>
                          <div><i style={{ inlineSize: `${(Number(row.count) / eMax) * 100}%` }} /></div>
                          <strong>{row.count}</strong>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {needs && needs.total > 0 && (
                <section className="dashboard-section liquid-card">
                  <h2>{t('comune.stats.citizenNeedsTitle')}</h2>
                  <div className="metric-bar-list">
                    {needs.byCategory.map((r) => {
                      const nMax = maxCount(needs.byCategory);
                      return (
                        <article className="metric-bar" key={r.categoria}>
                          <span>{t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria })}</span>
                          <div><i style={{ inlineSize: `${(Number(r.count) / nMax) * 100}%` }} /></div>
                          <strong>{r.count}</strong>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── Tab: Trends ── */}
          {tab === 'trends' && (
            <div className="comune-analytics-grid">
              <section className="dashboard-section liquid-card" style={{ gridColumn: '1 / -1' }}>
                <h2>{t('comune.stats.trendTitle')}</h2>
                {nonZeroDays === 0 ? (
                  <p className="muted-copy">{t('comune.stats.noTrend')}</p>
                ) : (
                  <>
                    <Sparkline days={filledDays} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span>{filledDays[0]?.date}</span>
                        <span>{filledDays[filledDays.length - 1]?.date}</span>
                      </div>
                      {nonZeroDays < 4 && (
                        <span className="sparse-badge">{t('comune.stats.trendSparse', { n: nonZeroDays })}</span>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="dashboard-section liquid-card">
                <h2>{t('comune.stats.peakHourTitle')}</h2>
                <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.stats.peakHourHint')}</p>
                {hourlyData.every((r) => r.count === 0) ? (
                  <p className="muted-copy">{t('comune.stats.noPeakData')}</p>
                ) : (
                  <div className="metric-bar-list" style={{ gap: 6 }}>
                    {hourlyData.filter((r) => r.count > 0).map((r) => (
                      <HourBar key={r.hour} hour={r.hour} count={r.count} max={hourMax} />
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-section liquid-card">
                <h2>{t('comune.stats.poiByTypeTitle')}</h2>
                {(stats.poiByType ?? []).length === 0 ? (
                  <p className="muted-copy">{t('comune.stats.noData')}</p>
                ) : (
                  <div className="metric-bar-list">
                    {(stats.poiByType ?? []).slice(0, 12).map((row) => {
                      const pMax = maxCount(stats.poiByType ?? []);
                      return (
                        <article className="metric-bar" key={row.tipo ?? 'null'}>
                          <span style={{ fontSize: 12 }}>{row.tipo ?? t('common.notSpecified')}</span>
                          <div><i style={{ inlineSize: `${(Number(row.count) / pMax) * 100}%` }} /></div>
                          <strong>{row.count}</strong>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Tab: Supply & Demand ── */}
          {tab === 'supply' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <section className="dashboard-section liquid-card">
                <h2>{t('comune.stats.supplyTitle')}</h2>
                <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.stats.supplyHint')}</p>
                {supplyRows.length === 0 ? (
                  <p className="muted-copy">{t('comune.stats.noSupplyData')}</p>
                ) : (
                  <table className="stats-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>{t('comune.stats.supplyColCategory')}</th>
                        <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColDemand')}</th>
                        <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColSupply')}</th>
                        <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColRatio')}</th>
                        <th>{t('comune.stats.supplyColStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplyRows.map((row) => {
                        const status = gapStatus(row.ratio, t);
                        return (
                          <tr key={row.tipo}>
                            <td>{t(`categories.${row.tipo}`, { defaultValue: row.tipo })}</td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.demand}</td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.supply}</td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.ratio.toFixed(1)}×</td>
                            <td><span style={{ color: status.color, fontWeight: 720, fontSize: 13 }}>{status.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {needs && needs.total > 0 && (
                <section className="dashboard-section liquid-card">
                  <h2>{t('comune.stats.citizenNeedsTitle')}</h2>
                  <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.stats.citizenNeedsHint')}</p>
                  <table className="stats-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>{t('comune.stats.supplyColCategory')}</th>
                        <th style={{ textAlign: 'right' }}>{t('comune.stats.supplyColDemand')}</th>
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
                </section>
              )}
            </div>
          )}
        </>
      )}

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
