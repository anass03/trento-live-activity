import { useEffect, useState } from 'react';
import { approveEntity, getPendingEntities, rejectEntity, type PendingEntity } from '../lib/api';

export function AdminEntitiesPage() {
  const [entities, setEntities] = useState<PendingEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    getPendingEntities()
      .then(setEntities)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }
  useEffect(load, []);

  async function handleApprove(id: string) {
    try { await approveEntity(id); setMessage('Ente approvato'); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }
  async function handleReject(id: string) {
    if (!window.confirm('Rifiutare definitivamente questo ente? L\'account verrà eliminato.')) return;
    try { await rejectEntity(id); setMessage('Ente rifiutato'); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Richieste di registrazione enti certificati</h1>
          <p>Approva o rifiuta i nuovi enti che richiedono la verifica</p>
        </div>
        <button type="button" className="ghost-button" onClick={load}>Aggiorna</button>
      </header>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {message && <div className="state-panel liquid-panel"><p>{message}</p></div>}

      {isLoading && <div className="state-panel liquid-panel">Caricamento...</div>}
      {!isLoading && entities.length === 0 && <div className="state-panel liquid-panel">Nessuna richiesta in attesa.</div>}

      {entities.length > 0 && (
        <div className="data-grid">
          {entities.map((e) => (
            <article className="data-card liquid-card" key={e.id}>
              <div className="data-card-header"><span>Ente</span><small>{new Date(e.createdAt).toLocaleDateString('it-IT')}</small></div>
              <h2>{e.nomeEnte}</h2>
              <dl>
                <div><dt>Email</dt><dd>{e.email}</dd></div>
                <div><dt>Referente</dt><dd>{e.nome || 'Non specificato'}</dd></div>
              </dl>
              <div className="filter-actions">
                <button type="button" className="primary-button" onClick={() => handleApprove(e.id)}>Approva</button>
                <button type="button" className="danger-button" onClick={() => handleReject(e.id)}>Rifiuta</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
