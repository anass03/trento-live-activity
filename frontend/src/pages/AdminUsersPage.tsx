import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createAdminComunale, createAdminSistema, deleteAdminUser,
  getAdminCittadini, getAdminComunali, getAdminEnti, getAdminSistema,
  type AdminCittadino, type AdminComunale, type AdminEnte, type AdminSistema,
  type CurrentUser,
} from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDate } from '../lib/formatters';
import { PasswordInput } from '../components/ui/PasswordInput';

type Tab = 'cittadini' | 'enti' | 'comunali' | 'sistema';

export function AdminUsersPage({ user }: { user?: CurrentUser }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('cittadini');
  const [cittadini, setCittadini] = useState<AdminCittadino[]>([]);
  const [enti, setEnti] = useState<AdminEnte[]>([]);
  const [comunali, setComunali] = useState<AdminComunale[]>([]);
  const [sistema, setSistema] = useState<AdminSistema[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddComunale, setShowAddComunale] = useState(false);
  const [showAddSistema, setShowAddSistema] = useState(false);

  const TABS = [
    { id: 'cittadini' as Tab, label: t('admin.users.tabs.cittadini.label'), hint: t('admin.users.tabs.cittadini.hint') },
    { id: 'enti'      as Tab, label: t('admin.users.tabs.enti.label'),      hint: t('admin.users.tabs.enti.hint') },
    { id: 'comunali'  as Tab, label: t('admin.users.tabs.comunali.label'),  hint: t('admin.users.tabs.comunali.hint') },
    { id: 'sistema'   as Tab, label: t('admin.users.tabs.sistema.label'),   hint: t('admin.users.tabs.sistema.hint') },
  ];

  const load = useCallback((silent = false) => {
    if (!silent) { setIsLoading(true); setError(null); }
    Promise.all([
      getAdminCittadini().catch(() => [] as AdminCittadino[]),
      getAdminEnti().catch(() => [] as AdminEnte[]),
      getAdminComunali().catch(() => [] as AdminComunale[]),
      getAdminSistema().catch(() => [] as AdminSistema[]),
    ])
      .then(([c, e, m, s]) => { setCittadini(c); setEnti(e); setComunali(m); setSistema(s); })
      .catch((e) => { if (!silent) setError(e instanceof Error ? e.message : t('common.error')); })
      .finally(() => { if (!silent) setIsLoading(false); });
  }, [t]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load(true), 30_000);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(t('admin.users.deleteConfirm', { label }))) return;
    setError(null); setSuccess(null); setDeletingId(id);
    try {
      await deleteAdminUser(id);
      setSuccess(t('admin.users.deleted', { label }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setDeletingId(null); }
  }

  const tabCounts: Record<Tab, number> = {
    cittadini: cittadini.length, enti: enti.length,
    comunali: comunali.length, sistema: sistema.length,
  };

  const lc = filter.trim().toLowerCase();
  const visibleCittadini = useMemo(() =>
    cittadini.filter((u) => !lc || [u.email, u.nome, u.cognome, u.codiceFiscale].some((v) => (v || '').toLowerCase().includes(lc))),
    [cittadini, lc]);
  const visibleEnti = useMemo(() =>
    enti.filter((u) => !lc || [u.email, u.nomeEnte, u.pec].some((v) => (v || '').toLowerCase().includes(lc))),
    [enti, lc]);
  const visibleComunali = useMemo(() =>
    comunali.filter((u) => !lc || [u.email, u.nome, u.cognome, u.ufficio].some((v) => (v || '').toLowerCase().includes(lc))),
    [comunali, lc]);
  const visibleSistema = useMemo(() =>
    sistema.filter((u) => !lc || [u.email, u.nome, u.cognome].some((v) => (v || '').toLowerCase().includes(lc))),
    [sistema, lc]);

  function deleteBtn(id: string, label: string, permitted = true) {
    const isBusy = deletingId === id;
    const isDisabled = isBusy || !permitted;
    return (
      <button
        type="button"
        className="danger-button compact-button"
        disabled={isDisabled}
        onClick={permitted ? () => handleDelete(id, label) : undefined}
        style={!permitted ? { pointerEvents: 'none' } : undefined}
        title={!permitted ? t('common.error') : undefined}
      >
        {isBusy ? '...' : t('common.delete')}
      </button>
    );
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('admin.users.title')}</h1>
          <p>{t('admin.users.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isLoading && <span className="muted-copy auto-refresh-hint">{t('common.updating')}</span>}
          {tab === 'comunali' && (
            <button type="button" className="primary-button compact-button" onClick={() => setShowAddComunale(true)}>
              + {t('admin.users.addComunale')}
            </button>
          )}
          {tab === 'sistema' && user?.superAdmin && (
            <button type="button" className="primary-button compact-button" onClick={() => setShowAddSistema(true)}>
              + {t('admin.users.addSistema')}
            </button>
          )}
        </div>
      </header>

      <nav className="admin-users-tabs" aria-label={t('admin.users.title')}>
        {TABS.map((tabItem) => (
          <button
            type="button"
            key={tabItem.id}
            className={`admin-users-tab ${tab === tabItem.id ? 'active' : ''}`}
            onClick={() => setTab(tabItem.id)}
          >
            <strong>{tabItem.label}</strong>
            <span className="admin-users-tab-count">{tabCounts[tabItem.id]}</span>
            <small>{tabItem.hint}</small>
          </button>
        ))}
      </nav>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>{t('admin.users.searchLabel')}</span>
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('admin.users.searchPlaceholder')} />
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel form-error"><p>{error}</p></div>}
      {success && <div className="state-panel liquid-panel form-success"><p>{success}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">{t('admin.loading')}</div>}

      {tab === 'cittadini' && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.users.cols.name')}</th><th>{t('admin.users.cols.email')}</th>
                <th>{t('admin.users.cols.fiscalCode')}</th><th>{t('admin.users.cols.birthDate')}</th>
                <th>{t('admin.users.cols.verified')}</th><th>{t('admin.users.cols.registered')}</th>
                <th>{t('admin.users.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleCittadini.map((u) => (
                <tr key={u.id}>
                  <td>{[u.nome, u.cognome].filter(Boolean).join(' ') || '—'}</td>
                  <td>{u.email}</td>
                  <td><code>{u.codiceFiscale || '—'}</code></td>
                  <td>{formatDate(u.dataNascita)}</td>
                  <td>{u.emailVerified ? '✓' : '—'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{deleteBtn(u.id, u.email)}</td>
                </tr>
              ))}
              {visibleCittadini.length === 0 && (
                <tr><td colSpan={7} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>{t('admin.users.none.cittadini')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'enti' && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.users.cols.entityName')}</th><th>{t('admin.users.cols.loginEmail')}</th>
                <th>{t('admin.users.cols.pec')}</th><th>{t('admin.users.cols.status')}</th>
                <th>{t('admin.users.cols.registered')}</th><th>{t('admin.users.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEnti.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.nomeEnte || '—'}</strong></td>
                  <td>{u.email}</td>
                  <td><code>{u.pec || '—'}</code></td>
                  <td>
                    {u.approvato
                      ? <span className="report-stato report-stato-done">{t('admin.users.approved')}</span>
                      : <span className="report-stato report-stato-open">{t('admin.users.pending')}</span>}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{deleteBtn(u.id, u.nomeEnte || u.email)}</td>
                </tr>
              ))}
              {visibleEnti.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>{t('admin.users.none.enti')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'comunali' && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.users.cols.name')}</th><th>{t('admin.users.cols.email')}</th>
                <th>{t('admin.users.cols.office')}</th><th>{t('admin.users.cols.spidId')}</th>
                <th>{t('admin.users.cols.registered')}</th><th>{t('admin.users.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleComunali.map((u) => (
                <tr key={u.id}>
                  <td>{[u.nome, u.cognome].filter(Boolean).join(' ') || '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.ufficio || '—'}</td>
                  <td><code>{u.spidId ? u.spidId.slice(0, 12) : '—'}</code></td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{deleteBtn(u.id, u.email)}</td>
                </tr>
              ))}
              {visibleComunali.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>{t('admin.users.none.comunali')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sistema' && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.users.cols.name')}</th><th>{t('admin.users.cols.email')}</th>
                <th>{t('admin.users.cols.twofa')}</th><th>{t('admin.users.cols.superAdmin')}</th>
                <th>{t('admin.users.cols.registered')}</th><th>{t('admin.users.cols.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleSistema.map((u) => (
                <tr key={u.id}>
                  <td>{[u.nome, u.cognome].filter(Boolean).join(' ') || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.twoFactorEnabled
                      ? <span className="report-stato report-stato-done">{t('admin.users.twoFactorOn')}</span>
                      : <span className="report-stato report-stato-open">{t('admin.users.twoFactorOff')}</span>}
                  </td>
                  <td>{u.superAdmin ? '✓' : '—'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{deleteBtn(u.id, u.email, user?.superAdmin === true)}</td>
                </tr>
              ))}
              {visibleSistema.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>{t('admin.users.none.sistema')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showAddComunale && (
        <AddAdminModal
          title={t('admin.users.addComunaleTitle')}
          hint={t('admin.users.addComunaleHint')}
          showUfficio
          onClose={() => setShowAddComunale(false)}
          onSave={async (fields) => { await createAdminComunale(fields); load(); setShowAddComunale(false); setSuccess(t('admin.users.created')); }}
        />
      )}
      {showAddSistema && (
        <AddAdminModal
          title={t('admin.users.addSistemaTitle')}
          hint={t('admin.users.addSistemaHint')}
          onClose={() => setShowAddSistema(false)}
          onSave={async (fields) => { await createAdminSistema(fields); load(); setShowAddSistema(false); setSuccess(t('admin.users.created')); }}
        />
      )}
    </section>
  );
}

interface AddAdminModalProps {
  title: string;
  hint: string;
  showUfficio?: boolean;
  onClose: () => void;
  onSave: (fields: { nome: string; cognome: string; email: string; password: string; ufficio?: string }) => Promise<void>;
}

function AddAdminModal({ title, hint, showUfficio = false, onClose, onSave }: AddAdminModalProps) {
  const { t } = useTranslation();
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [ufficio, setUfficio] = useState('Ufficio Statistica');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({ nome, cognome, email, password, ...(showUfficio ? { ufficio } : {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="activity-popup-backdrop" role="presentation" onClick={onClose}>
      <article className="activity-popup" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="activity-popup-close" type="button" onClick={onClose} aria-label={t('common.close')}>×</button>
        <h2>{title}</h2>
        <p>{hint}</p>
        <form className="auth-form" style={{ padding: 0, background: 'none', boxShadow: 'none', border: 'none' }} onSubmit={handleSubmit}>
          <div className="filter-row">
            <label>
              <span>{t('common.name')}</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label>
              <span>{t('common.lastName')}</span>
              <input value={cognome} onChange={(e) => setCognome(e.target.value)} required />
            </label>
          </div>
          <label>
            <span>{t('auth.email')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {showUfficio && (
            <label>
              <span>{t('admin.users.cols.office')}</span>
              <input value={ufficio} onChange={(e) => setUfficio(e.target.value)} />
            </label>
          )}
          <label>
            <span>{t('admin.users.tempPassword')}</span>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="filter-actions">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? t('admin.users.creating') : t('common.save')}
            </button>
            <button type="button" className="ghost-button" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}
