import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createEvent, deleteEvent, getMyEvents, getPOIs, type ApiEvent, type POI } from '../lib/api';
import { POIMapPicker } from '../components/map/POIMapPicker';

const CATEGORIES = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'altro'];

interface FormState {
  titolo: string;
  descrizione: string;
  categoria: string;
  data: string;
  orarioInizio: string;
  orarioFine: string;
  latitudine: string;
  longitudine: string;
  poiId: string;
  maxPartecipanti: string;
}

const EMPTY_FORM: FormState = {
  titolo: '', descrizione: '', categoria: 'cultura',
  data: '', orarioInizio: '', orarioFine: '',
  latitudine: '', longitudine: '', poiId: '', maxPartecipanti: '',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EntityPublishPage() {
  const [myEvents, setMyEvents] = useState<ApiEvent[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function load() {
    getMyEvents()
      .then((r) => setMyEvents(r.events || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'));
    getPOIs().then(setPois).catch(() => { /* ignore */ });
  }
  useEffect(load, []);

  // Sync coordinate quando si seleziona un POI esistente
  function selectPoi(poiId: string) {
    if (!poiId) {
      setForm((f) => ({ ...f, poiId: '' }));
      return;
    }
    const poi = pois.find((p) => p.id === poiId);
    if (poi) {
      setForm((f) => ({
        ...f,
        poiId,
        latitudine: String(poi.latitudine),
        longitudine: String(poi.longitudine),
      }));
    }
  }

  // ── Validazioni client (anche il backend ricontrolla) ──
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (form.titolo.length === 0) errs.push('Titolo obbligatorio');
    if (form.titolo.length > 100) errs.push('Titolo: max 100 caratteri (OCL C17)');
    if (form.data && form.data < todayISO()) errs.push('Data nel passato non ammessa');
    if (form.orarioInizio && form.orarioFine && form.orarioInizio >= form.orarioFine) {
      errs.push('Ora fine deve essere dopo Ora inizio');
    }
    if (!form.latitudine || !form.longitudine) {
      errs.push('Posizione obbligatoria (scegli un POI esistente o clicca sulla mappa)');
    }
    if (form.maxPartecipanti && (Number(form.maxPartecipanti) < 1)) {
      errs.push('maxPartecipanti deve essere ≥ 1');
    }
    return errs;
  }, [form]);

  async function handleDelete(eventId: string, titolo: string) {
    if (!window.confirm(`Eliminare definitivamente l'evento "${titolo}"? L'azione non è reversibile.`)) return;
    setError(null); setMessage(null);
    try {
      await deleteEvent(eventId);
      setMessage('Evento eliminato.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore eliminazione');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    setIsLoading(true);
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
        poiId: form.poiId || undefined,
        maxPartecipanti: form.maxPartecipanti ? Number(form.maxPartecipanti) : undefined,
      });
      setMessage('Evento pubblicato — gli utenti interessati riceveranno una notifica.');
      setForm(EMPTY_FORM);
      setShowPreview(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsLoading(false); }
  }

  const canSubmit = validationErrors.length === 0 && !isLoading;
  const selectedPoi = pois.find((p) => p.id === form.poiId);

  return (
    <section className="data-page entity-publish-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Pubblica evento</h1>
          <p>Riservato agli enti certificati approvati. L'evento sarà visibile a tutti con badge verifica.</p>
        </div>
      </header>

      <div className="publish-layout">
        <form className="auth-form liquid-card publish-form" onSubmit={handleSubmit}>
          <h2>Nuovo evento</h2>

          <label>
            <span>Titolo <small className="muted-copy">({form.titolo.length}/100)</small></span>
            <input
              type="text"
              maxLength={100}
              value={form.titolo}
              onChange={(ev) => setForm({ ...form, titolo: ev.target.value })}
              required
              placeholder="Es: Mostra fotografica al Castello"
            />
          </label>

          <label>
            <span>Descrizione</span>
            <textarea
              rows={4}
              value={form.descrizione}
              onChange={(ev) => setForm({ ...form, descrizione: ev.target.value })}
              placeholder="Descrivi l'evento in dettaglio. Sarà visibile ai cittadini."
            />
          </label>

          <div className="filter-row">
            <label>
              <span>Categoria</span>
              <select value={form.categoria} onChange={(ev) => setForm({ ...form, categoria: ev.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span>Max partecipanti (opz.)</span>
              <input
                type="number"
                min={1}
                value={form.maxPartecipanti}
                onChange={(ev) => setForm({ ...form, maxPartecipanti: ev.target.value })}
                placeholder="Vuoto = senza limite"
              />
            </label>
          </div>

          <div className="filter-row">
            <label>
              <span>Data</span>
              <input
                type="date"
                min={todayISO()}
                value={form.data}
                onChange={(ev) => setForm({ ...form, data: ev.target.value })}
              />
            </label>
            <label>
              <span>Ora inizio</span>
              <input type="time" value={form.orarioInizio} onChange={(ev) => setForm({ ...form, orarioInizio: ev.target.value })} />
            </label>
            <label>
              <span>Ora fine</span>
              <input type="time" value={form.orarioFine} onChange={(ev) => setForm({ ...form, orarioFine: ev.target.value })} />
            </label>
          </div>

          {/* ── Posizione: scegli POI esistente OPPURE clicca sulla mappa ── */}
          <fieldset className="publish-location">
            <legend>Posizione</legend>
            <label>
              <span>POI esistente (consigliato)</span>
              <select value={form.poiId} onChange={(ev) => selectPoi(ev.target.value)}>
                <option value="">— Scegli un POI o clicca sulla mappa —</option>
                {pois.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <div className="poi-location-row">
              <div className="poi-location-info">
                <span className="poi-location-label">Coordinate selezionate</span>
                {form.latitudine && form.longitudine ? (
                  <code>{Number(form.latitudine).toFixed(6)}, {Number(form.longitudine).toFixed(6)}</code>
                ) : (
                  <em>Nessuna posizione selezionata</em>
                )}
              </div>
              <button type="button" className="ghost-button" onClick={() => setShowPicker(true)}>
                📍 Scegli sulla mappa
              </button>
            </div>
          </fieldset>

          {validationErrors.length > 0 && (
            <ul className="form-validation-list">
              {validationErrors.map((v) => <li key={v}>⚠ {v}</li>)}
            </ul>
          )}
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="filter-actions">
            <button type="button" className="ghost-button" onClick={() => setShowPreview(true)} disabled={validationErrors.length > 0}>
              👁 Anteprima
            </button>
            <button type="submit" className="primary-button" disabled={!canSubmit}>
              {isLoading ? 'Pubblicazione…' : 'Pubblica evento'}
            </button>
          </div>
        </form>

        <aside className="publish-summary liquid-card">
          <h3>Riepilogo</h3>
          <dl>
            <div><dt>Titolo</dt><dd>{form.titolo || <em className="muted-copy">—</em>}</dd></div>
            <div><dt>Categoria</dt><dd>{form.categoria}</dd></div>
            <div><dt>Data</dt><dd>{form.data || <em className="muted-copy">—</em>}</dd></div>
            <div><dt>Orario</dt><dd>{form.orarioInizio || '—'} → {form.orarioFine || '—'}</dd></div>
            <div><dt>Luogo</dt><dd>{selectedPoi ? selectedPoi.nome : (form.latitudine ? 'Punto su mappa' : <em className="muted-copy">—</em>)}</dd></div>
            <div><dt>Capienza</dt><dd>{form.maxPartecipanti || <em className="muted-copy">illimitata</em>}</dd></div>
          </dl>
          <small className="muted-copy">
            L'evento ottiene il badge verifica e viene mostrato ai cittadini con gli interessi corrispondenti.
          </small>
        </aside>
      </div>

      <div className="liquid-card">
        <h2>I miei eventi pubblicati ({myEvents.length})</h2>
        {myEvents.length === 0 ? (
          <p>Non hai ancora pubblicato eventi.</p>
        ) : (
          <table className="stats-table">
            <thead><tr><th>Titolo</th><th>Categoria</th><th>Data</th><th>Partecipanti</th><th>Azioni</th></tr></thead>
            <tbody>
              {myEvents.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.category}</td>
                  <td>{e.dateTime ? new Date(e.dateTime).toLocaleDateString('it-IT') : '—'}</td>
                  <td>{e.participantCount ?? 0}{e.maxPartecipanti ? ` / ${e.maxPartecipanti}` : ''}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/eventi/${e.id}`}>Apri</Link>
                    <button
                      type="button"
                      className="danger-button compact-button"
                      onClick={() => handleDelete(e.id, e.title)}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPicker && (
        <POIMapPicker
          initial={{
            latitudine: form.latitudine ? Number(form.latitudine) : undefined,
            longitudine: form.longitudine ? Number(form.longitudine) : undefined,
          }}
          onCancel={() => setShowPicker(false)}
          onConfirm={(coords) => {
            setForm((f) => ({
              ...f,
              poiId: '', // se l'utente clicca manualmente, scollegalo dal POI
              latitudine: String(coords.latitudine),
              longitudine: String(coords.longitudine),
            }));
            setShowPicker(false);
          }}
        />
      )}

      {showPreview && (
        <div className="activity-popup-backdrop" role="presentation" onClick={() => setShowPreview(false)}>
          <article className="activity-popup" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
            <button className="activity-popup-close" type="button" onClick={() => setShowPreview(false)} aria-label="Chiudi">×</button>
            <span className="section-eyebrow">Anteprima evento</span>
            <h2>{form.titolo}</h2>
            <p>{form.descrizione || 'Nessuna descrizione disponibile.'}</p>
            <dl>
              <div><dt>Categoria</dt><dd>{form.categoria}</dd></div>
              <div><dt>Data</dt><dd>{form.data ? new Date(form.data).toLocaleDateString('it-IT') : '—'}</dd></div>
              <div><dt>Orario</dt><dd>{form.orarioInizio || '—'} → {form.orarioFine || '—'}</dd></div>
              <div><dt>Luogo</dt><dd>{selectedPoi ? selectedPoi.nome : 'Punto sulla mappa'}</dd></div>
              {form.maxPartecipanti && <div><dt>Capienza</dt><dd>{form.maxPartecipanti}</dd></div>}
            </dl>
            <div className="filter-actions">
              <button type="button" className="ghost-button" onClick={() => setShowPreview(false)}>Modifica</button>
              <button type="button" className="primary-button" onClick={handleSubmit}>Pubblica ora</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
