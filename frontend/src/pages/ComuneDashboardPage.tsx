import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboardStats, type DashboardStats } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';

const CROWD_LABEL_KEY: Record<string, string> = {
  verde: 'admin.poi.crowdingLow',
  giallo: 'admin.poi.crowdingMedium',
  rosso: 'admin.poi.crowdingHigh',
};

export function ComuneDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    getDashboardStats()
      .then((next) => setStats(next as DashboardStats))
      .catch((e) => { if (!silent) setError(e instanceof Error ? e.message : t('comune.dashboard.error')); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), 60_000);

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
          </div>

          <div className="comune-overview-grid">
            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">{t('comune.dashboard.crowdingTitle')}</span>
                <strong>{t('comune.dashboard.topPOIs')}</strong>
              </div>
              {(stats.topCrowdedPOIs || []).length === 0 ? (
                <p className="muted-copy">{t('comune.dashboard.noPOIData')}</p>
              ) : (
                <ol className="comune-poi-list">
                  {(stats.topCrowdedPOIs || []).map((p, i) => (
                    <li key={p.id}>
                      <span className="comune-rank">#{i + 1}</span>
                      <span className="comune-poi-name">{p.nome}</span>
                      <span className="muted-copy">{p.tipo || '—'}</span>
                      <span className={`crowding-dot ${p.statoAffollamento}`} aria-hidden="true" />
                      <span><strong>{t(CROWD_LABEL_KEY[p.statoAffollamento] || 'admin.poi.crowdingLow')}</strong></span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">{t('comune.dashboard.spontaneousActivities')}</span>
                <strong>{t('comune.dashboard.topCategories')}</strong>
              </div>
              {stats.activitiesByType.length === 0 ? (
                <p className="muted-copy">{t('comune.dashboard.noActivities')}</p>
              ) : (
                <ul className="comune-bar-list">
                  {stats.activitiesByType
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((r) => {
                      const max = Math.max(...stats.activitiesByType.map((x) => x.count), 1);
                      return (
                        <li key={r.tipo}>
                          <span>{r.tipo}</span>
                          <div className="comune-bar">
                            <span className="comune-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <strong>{r.count}</strong>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="liquid-card comune-panel">
              <div className="widget-heading">
                <span className="section-eyebrow">{t('comune.dashboard.certifiedEventsSection')}</span>
                <strong>{t('comune.dashboard.categories')}</strong>
              </div>
              {(stats.eventsByCategory || []).length === 0 ? (
                <p className="muted-copy">{t('comune.dashboard.noEvents')}</p>
              ) : (
                <ul className="comune-bar-list">
                  {(stats.eventsByCategory || [])
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((r) => {
                      const max = Math.max(...(stats.eventsByCategory || []).map((x) => x.count), 1);
                      return (
                        <li key={r.categoria}>
                          <span>{r.categoria}</span>
                          <div className="comune-bar">
                            <span className="comune-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <strong>{r.count}</strong>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <section className="liquid-card comune-panel">
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
        </>
      )}
    </section>
  );
}
