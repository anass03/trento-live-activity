import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEvent, deleteEvent, getMyEvents, getPOIs, type ApiEvent, type POI } from '../lib/api';
import { POIMapPicker } from '../components/map/POIMapPicker';
import { GeocodedLocation } from '../components/ui/GeocodedLocation';
import { formatDate } from '../lib/formatters';

const CATEGORIES = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'altro'];

interface FormState {
  titolo: string; descrizione: string; categoria: string;
  data: string; orarioInizio: string; orarioFine: string;
  latitudine: string; longitudine: string; poiId: string; maxPartecipanti: string;
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
  const { t } = useTranslation();
  const [myEvents, setMyEvents] = useState<ApiEvent[]>([]);
  const [pois, setPois] = useState<POI[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function load() {
    getMyEvents().then((r) => setMyEvents(r.events || [])).catch((e) => setError(e instanceof Error ? e.message : t('common.error')));
    getPOIs().then(setPois).catch(() => { /* ignore */ });
  }
  useEffect(load, []);

  function selectPoi(poiId: string) {
    if (!poiId) { setForm((f) => ({ ...f, poiId: '' })); return; }
    const poi = pois.find((p) => p.id === poiId);
    if (poi) setForm((f) => ({ ...f, poiId, latitudine: String(poi.latitudine), longitudine: String(poi.longitudine) }));
  }

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (form.titolo.length === 0) errs.push(t('entity.validation.titleRequired'));
    if (form.titolo.length > 100) errs.push(t('entity.validation.titleTooLong'));
    if (form.data && form.data < todayISO()) errs.push(t('entity.validation.datePast'));
    if (form.orarioInizio && form.orarioFine && form.orarioInizio >= form.orarioFine) errs.push(t('entity.validation.endBeforeStart'));
    if (!form.latitudine || !form.longitudine) errs.push(t('entity.validation.positionRequired'));
    if (form.maxPartecipanti && Number(form.maxPartecipanti) < 1) errs.push(t('entity.validation.maxParticipants'));
    return errs;
  }, [form, t]);

  async function handleDelete(eventId: string, titolo: string) {
    if (!window.confirm(t('entity.deleteConfirm', { title: titolo }))) return;
    setError(null); setMessage(null);
    try { await deleteEvent(eventId); setMessage(t('entity.deleted')); load(); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (validationErrors.length > 0) { setError(validationErrors[0]); return; }
    setIsLoading(true);
    try {
      await createEvent({
        titolo: form.titolo, descrizione: form.descrizione, categoria: form.categoria,
        data: form.data || undefined, orarioInizio: form.orarioInizio || undefined,
        orarioFine: form.orarioFine || undefined,
        latitudine: form.latitudine ? Number(form.latitudine) : undefined,
        longitudine: form.longitudine ? Number(form.longitudine) : undefined,
        poiId: form.poiId || undefined,
        maxPartecipanti: form.maxPartecipanti ? Number(form.maxPartecipanti) : undefined,
      });
      setMessage(t('entity.published'));
      setForm(EMPTY_FORM); setShowPreview(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setIsLoading(false); }
  }

  const canSubmit = validationErrors.length === 0 && !isLoading;
  const selectedPoi = pois.find((p) => p.id === form.poiId);

  return (
    <section className="data-page entity-publish-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('entity.publishTitle')}</h1>
          <p>{t('entity.publishSubtitle')}</p>
        </div>
      </header>

      <div className="publish-layout">
        <form className="auth-form liquid-card publish-form" onSubmit={handleSubmit}>
          <h2>{t('entity.newEvent')}</h2>

          <label>
            <span>{t('entity.titleField')} <small className="muted-copy">({form.titolo.length}/100)</small></span>
            <input type="text" maxLength={100} value={form.titolo} onChange={(ev) => setForm({ ...form, titolo: ev.target.value })} required placeholder="Es: Mostra fotografica al Castello" />
          </label>

          <label>
            <span>{t('entity.descriptionField')}</span>
            <textarea rows={4} value={form.descrizione} onChange={(ev) => setForm({ ...form, descrizione: ev.target.value })} placeholder={t('entity.descriptionPlaceholder')} />
          </label>

          <div className="filter-row">
            <label>
              <span>{t('entity.category')}</span>
              <select value={form.categoria} onChange={(ev) => setForm({ ...form, categoria: ev.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <span>{t('entity.maxParticipants')}</span>
              <input type="number" min={1} value={form.maxPartecipanti} onChange={(ev) => setForm({ ...form, maxPartecipanti: ev.target.value })} placeholder={t('entity.noLimit')} />
            </label>
          </div>

          <div className="filter-row">
            <label><span>{t('entity.date')}</span><input type="date" min={todayISO()} value={form.data} onChange={(ev) => setForm({ ...form, data: ev.target.value })} /></label>
            <label><span>{t('entity.startTime')}</span><input type="time" value={form.orarioInizio} onChange={(ev) => setForm({ ...form, orarioInizio: ev.target.value })} /></label>
            <label><span>{t('entity.endTime')}</span><input type="time" value={form.orarioFine} onChange={(ev) => setForm({ ...form, orarioFine: ev.target.value })} /></label>
          </div>

          <fieldset className="publish-location">
            <legend>{t('entity.position')}</legend>
            <label>
              <span>{t('entity.existingPOI')}</span>
              <select value={form.poiId} onChange={(ev) => selectPoi(ev.target.value)}>
                <option value="">{t('entity.choosePOI')}</option>
                {pois.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <div className="poi-location-row">
              <div className="poi-location-info">
                <span className="poi-location-label">{t('entity.selectedPosition')}</span>
                {form.latitudine && form.longitudine ? (
                  <>
                    <GeocodedLocation value={`${Number(form.latitudine).toFixed(4)}, ${Number(form.longitudine).toFixed(4)}`} />
                    <code style={{ fontSize: 11, opacity: 0.6 }}>{Number(form.latitudine).toFixed(6)}, {Number(form.longitudine).toFixed(6)}</code>
                  </>
                ) : (
                  <em>{t('entity.noPosition')}</em>
                )}
              </div>
              <button type="button" className="ghost-button" onClick={() => setShowPicker(true)}>{t('entity.chooseOnMap')}</button>
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
            <button type="button" className="ghost-button" onClick={() => setShowPreview(true)} disabled={validationErrors.length > 0}>{t('entity.preview')}</button>
            <button type="submit" className="primary-button" disabled={!canSubmit}>{isLoading ? t('entity.publishing') : t('entity.publish')}</button>
          </div>
        </form>

        <aside className="publish-summary liquid-card">
          <h3>{t('entity.summary')}</h3>
          <dl>
            <div><dt>{t('entity.titleField')}</dt><dd>{form.titolo || <em className="muted-copy">—</em>}</dd></div>
            <div><dt>{t('entity.category')}</dt><dd>{form.categoria}</dd></div>
            <div><dt>{t('entity.date')}</dt><dd>{form.data || <em className="muted-copy">—</em>}</dd></div>
            <div><dt>{t('entity.summaryTime')}</dt><dd>{form.orarioInizio || '—'} → {form.orarioFine || '—'}</dd></div>
            <div><dt>{t('entity.summaryPlace')}</dt><dd>{selectedPoi ? selectedPoi.nome : (form.latitudine ? t('entity.pointOnMap') : <em className="muted-copy">—</em>)}</dd></div>
            <div><dt>{t('entity.summaryCapacity')}</dt><dd>{form.maxPartecipanti || <em className="muted-copy">{t('entity.unlimited')}</em>}</dd></div>
          </dl>
          <small className="muted-copy">{t('entity.badgeHint')}</small>
        </aside>
      </div>

      <div className="liquid-card">
        <h2>{t('entity.myEvents', { count: myEvents.length })}</h2>
        {myEvents.length === 0 ? (
          <p>{t('entity.noEvents')}</p>
        ) : (
          <table className="stats-table">
            <thead><tr><th>{t('entity.colTitle')}</th><th>{t('common.category')}</th><th>{t('entity.colDate')}</th><th>{t('entity.colParticipants')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>
              {myEvents.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.category}</td>
                  <td>{e.dateTime ? formatDate(e.dateTime) : '—'}</td>
                  <td>{e.participantCount ?? 0}{e.maxPartecipanti ? ` / ${e.maxPartecipanti}` : ''}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/eventi/${e.id}`}>{t('common.open')}</Link>
                    <button type="button" className="danger-button compact-button" onClick={() => handleDelete(e.id, e.title)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPicker && (
        <POIMapPicker
          initial={{ latitudine: form.latitudine ? Number(form.latitudine) : undefined, longitudine: form.longitudine ? Number(form.longitudine) : undefined }}
          onCancel={() => setShowPicker(false)}
          onConfirm={(coords) => {
            setForm((f) => ({ ...f, poiId: '', latitudine: String(coords.latitudine), longitudine: String(coords.longitudine) }));
            setShowPicker(false);
          }}
        />
      )}

      {showPreview && (
        <div className="activity-popup-backdrop" role="presentation" onClick={() => setShowPreview(false)}>
          <article className="activity-popup" role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
            <button className="activity-popup-close" type="button" onClick={() => setShowPreview(false)} aria-label={t('common.close')}>×</button>
            <span className="section-eyebrow">{t('entity.previewTitle')}</span>
            <h2>{form.titolo}</h2>
            <p>{form.descrizione || t('events.noDescription')}</p>
            <dl>
              <div><dt>{t('common.category')}</dt><dd>{form.categoria}</dd></div>
              <div><dt>{t('entity.date')}</dt><dd>{form.data ? formatDate(form.data) : '—'}</dd></div>
              <div><dt>{t('entity.summaryTime')}</dt><dd>{form.orarioInizio || '—'} → {form.orarioFine || '—'}</dd></div>
              <div><dt>{t('entity.summaryPlace')}</dt><dd>{selectedPoi ? selectedPoi.nome : t('entity.pointOnMap')}</dd></div>
              {form.maxPartecipanti && <div><dt>{t('entity.summaryCapacity')}</dt><dd>{form.maxPartecipanti}</dd></div>}
            </dl>
            <div className="filter-actions">
              <button type="button" className="ghost-button" onClick={() => setShowPreview(false)}>{t('entity.editAction')}</button>
              <button type="button" className="primary-button" onClick={handleSubmit}>{t('entity.publishNow')}</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
