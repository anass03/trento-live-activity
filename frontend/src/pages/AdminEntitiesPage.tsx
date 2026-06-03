import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { approveEntity, getPendingEntities, rejectEntity, type PendingEntity } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDate } from '../lib/formatters';

export function AdminEntitiesPage() {
  const { t } = useTranslation();
  const [entities, setEntities] = useState<PendingEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(silent = false) {
    if (!silent) setIsLoading(true);
    getPendingEntities()
      .then(setEntities)
      .catch((e) => { if (!silent) setError(e.message); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }
  useEffect(() => { load(); }, []);
  useAutoRefresh(() => load(true), 30_000);

  async function handleApprove(id: string) {
    try { await approveEntity(id); setMessage(t('admin.entities.approved')); load(); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }
  async function handleReject(id: string) {
    if (!window.confirm(t('admin.entities.rejectConfirm'))) return;
    try { await rejectEntity(id); setMessage(t('admin.entities.rejected')); load(); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('admin.entities.title')}</h1>
          <p>{t('admin.entities.subtitle')}</p>
        </div>
        {isLoading && <span className="muted-copy auto-refresh-hint">{t('common.updating')}</span>}
      </header>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {message && <div className="state-panel liquid-panel"><p>{message}</p></div>}

      {isLoading && <div className="state-panel liquid-panel">{t('admin.loading')}</div>}
      {!isLoading && entities.length === 0 && <div className="state-panel liquid-panel">{t('admin.entities.none')}</div>}

      {entities.length > 0 && (
        <div className="data-grid">
          {entities.map((e) => (
            <article className="data-card liquid-card" key={e.id}>
              <div className="data-card-header">
                <span>{t('admin.entities.entityLabel')}</span>
                <small>{formatDate(e.createdAt)}</small>
              </div>
              <h2>{e.nomeEnte}</h2>
              <dl>
                <div><dt>{t('auth.email')}</dt><dd>{e.email}</dd></div>
                <div><dt>{t('admin.entities.referent')}</dt><dd>{e.nome || t('common.notSpecified')}</dd></div>
              </dl>
              <div className="filter-actions">
                <button type="button" className="primary-button" onClick={() => handleApprove(e.id)}>{t('admin.entities.approve')}</button>
                <button type="button" className="danger-button" onClick={() => handleReject(e.id)}>{t('admin.entities.reject')}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
