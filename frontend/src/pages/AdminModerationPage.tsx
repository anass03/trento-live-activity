import { useEffect, useState } from 'react';
import { getReports, resolveReport, type Report } from '../lib/api';

const STATI = ['aperta', 'in lavorazione', 'risolta'] as const;

export function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string>('aperta');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load(stato = filter) {
    setIsLoading(true);
    setError(null);
    getReports(stato || undefined)
      .then((r) => setReports(r.reports || []))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }
  useEffect(() => { load(filter); }, [filter]);

  async function resolve(id: string, azione: 'rimuovi' | 'archivia' | 'in_lavorazione') {
    try {
      const r = await resolveReport(id, azione);
      setMessage(r.message);
      load(filter);
    } catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Moderazione segnalazioni</h1>
          <p>Flow conforme al Digital Services Act (EU 2022/2065)</p>
        </div>
      </header>

      <div className="liquid-card filter-bar">
        <div className="filter-row">
          <label>
            <span>Filtra per stato</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Tutte</option>
              {STATI.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="state-panel liquid-panel"><p>{error}</p></div>}
      {message && <div className="state-panel liquid-panel"><p>{message}</p></div>}
      {isLoading && <div className="state-panel liquid-panel">Caricamento...</div>}
      {!isLoading && reports.length === 0 && <div className="state-panel liquid-panel">Nessuna segnalazione.</div>}

      {reports.length > 0 && (
        <div className="data-grid">
          {reports.map((r) => (
            <article className="data-card liquid-card" key={r.id}>
              <div className="data-card-header"><span>{r.tipo}</span><small>{r.stato}</small></div>
              <h2>{r.event?.titolo || 'Evento sconosciuto'}</h2>
              <p>{r.descrizione || 'Senza descrizione aggiuntiva'}</p>
              <dl>
                <div><dt>Segnalato il</dt><dd>{new Date(r.createdAt).toLocaleString('it-IT')}</dd></div>
              </dl>
              {r.stato !== 'risolta' && (
                <div className="filter-actions">
                  {r.stato === 'aperta' && (
                    <button type="button" onClick={() => resolve(r.id, 'in_lavorazione')}>In lavorazione</button>
                  )}
                  <button type="button" className="danger-button" onClick={() => resolve(r.id, 'rimuovi')}>Rimuovi evento</button>
                  <button type="button" onClick={() => resolve(r.id, 'archivia')}>Archivia</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
