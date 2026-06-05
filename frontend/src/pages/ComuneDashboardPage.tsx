import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getDashboardStats,
  getDashboardServiceRequests,
  type DashboardStats,
  type ServiceRequestStats,
} from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';

// Keywords to loosely match POI types to activity categories for demand/supply
const POI_KEYWORDS: Record<string, string[]> = {
  sport:       ['sport', 'campo', 'piscina', 'palest', 'stadio', 'gym', 'fitness', 'calcio'],
  cultura:     ['cultur', 'museo', 'teatro', 'galleri', 'bibliote', 'mostra'],
  musica:      ['music', 'concert', 'auditor', 'sala'],
  studio:      ['studi', 'bibliote', 'univer', 'aula', 'cowork', 'scuola'],
  arte:        ['arte', 'atelier', 'galleri'],
  gastronomia: ['gastro', 'mercato', 'ristor', 'bar ', 'café', 'cafe', 'food'],
};

function matchPOICount(tipo: string, poiByType: Array<{ tipo: string | null; count: number }>): number {
  const keys = POI_KEYWORDS[tipo] ?? [tipo];
  return poiByType
    .filter((p) => p.tipo && keys.some((k) => (p.tipo as string).toLowerCase().includes(k)))
    .reduce((s, p) => s + Number(p.count), 0);
}

function gapColor(ratio: number) {
  if (ratio >= 4) return 'var(--color-danger)';
  if (ratio >= 2) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function gapLabel(ratio: number, t: (k: string) => string) {
  if (ratio >= 4) return t('comune.dashboard.gapCritical');
  if (ratio >= 2) return t('comune.dashboard.gapWarning');
  return t('comune.dashboard.gapOk');
}

/** Minimal SVG sparkline — no external deps */
function Sparkline({ days }: { days: Array<{ date: string; count: number }> }) {
  if (days.length < 2) return <p className="muted-copy" style={{ fontSize: 12, margin: 0 }}>—</p>;
  const values = days.map((d) => Number(d.count));
  const max = Math.max(...values, 1);
  const W = 220; const H = 44; const PAD = 4;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - (v / max) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--color-primary)" />;
      })}
    </svg>
  );
}

export function ComuneDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needs, setNeeds] = useState<ServiceRequestStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    Promise.all([
      getDashboardStats(),
      getDashboardServiceRequests(),
    ])
      .then(([s, n]) => { setStats(s as DashboardStats); setNeeds(n); })
      .catch((e) => { if (!silent) setError(e instanceof Error ? e.message : t('comune.dashboard.error')); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }

  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), 60_000);

  const redPOIs = (stats?.topCrowdedPOIs ?? []).filter((p) => p.statoAffollamento === 'rosso');
  const poiByType = stats?.poiByType ?? [];
  const activitiesByDay = stats?.activitiesByDay ?? [];

  // Demand/supply: sort activity types by demand ratio (activities / matched POIs)
  const supplyDemand = (stats?.activitiesByType ?? [])
    .map((row) => {
      const demand = Number(row.count);
      const supply = matchPOICount(row.tipo, poiByType);
      const ratio = supply > 0 ? demand / supply : demand;
      return { tipo: row.tipo, demand, supply, ratio };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const maxDemand = Math.max(...supplyDemand.map((r) => r.demand), 1);

  return (
    <section className="data-page comune-page comune-dashboard-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('comune.dashboard.title')}</h1>
          <p>
            {t('comune.dashboard.description')} <strong>{t('comune.dashboard.noPersonalData')}</strong>
          </p>
        </div>
        {isLoading && <span className="muted-copy auto-refresh-hint">{t('common.updating')}</span>}
      </header>

      {isLoading && <div className="state-panel liquid-panel">{t('comune.dashboard.loading')}</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button type="button" onClick={() => load()}>{t('common.retry')}</button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <>
          {/* Alert strip — only when POIs are at rosso */}
          {redPOIs.length > 0 && (
            <div className="alert-strip liquid-card">
              <span className="alert-strip-label">
                🔴 {redPOIs.length} {t('comune.dashboard.alertOvercrowded')}
              </span>
              <div className="alert-strip-chips">
                {redPOIs.slice(0, 5).map((p) => (
                  <span key={p.id} className="alert-chip">
                    {p.nome}
                    {p.tipo ? <em> · {p.tipo}</em> : null}
                  </span>
                ))}
                {redPOIs.length > 5 && (
                  <span className="alert-chip muted-copy">+{redPOIs.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="kpi-grid">
            <article className="kpi liquid-card">
              <span className="kpi-label">{t('comune.dashboard.activeActivities')}</span>
              <strong className="kpi-value">{stats.totalActivities}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">{t('comune.dashboard.certifiedEvents')}</span>
              <strong className="kpi-value">{stats.totalEvents}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">{t('comune.dashboard.pointsOfInterest')}</span>
              <strong className="kpi-value">{stats.totalPOIs}</strong>
            </article>
            <article className="kpi liquid-card">
              <span className="kpi-label">{t('comune.dashboard.participations')}</span>
              <strong className="kpi-value">{stats.totalParticipations}</strong>
            </article>
            <article className="kpi liquid-card" style={{ borderColor: redPOIs.length > 0 ? 'var(--color-danger)' : undefined }}>
              <span className="kpi-label">{t('comune.dashboard.overcrowdedPOIs')}</span>
              <strong className="kpi-value" style={{ color: redPOIs.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {redPOIs.length}
              </strong>
            </article>
          </div>

          <div className="comune-overview-grid">
            {/* Demand signals */}
            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">{t('comune.dashboard.demandTitle')}</span>
                <strong>{t('comune.dashboard.demandSubtitle')}</strong>
              </div>
              {supplyDemand.length === 0 ? (
                <p className="muted-copy">{t('comune.dashboard.noActivities')}</p>
              ) : (
                <ul className="demand-list">
                  {supplyDemand.map((row) => (
                    <li key={row.tipo}>
                      <div className="demand-row-meta">
                        <span className="demand-tipo">{t(`categories.${row.tipo}`, { defaultValue: row.tipo })}</span>
                        <span className="demand-ratio" style={{ color: gapColor(row.ratio) }}>
                          {gapLabel(row.ratio, t)}
                        </span>
                      </div>
                      <div className="demand-bar-wrap">
                        <div
                          className="demand-bar-fill"
                          style={{
                            width: `${(row.demand / maxDemand) * 100}%`,
                            background: gapColor(row.ratio),
                          }}
                        />
                      </div>
                      <div className="demand-counts">
                        <span>{row.demand} {t('comune.dashboard.demandActivities')}</span>
                        <span className="muted-copy">{row.supply} POI</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top crowded POIs */}
            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">{t('comune.dashboard.crowdingTitle')}</span>
                <strong>{t('comune.dashboard.topPOIs')}</strong>
              </div>
              {(stats.topCrowdedPOIs ?? []).length === 0 ? (
                <p className="muted-copy">{t('comune.dashboard.noPOIData')}</p>
              ) : (
                <ol className="comune-poi-list">
                  {(stats.topCrowdedPOIs ?? []).slice(0, 7).map((p, i) => (
                    <li key={p.id}>
                      <span className="comune-rank">#{i + 1}</span>
                      <span className="comune-poi-name">{p.nome}</span>
                      <span className="muted-copy" style={{ fontSize: 12 }}>{p.tipo || '—'}</span>
                      <span className={`crowding-dot ${p.statoAffollamento}`} aria-hidden="true" />
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Right column: sparkline + needs */}
            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              {/* 14-day trend */}
              <section className="liquid-card comune-panel" style={{ gap: 10 }}>
                <div className="widget-heading">
                  <span className="section-eyebrow">{t('comune.dashboard.trendTitle')}</span>
                  <strong>{t('comune.dashboard.trendSubtitle')}</strong>
                </div>
                {activitiesByDay.length === 0 ? (
                  <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.dashboard.trendNoData')}</p>
                ) : (
                  <>
                    <Sparkline days={activitiesByDay} />
                    <span className="muted-copy" style={{ fontSize: 11 }}>
                      {t('comune.dashboard.trendRange')}
                    </span>
                  </>
                )}
              </section>

              {/* Citizen needs */}
              <section className="liquid-card comune-panel" style={{ gap: 10 }}>
                <div className="widget-heading">
                  <span className="section-eyebrow">{t('comune.dashboard.needsTitle')}</span>
                  <strong>{t('comune.dashboard.needsSubtitle')}</strong>
                </div>
                {!needs || needs.total === 0 ? (
                  <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.dashboard.needsNoData')}</p>
                ) : (
                  <>
                    <ul className="needs-list">
                      {needs.byCategory.slice(0, 4).map((r) => (
                        <li key={r.categoria}>
                          <span>{t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria })}</span>
                          <strong>{r.count}</strong>
                        </li>
                      ))}
                    </ul>
                    <Link to="/comune/statistiche" className="link-button" style={{ fontSize: 13, justifyContent: 'flex-start', padding: '0 4px' }}>
                      {t('comune.dashboard.needsViewAll')} →
                    </Link>
                  </>
                )}
              </section>

              {/* Quick actions */}
              <section className="liquid-card comune-panel" style={{ gap: 10 }}>
                <div className="widget-heading">
                  <span className="section-eyebrow">{t('comune.dashboard.actionsTitle')}</span>
                  <strong>{t('comune.dashboard.tools')}</strong>
                </div>
                <div className="quick-action-list">
                  <Link className="primary-button" to="/comune/statistiche">{t('comune.dashboard.detailedStats')}</Link>
                  <Link className="primary-button" to="/comune/export">{t('comune.dashboard.exportCSVPDF')}</Link>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
