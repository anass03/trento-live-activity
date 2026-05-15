import { useEffect, useState } from 'react';
import { deleteAdminUser, getAdminUsers, type AdminUser } from '../lib/api';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    getAdminUsers().then(setUsers).catch((e) => setError(e.message)).finally(() => setIsLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Eliminare l'utente ${label}? L'operazione è irreversibile (GDPR art. 17).`)) return;
    try { await deleteAdminUser(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  const filtered = filter
    ? users.filter((u) =>
        u.email.toLowerCase().includes(filter.toLowerCase())
        || u.nome.toLowerCase().includes(filter.toLowerCase())
        || (u.nomeEnte || '').toLowerCase().includes(filter.toLowerCase()))
    : users;

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div><h1>Gestione utenti</h1><p>Tutti gli account registrati ({users.length})</p></div>
        <button type="button" className="refresh-button" onClick={load} disabled={isLoading}>
          {isLoading ? 'Aggiornamento…' : 'Aggiorna'}
        </button>
      </header>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>Cerca</span>
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="email, nome, ente..." />
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">Caricamento...</div>}

      {!isLoading && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead><tr><th>Email</th><th>Nome</th><th>Ruolo</th><th>Stato</th><th>Registrato il</th><th>Azioni</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.nomeEnte ? <em>{u.nomeEnte}</em> : `${u.nome} ${u.cognome}`}</td>
                  <td>{u.ruolo}</td>
                  <td>{u.ruolo === 'EnteCertificato' ? (u.approvato ? 'Approvato' : 'In attesa') : '—'}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString('it-IT')}</td>
                  <td>
                    <button type="button" className="danger-button" onClick={() => handleDelete(u.id, u.email)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
