import { useEffect, useMemo, useState } from 'react';
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

// ── Smart hints ─────────────────────────────────────────────────────────────
type HintSeverity = 'critico' | 'attenzione' | 'suggerimento';
interface SmartHint { key: string; severity: HintSeverity; icon: string; message: string; }

function buildHints(
  stats: DashboardStats,
  needs: ServiceRequestStats | null,
  filledDays: Array<{ date: string; count: number }>,
  supplyDemand: Array<{ tipo: string; demand: number; supply: number; ratio: number }>,
  t: (k: string, opts?: Record<string, unknown>) => string,
): SmartHint[] {
  const hints: SmartHint[] = [];

  // 1. POI at rosso → suggest expansion
  (stats.topCrowdedPOIs ?? [])
    .filter((p) => p.statoAffollamento === 'rosso')
    .forEach((poi) => hints.push({
      key: `red-poi-${poi.id}`,
      severity: 'critico',
      icon: '📍',
      message: t('comune.dashboard.hintOvercrowdedPOI', { name: poi.nome, tipo: poi.tipo || '—' }),
    }));

  // 2a. High ratio, zero supply → suggest new infrastructure
  supplyDemand
    .filter((r) => r.ratio >= 4 && r.supply === 0)
    .forEach((row) => hints.push({
      key: `gap-nosupply-${row.tipo}`,
      severity: 'critico',
      icon: '🏗',
      message: t('comune.dashboard.hintNoSupply', {
        tipo: t(`categories.${row.tipo}`, { defaultValue: row.tipo }),
        demand: row.demand,
      }),
    }));

  // 2b. High ratio with some supply → note underservice
  supplyDemand
    .filter((r) => r.ratio >= 4 && r.supply > 0)
    .forEach((row) => hints.push({
      key: `gap-ratio-${row.tipo}`,
      severity: 'attenzione',
      icon: '📊',
      message: t('comune.dashboard.hintHighRatio', {
        tipo: t(`categories.${row.tipo}`, { defaultValue: row.tipo }),
        ratio: row.ratio.toFixed(1),
      }),
    }));

  // 3. Citizen request spike (>2x avg per category, at least 3 reports)
  if (needs && needs.total > 0 && needs.byCategory.length > 0) {
    const avg = needs.total / needs.byCategory.length;
    needs.byCategory
      .filter((r) => r.count > avg * 2 && r.count >= 3)
      .forEach((r) => hints.push({
        key: `needs-spike-${r.categoria}`,
        severity: 'attenzione',
        icon: '📢',
        message: t('comune.dashboard.hintNeedsSpike', {
          cat: t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria }),
          count: r.count,
        }),
      }));
  }

  // 4. Participation declining (last 7d avg < prev 7d avg × 0.7)
  if (filledDays.length >= 14) {
    const prev7 = filledDays.slice(0, 7).reduce((s, d) => s + d.count, 0) / 7;
    const last7 = filledDays.slice(7).reduce((s, d) => s + d.count, 0) / 7;
    if (prev7 > 0.5 && last7 < prev7 * 0.7) {
      hints.push({
        key: 'trend-declining',
        severity: 'attenzione',
        icon: '📉',
        message: t('comune.dashboard.hintTrendDecline', { pct: Math.round((1 - last7 / prev7) * 100) }),
      });
    }
  }

  // 5. Peak hour concentration (single hour >2.5x avg, <6 active hours)
  const hourMap = Object.fromEntries((stats.activitiesByHour ?? []).map((r) => [r.hour, Number(r.count)]));
  const nonZeroH = Object.values(hourMap).filter((c) => c > 0);
  if (nonZeroH.length > 0 && nonZeroH.length < 6) {
    const avgH = nonZeroH.reduce((s, c) => s + c, 0) / nonZeroH.length;
    const maxH = Math.max(...nonZeroH);
    if (maxH > avgH * 2.5) {
      const peakHour = Object.keys(hourMap).find((k) => hourMap[k] === maxH) ?? '?';
      hints.push({
        key: 'peak-hour',
        severity: 'suggerimento',
        icon: '⏰',
        message: t('comune.dashboard.hintPeakHour', { hour: peakHour.padStart(2, '0') }),
      });
    }
  }

  const order: Record<HintSeverity, number> = { critico: 0, attenzione: 1, suggerimento: 2 };
  return hints.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Minimal SVG sparkline — no external deps */
function Sparkline({ days }: { days: Array<{ date: string; count: number }> }) {
  const values = days.map((d) => Number(d.count));
  const max = Math.max(...values);
  if (max === 0 || days.length < 2) return null;
  const normMax = Math.max(max, 1);
  const W = 220; const H = 44; const PAD = 4;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / normMax) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
        const y = H - PAD - (v / normMax) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r={v > 0 ? 3 : 2} fill={v > 0 ? 'var(--color-primary)' : 'var(--color-border)'} />;
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
  const [hintsExpanded, setHintsExpanded] = useState(false);

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

  // Fill all 14 days — backend only returns days with data, we need every slot for a continuous line
  const filledDays = useMemo(() => {
    const map = Object.fromEntries((stats?.activitiesByDay ?? []).map((r) => [r.date, Number(r.count)]));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const date = d.toISOString().slice(0, 10);
      return { date, count: map[date] ?? 0 };
    });
  }, [stats]);

  const nonZeroDays = filledDays.filter((d) => d.count > 0).length;

  // Demand/supply: sort activity types by demand ratio (activities / matched POIs)
  const supplyDemand = useMemo(() => (stats?.activitiesByType ?? [])
    .map((row) => {
      const demand = Number(row.count);
      const supply = matchPOICount(row.tipo, poiByType);
      const ratio = supply > 0 ? demand / supply : demand;
      return { tipo: row.tipo, demand, supply, ratio };
    })
    .sort((a, b) => b.ratio - a.ratio),
  [stats]);

  const maxDemand = Math.max(...supplyDemand.map((r) => r.demand), 1);

  // Smart hints — pure derivation from loaded data
  const hints = useMemo(
    () => stats ? buildHints(stats, needs, filledDays, supplyDemand, t) : [],
    [stats, needs, filledDays, supplyDemand],
  );
  const visibleHints = hintsExpanded ? hints : hints.slice(0, 3);

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

          {/* Smart operator hints */}
          {hints.length > 0 && (
            <div className="hints-panel liquid-card">
              <div className="hints-header">
                <div>
                  <span className="section-eyebrow">{t('comune.dashboard.hintsTitle')}</span>
                  <strong style={{ display: 'block', fontSize: 14, marginTop: 2 }}>{t('comune.dashboard.hintsSubtitle')}</strong>
                </div>
                {hints.length > 3 && (
                  <button
                    type="button"
                    className="ghost-button"
                    style={{ fontSize: 13 }}
                    onClick={() => setHintsExpanded((h) => !h)}
                  >
                    {hintsExpanded
                      ? t('comune.dashboard.hintsCollapse')
                      : t('comune.dashboard.hintsExpand', { n: hints.length })}
                  </button>
                )}
              </div>
              <ul className="hints-list">
                {visibleHints.map((hint) => (
                  <li key={hint.key} className={`hint-item hint-item--${hint.severity}`}>
                    <span className="hint-icon" aria-hidden="true">{hint.icon}</span>
                    <p className="hint-message">{hint.message}</p>
                    <span className={`hint-badge hint-badge--${hint.severity}`}>
                      {t(`comune.dashboard.severity_${hint.severity}`)}
                    </span>
                  </li>
                ))}
              </ul>
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
                {nonZeroDays === 0 ? (
                  <p className="muted-copy" style={{ fontSize: 13 }}>{t('comune.dashboard.trendNoData')}</p>
                ) : (
                  <>
                    <Sparkline days={filledDays} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span className="muted-copy" style={{ fontSize: 11 }}>{t('comune.dashboard.trendRange')}</span>
                      {nonZeroDays < 4 && (
                        <span className="sparse-badge">{t('comune.dashboard.trendSparse', { n: nonZeroDays })}</span>
                      )}
                    </div>
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
