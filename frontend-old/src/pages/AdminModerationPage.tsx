import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getReports, resolveReport, type Report } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDateTime } from '../lib/formatters';

const STATI = ['aperta', 'in lavorazione', 'risolta'] as const;
type Stato = (typeof STATI)[number];

const statoBadgeClass: Record<string, string> = {
  'aperta': 'report-stato report-stato-open',
  'in lavorazione': 'report-stato report-stato-progress',
  'risolta': 'report-stato report-stato-done',
};

export function AdminModerationPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'' | Stato>('aperta');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function load(silent = false) {
    if (!silent) { setIsLoading(true); setError(null); }
    // Always fetch all reports so counts stay accurate across all status tabs.
    getReports(undefined)
      .then((r) => setReports(r.reports || []))
      .catch((e) => { if (!silent) setError(e.message); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), 30_000);

  async function resolve(id: string, azione: 'rimuovi' | 'archivia' | 'in_lavorazione') {
    setActionLoading(id + azione);
    try {
      const r = await resolveReport(id, azione);
      setMessage(r.message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setActionLoading(null); }
  }

  const tipi = useMemo(() => Array.from(new Set(reports.map((r) => r.tipo))).sort(), [reports]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { aperta: 0, 'in lavorazione': 0, risolta: 0 };
    reports.forEach((r) => { c[r.stato] = (c[r.stato] || 0) + 1; });
    return c;
  }, [reports]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter !== '' && r.stato !== filter) return false;
      if (tipoFilter !== 'all' && r.tipo !== tipoFilter) return false;
      if (!q) return true;
      return (
        (r.event?.titolo || '').toLowerCase().includes(q) ||
        (r.descrizione || '').toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q)
      );
    });
  }, [reports, filter, search, tipoFilter]);

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('admin.moderation.title')}</h1>
          <p>{t('admin.moderation.subtitle')}</p>
        </div>
        {isLoading && <span className="muted-copy auto-refresh-hint">{t('common.updating')}</span>}
      </header>

      <div className="moderation-stats">
        {(['aperta', 'in lavorazione', 'risolta', ''] as const).map((stato) => (
          <button
            key={stato || 'all'}
            type="button"
            className={`moderation-stat ${filter === stato ? 'active' : ''}`}
            onClick={() => setFilter(stato)}
          >
            <strong>{stato === '' ? reports.length : (counts[stato] || 0)}</strong>
            <span>{stato === 'aperta' ? t('admin.moderation.open') : stato === 'in lavorazione' ? t('admin.moderation.inProgress') : stato === 'risolta' ? t('admin.moderation.resolved') : t('admin.moderation.all')}</span>
          </button>
        ))}
      </div>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>{t('common.search')}</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.moderation.searchPlaceholder')} />
          </label>
          <label>
            <span>{t('admin.moderation.reportType')}</span>
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
              <option value="all">{t('admin.moderation.allTypes')}</option>
              {tipi.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {message && <div className="state-panel liquid-panel"><p>{message}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">{t('admin.loading')}</div>}
      {!isLoading && visible.length === 0 && (
        <div className="state-panel liquid-panel">{t('admin.moderation.none')}</div>
      )}

      {visible.length > 0 && (
        <div className="moderation-list">
          {visible.map((r) => {
            const isOpen = r.stato === 'aperta';
            const isProgress = r.stato === 'in lavorazione';
            const isDone = r.stato === 'risolta';
            return (
              <article className="liquid-card moderation-card" key={r.id}>
                <header className="moderation-card-header">
                  <div>
                    <span className="report-tipo">{r.tipo}</span>
                    <span className={statoBadgeClass[r.stato] || 'report-stato'}>{r.stato}</span>
                  </div>
                  <time>{formatDateTime(r.createdAt)}</time>
                </header>

                <h2>
                  {r.event?.id ? (
                    <a href={`/eventi/${r.event.id}`} target="_blank" rel="noreferrer">{r.event.titolo}</a>
                  ) : (
                    t('events.unknownEvent')
                  )}
                </h2>
                <p className="moderation-card-description">
                  {r.descrizione || <em>{t('events.noExtraDescription')}</em>}
                </p>

                <dl className="moderation-card-meta">
                  <div><dt>{t('admin.moderation.reportId')}</dt><dd><code>{r.id.slice(0, 8)}</code></dd></div>
                  <div><dt>{t('admin.moderation.reporter')}</dt><dd><code>{r.userId.slice(0, 8)}</code></dd></div>
                </dl>

                {!isDone && (
                  <div className="moderation-card-actions">
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => resolve(r.id, 'in_lavorazione')}
                        disabled={actionLoading === r.id + 'in_lavorazione'}
                      >
                        {t('admin.moderation.takeCharge')}
                      </button>
                    )}
                    {isProgress && <span className="moderation-card-tag">{t('admin.moderation.inCharge')}</span>}
                    <button type="button" onClick={() => resolve(r.id, 'archivia')} disabled={actionLoading === r.id + 'archivia'}>
                      {t('admin.moderation.archive')}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        if (window.confirm(t('admin.moderation.removeConfirm', { title: r.event?.titolo || '' }))) {
                          resolve(r.id, 'rimuovi');
                        }
                      }}
                      disabled={actionLoading === r.id + 'rimuovi'}
                    >
                      {t('admin.moderation.remove')}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
