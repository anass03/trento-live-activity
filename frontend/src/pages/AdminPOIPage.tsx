import { useEffect, useState, type FormEvent } from 'react';
import { POIMapPicker } from '../components/map/POIMapPicker';
import { createPOI, deletePOI, getPOIs, updatePOI, type POI } from '../lib/api';

const EMPTY: Partial<POI> = { nome: '', latitudine: undefined, longitudine: undefined, capacitaMax: 100, statoAffollamento: 'verde', tipo: '', descrizione: '' };

export function AdminPOIPage() {
  const [pois, setPois] = useState<POI[]>([]);
  const [editing, setEditing] = useState<Partial<POI>>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  function load() {
    getPOIs().then(setPois).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (typeof editing.latitudine !== 'number' || typeof editing.longitudine !== 'number') {
      setError('Seleziona la posizione sulla mappa prima di salvare.');
      return;
    }
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
      <header className="utility-strip liquid-card">
        <div><h1>Gestione POI</h1><p>Punti di interesse sulla mappa</p></div>
      </header>

      <form className="auth-form liquid-card" onSubmit={handleSubmit}>
        <h2>{editing.id ? 'Modifica POI' : 'Nuovo POI'}</h2>
        <label><span>Nome</span><input type="text" value={editing.nome || ''} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} required /></label>
        <div className="poi-location-row">
          <div className="poi-location-info">
            <span className="poi-location-label">Posizione sulla mappa</span>
            {typeof editing.latitudine === 'number' && typeof editing.longitudine === 'number' ? (
              <code>{editing.latitudine.toFixed(6)}, {editing.longitudine.toFixed(6)}</code>
            ) : (
              <em>Nessuna posizione selezionata</em>
            )}
          </div>
          <button type="button" className="primary-button" onClick={() => setShowPicker(true)}>
            {typeof editing.latitudine === 'number' ? 'Modifica posizione' : 'Scegli sulla mappa'}
          </button>
        </div>
        <div className="filter-row">
          <label><span>Capacità max</span><input type="number" min="1" value={editing.capacitaMax ?? ''} onChange={(e) => setEditing({ ...editing, capacitaMax: Number(e.target.value) })} required /></label>
          <label>
            <span>Affollamento</span>
            <select value={editing.statoAffollamento || 'verde'} onChange={(e) => setEditing({ ...editing, statoAffollamento: e.target.value })}>
              <option value="verde">Basso</option><option value="giallo">Medio</option><option value="rosso">Elevato</option>
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

      {showPicker && (
        <POIMapPicker
          initial={{ latitudine: editing.latitudine, longitudine: editing.longitudine }}
          onCancel={() => setShowPicker(false)}
          onConfirm={(coords) => {
            setEditing({ ...editing, ...coords });
            setShowPicker(false);
          }}
        />
      )}

      <div className="liquid-card">
        <h2>POI esistenti ({pois.length})</h2>
        <table className="stats-table">
          <thead><tr><th>Nome</th><th>Coordinate</th><th>Cap.</th><th>Affollamento</th><th>Azioni</th></tr></thead>
          <tbody>
            {pois.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{p.latitudine.toFixed(4)}, {p.longitudine.toFixed(4)}</td>
                <td>{p.capacitaMax}</td>
                <td><span className={`crowding-dot ${p.statoAffollamento}`} /> {{ verde: 'Basso', giallo: 'Medio', rosso: 'Elevato' }[p.statoAffollamento] ?? p.statoAffollamento}</td>
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
