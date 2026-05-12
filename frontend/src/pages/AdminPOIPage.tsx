import { useEffect, useState, type FormEvent } from 'react';
import { createPOI, deletePOI, getPOIs, updatePOI, type POI } from '../lib/api';

const EMPTY: Partial<POI> = { nome: '', latitudine: 46.066, longitudine: 11.121, capacitaMax: 100, statoAffollamento: 'verde', tipo: '', descrizione: '' };

export function AdminPOIPage() {
  const [pois, setPois] = useState<POI[]>([]);
  const [editing, setEditing] = useState<Partial<POI>>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    getPOIs().then(setPois).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    try {
      if (editing.id) {
        await updatePOI(editing.id, editing);
        setMessage('POI aggiornato');
      } else {
        await createPOI(editing);
        setMessage('POI creato');
      }
      setEditing(EMPTY);
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Eliminare questo POI?')) return;
    try { await deletePOI(id); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Errore'); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div><h1>Gestione POI</h1><p>Punti di interesse sulla mappa</p></div>
      </header>

      <form className="auth-form glass-card" onSubmit={handleSubmit}>
        <h2>{editing.id ? 'Modifica POI' : 'Nuovo POI'}</h2>
        <label><span>Nome</span><input type="text" value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} required /></label>
        <div className="filter-row">
          <label><span>Latitudine</span><input type="number" step="0.000001" value={editing.latitudine ?? ''} onChange={(e) => setEditing({ ...editing, latitudine: Number(e.target.value) })} required /></label>
          <label><span>Longitudine</span><input type="number" step="0.000001" value={editing.longitudine ?? ''} onChange={(e) => setEditing({ ...editing, longitudine: Number(e.target.value) })} required /></label>
        </div>
        <div className="filter-row">
          <label><span>Capacità max</span><input type="number" min="1" value={editing.capacitaMax ?? ''} onChange={(e) => setEditing({ ...editing, capacitaMax: Number(e.target.value) })} required /></label>
          <label>
            <span>Stato affollamento</span>
            <select value={editing.statoAffollamento || 'verde'} onChange={(e) => setEditing({ ...editing, statoAffollamento: e.target.value })}>
              <option value="verde">verde</option><option value="giallo">giallo</option><option value="rosso">rosso</option>
            </select>
          </label>
          <label><span>Tipo</span><input type="text" value={editing.tipo || ''} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })} placeholder="piazza, museo, parco..." /></label>
        </div>
        <label><span>Descrizione</span><textarea value={editing.descrizione || ''} onChange={(e) => setEditing({ ...editing, descrizione: e.target.value })} rows={2} /></label>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <div className="filter-actions">
          <button type="submit" className="primary-button">{editing.id ? 'Salva modifiche' : 'Crea POI'}</button>
          {editing.id && <button type="button" onClick={() => setEditing(EMPTY)}>Annulla</button>}
        </div>
      </form>

      <div className="glass-card">
        <h2>POI esistenti ({pois.length})</h2>
        <table className="stats-table">
          <thead><tr><th>Nome</th><th>Coordinate</th><th>Cap.</th><th>Stato</th><th>Azioni</th></tr></thead>
          <tbody>
            {pois.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.latitudine.toFixed(4)}, {p.longitudine.toFixed(4)}</td>
                <td>{p.capacitaMax}</td>
                <td><span className={`crowding-dot ${p.statoAffollamento}`} /> {p.statoAffollamento}</td>
                <td>
                  <button type="button" onClick={() => setEditing(p)}>Modifica</button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(p.id)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
