import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createEvent, getMyEvents, type ApiEvent } from '../lib/api';

const CATEGORIES = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'altro'];

export function EntityPublishPage() {
  const [myEvents, setMyEvents] = useState<ApiEvent[]>([]);
  const [form, setForm] = useState({
    titolo: '', descrizione: '', categoria: 'cultura',
    data: '', orarioInizio: '', orarioFine: '',
    latitudine: '', longitudine: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function load() {
    getMyEvents()
      .then((r) => setMyEvents(r.events || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'));
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null); setIsLoading(true);
    try {
      await createEvent({
        titolo: form.titolo,
        descrizione: form.descrizione,
        categoria: form.categoria,
        data: form.data || undefined,
        orarioInizio: form.orarioInizio || undefined,
        orarioFine: form.orarioFine || undefined,
        latitudine: form.latitudine ? Number(form.latitudine) : undefined,
        longitudine: form.longitudine ? Number(form.longitudine) : undefined,
      });
      setMessage('Evento pubblicato — gli utenti interessati riceveranno una notifica');
      setForm({ titolo: '', descrizione: '', categoria: 'cultura', data: '', orarioInizio: '', orarioFine: '', latitudine: '', longitudine: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsLoading(false); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div><h1>Pubblica evento</h1><p>Solo per enti certificati approvati</p></div>
      </header>

      <form className="auth-form glass-card" onSubmit={handleSubmit}>
        <label>
          <span>Titolo (max 100 caratteri)</span>
          <input type="text" maxLength={100} value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} required />
        </label>
        <label>
          <span>Descrizione</span>
          <textarea rows={4} value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
        </label>
        <label>
          <span>Categoria</span>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="filter-row">
          <label><span>Data</span><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
          <label><span>Ora inizio</span><input type="time" value={form.orarioInizio} onChange={(e) => setForm({ ...form, orarioInizio: e.target.value })} /></label>
          <label><span>Ora fine</span><input type="time" value={form.orarioFine} onChange={(e) => setForm({ ...form, orarioFine: e.target.value })} /></label>
        </div>
        <div className="filter-row">
          <label><span>Latitudine</span><input type="number" step="0.000001" value={form.latitudine} onChange={(e) => setForm({ ...form, latitudine: e.target.value })} /></label>
          <label><span>Longitudine</span><input type="number" step="0.000001" value={form.longitudine} onChange={(e) => setForm({ ...form, longitudine: e.target.value })} /></label>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? 'Pubblicazione...' : 'Pubblica evento'}
        </button>
      </form>

      <div className="glass-card">
        <h2>I miei eventi pubblicati ({myEvents.length})</h2>
        {myEvents.length === 0 ? (
          <p>Non hai ancora pubblicato eventi.</p>
        ) : (
          <table className="stats-table">
            <thead><tr><th>Titolo</th><th>Categoria</th><th>Data</th><th>Dettagli</th></tr></thead>
            <tbody>
              {myEvents.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.category}</td>
                  <td>{e.dateTime ? new Date(e.dateTime).toLocaleDateString('it-IT') : '—'}</td>
                  <td><Link to={`/eventi/${e.id}`}>Apri</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
