import { useEffect, useState } from 'react';
import { deleteAdminUser, getAdminUsers, type AdminUser } from '../lib/api';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setError(null);
    getAdminUsers().then(setUsers).catch((e) => setError(e instanceof Error ? e.message : 'Errore caricamento')).finally(() => setIsLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Eliminare l'utente "${label}"?\nL'operazione elimina anche attività, eventi e partecipazioni associate (GDPR art. 17).`)) return;
    setError(null);
    setSuccess(null);
    setDeletingId(id);
    try {
      await deleteAdminUser(id);
      setSuccess(`Utente "${label}" eliminato.`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante l\'eliminazione');
    } finally {
      setDeletingId(null);
    }
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
        <button type="button" className="ghost-button" onClick={load}>Aggiorna</button>
      </header>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>Cerca</span>
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="email, nome, ente..." />
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel form-error"><p>{error}</p></div>}
      {success && <div className="state-panel liquid-panel form-success"><p>{success}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">Caricamento...</div>}

      {!isLoading && (
        <div className="liquid-card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome / Ente</th>
                <th>Ruolo</th>
                <th>Stato</th>
                <th>Registrato il</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.nomeEnte ? <em>{u.nomeEnte}</em> : `${u.nome} ${u.cognome}`}</td>
                  <td><span className="role-badge">{u.ruolo}</span></td>
                  <td>
                    {u.ruolo === 'EnteCertificato'
                      ? <span className={u.approvato ? 'success-message' : 'muted-copy'}>{u.approvato ? 'Approvato' : 'In attesa'}</span>
                      : <span className="muted-copy">—</span>}
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString('it-IT')}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-button compact-button"
                      disabled={deletingId === u.id}
                      onClick={() => handleDelete(u.id, u.email)}
                    >
                      {deletingId === u.id ? '...' : 'Elimina'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>Nessun utente trovato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
