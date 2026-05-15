import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminUser,
  getAdminCittadini, getAdminComunali, getAdminEnti, getAdminSistema,
  type AdminCittadino, type AdminComunale, type AdminEnte, type AdminSistema,
} from '../lib/api';

type Tab = 'cittadini' | 'enti' | 'comunali' | 'sistema';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'cittadini', label: 'Cittadini', hint: 'Utenti registrati con codice fiscale' },
  { id: 'enti', label: 'Enti certificati', hint: 'Organizzazioni con PEC verificata' },
  { id: 'comunali', label: 'Comune', hint: 'Amministratori comunali (accesso SPID)' },
  { id: 'sistema', label: 'Sistema', hint: 'Amministratori di sistema (2FA obbligatoria)' },
];

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('it-IT');
}

export function AdminUsersPage() {
  const [tab, setTab] = useState<Tab>('cittadini');
  const [cittadini, setCittadini] = useState<AdminCittadino[]>([]);
  const [enti, setEnti] = useState<AdminEnte[]>([]);
  const [comunali, setComunali] = useState<AdminComunale[]>([]);
  const [sistema, setSistema] = useState<AdminSistema[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      getAdminCittadini().catch(() => [] as AdminCittadino[]),
      getAdminEnti().catch(() => [] as AdminEnte[]),
      getAdminComunali().catch(() => [] as AdminComunale[]),
      getAdminSistema().catch(() => [] as AdminSistema[]),
    ])
      .then(([c, e, m, s]) => { setCittadini(c); setEnti(e); setComunali(m); setSistema(s); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Eliminare ${label}? L'operazione è irreversibile (GDPR art. 17).`)) return;
    try { await deleteAdminUser(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  const tabCounts: Record<Tab, number> = {
    cittadini: cittadini.length,
    enti: enti.length,
    comunali: comunali.length,
    sistema: sistema.length,
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

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Gestione utenti</h1>
          <p>Account suddivisi per ruolo — schema con tabelle profilo separate</p>
        </div>
        <button type="button" className="refresh-button" onClick={load} disabled={isLoading}>
          {isLoading ? 'Aggiornamento…' : 'Aggiorna'}
        </button>
      </header>

      <nav className="admin-users-tabs" aria-label="Categorie utenti">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`admin-users-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <strong>{t.label}</strong>
            <span className="admin-users-tab-count">{tabCounts[t.id]}</span>
            <small>{t.hint}</small>
          </button>
        ))}
      </nav>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>Cerca in questa categoria</span>
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Email, nome, codice fiscale, PEC…" />
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}

      {tab === 'cittadini' && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Nome</th><th>Email</th><th>Codice fiscale</th><th>Data nascita</th>
                <th>Verificato</th><th>Registrato</th><th>Azioni</th>
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
                  <td><button type="button" className="danger-button" onClick={() => handleDelete(u.id, u.email)}>Elimina</button></td>
                </tr>
              ))}
              {visibleCittadini.length === 0 && (
                <tr><td colSpan={7} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>Nessun cittadino.</td></tr>
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
                <th>Denominazione</th><th>Email login</th><th>PEC</th>
                <th>Stato</th><th>Registrato</th><th>Azioni</th>
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
                      ? <span className="report-stato report-stato-done">Approvato</span>
                      : <span className="report-stato report-stato-open">In attesa</span>}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td><button type="button" className="danger-button" onClick={() => handleDelete(u.id, u.nomeEnte || u.email)}>Elimina</button></td>
                </tr>
              ))}
              {visibleEnti.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>Nessun ente certificato.</td></tr>
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
                <th>Nome</th><th>Email</th><th>Ufficio</th><th>SPID ID</th>
                <th>Registrato</th><th>Azioni</th>
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
                  <td><button type="button" className="danger-button" onClick={() => handleDelete(u.id, u.email)}>Elimina</button></td>
                </tr>
              ))}
              {visibleComunali.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>Nessun amministratore comunale.</td></tr>
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
                <th>Nome</th><th>Email</th><th>2FA</th>
                <th>Super admin</th><th>Registrato</th><th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {visibleSistema.map((u) => (
                <tr key={u.id}>
                  <td>{[u.nome, u.cognome].filter(Boolean).join(' ') || '—'}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.twoFactorEnabled
                      ? <span className="report-stato report-stato-done">Attiva</span>
                      : <span className="report-stato report-stato-open">Non attiva</span>}
                  </td>
                  <td>{u.superAdmin ? '✓' : '—'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td><button type="button" className="danger-button" onClick={() => handleDelete(u.id, u.email)}>Elimina</button></td>
                </tr>
              ))}
              {visibleSistema.length === 0 && (
                <tr><td colSpan={6} className="muted-copy" style={{ textAlign: 'center', padding: 20 }}>Nessun amministratore di sistema.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
