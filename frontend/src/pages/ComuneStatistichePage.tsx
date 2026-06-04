import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDashboardStats, type DashboardFilters, type DashboardStats } from '../lib/api';
import { AreaMapPicker } from '../components/map/AreaMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';

const EMPTY_FILTERS: DashboardFilters = {};

function cleanFilters(filters: DashboardFilters): DashboardFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')) as DashboardFilters;
}

function maxCount(rows: Array<{ count: number | string }>) {
  return Math.max(1, ...rows.map((row) => Number(row.count) || 0));
}

export function ComuneStatistichePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  function load(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    getDashboardStats(cleanFilters(nextFilters))
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : t('comune.stats.loading')))
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
          <h1>{t('comune.stats.title')}</h1>
          <p>{t('comune.stats.subtitle')}</p>
        </div>
        <button type="button" className="refresh-button" onClick={() => load(filters)}>{t('comune.stats.refresh')}</button>
      </header>

      <div className="liquid-card filter-bar">
        <h2>{t('comune.stats.filtersTitle')}</h2>
        <div className="filter-row">
          <label>
            <span>{t('comune.stats.activityType')}</span>
            <select value={filters.tipo || ''} onChange={(event) => update('tipo', event.target.value)}>
              <option value="">{t('comune.stats.all')}</option>
              <option value="sport">Sport</option>
              <option value="cultura">Cultura</option>
              <option value="musica">Musica</option>
              <option value="studio">Studio</option>
            </select>
          </label>
          <label><span>{t('comune.stats.from')}</span><input type="date" value={filters.da || ''} onChange={(event) => update('da', event.target.value)} /></label>
          <label><span>{t('comune.stats.to')}</span><input type="date" value={filters.a || ''} onChange={(event) => update('a', event.target.value)} /></label>
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
              <button type="button" onClick={() => setFilters((prev) => ({ ...prev, centerLat: undefined, centerLng: undefined, radiusKm: undefined }))}>
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
          <div className="kpi-grid">
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.activeActivities')}</span><strong className="kpi-value">{stats.totalActivities}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.certifiedEvents')}</span><strong className="kpi-value">{stats.totalEvents}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.pointsOfInterest')}</span><strong className="kpi-value">{stats.totalPOIs}</strong></article>
            <article className="kpi liquid-card"><span className="kpi-label">{t('comune.dashboard.participations')}</span><strong className="kpi-value">{stats.totalParticipations}</strong></article>
          </div>

          <div className="comune-analytics-grid">
            <section className="dashboard-section liquid-card">
              <h2>{t('comune.stats.byType')}</h2>
              {stats.activitiesByType.length === 0 ? (
                <p className="muted-copy">{t('comune.stats.noData')}</p>
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
              <h2>{t('comune.stats.byCrowding')}</h2>
              {stats.poiCrowding.length === 0 ? (
                <p className="muted-copy">{t('comune.stats.noData')}</p>
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
