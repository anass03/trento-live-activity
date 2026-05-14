import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEventById, getEventCalendarUrl, getToken, reportEvent, type ApiEvent } from '../lib/api';
import type { AppUser } from '../data/mockUser';

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'altro'];

function formatDateTime(value: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function EventDetailPage({ user }: { user?: AppUser }) {
  const { id } = useParams();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0]);
  const [reportMsg, setReportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';

  async function loadEvent() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      setEvent(await getEventById(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento del dettaglio evento.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEvent();
  }, [id]);

  return (
    <section className="detail-page liquid-panel">
      <Link className="back-link" to="/eventi">Torna agli eventi</Link>
      {isLoading && <p>Caricamento evento...</p>}
      {error && (
        <div className="state-inline">
          <p>{error}</p>
          <button onClick={loadEvent} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && event && (
        <>
          <div className="data-card-header">
            <span>{event.category}</span>
            {event.isCertified && <small className="badge">Certificato</small>}
          </div>
          <h1>{event.title}</h1>
          <p>{event.description || 'Nessuna descrizione disponibile.'}</p>
          <dl className="detail-list">
            <div>
              <dt>Luogo</dt>
              <dd>{event.location || 'Non specificato'}</dd>
            </div>
            <div>
              <dt>Quando</dt>
              <dd>{formatDateTime(event.dateTime)}</dd>
            </div>
          </dl>
          {event.dateTime && (
            <a href={getEventCalendarUrl(event.id)} download={`${event.title}.ics`} className="primary-button">Aggiungi al calendario</a>
          )}
          {isLoggedIn && !reportMsg && (
            reporting ? (
              <div className="inline-form-row">
                <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value)}>
                  {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="danger-button" onClick={async () => { try { await reportEvent(id!, reportTipo); setReportMsg({ ok: true, text: 'Segnalazione inviata.' }); } catch (e) { setReportMsg({ ok: false, text: e instanceof Error ? e.message : 'Errore' }); } finally { setReporting(false); } }}>Invia segnalazione</button>
                <button className="ghost-button" onClick={() => setReporting(false)}>Annulla</button>
              </div>
            ) : (
              <button className="ghost-button" onClick={() => setReporting(true)}>Segnala evento</button>
            )
          )}
          {reportMsg && <p className={reportMsg.ok ? 'success-message' : 'error-message'}>{reportMsg.text}</p>}
        </>
      )}
    </section>
  );
}
