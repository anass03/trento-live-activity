import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getEventById, getEventCalendarUrl, googleCalendarUrl, getToken,
  joinEvent, leaveEvent, reportEvent,
  type ApiEvent,
} from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
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
  const [participating, setParticipating] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';
  const userId = user?.id;
  const isCitizen = user?.role === 'registered_user';

  const isJoined = !!(userId && event?.participantIds?.includes(userId));
  const isPast = event?.dateTime ? new Date(event.dateTime) < new Date() : false;
  const isFull = !!(event?.maxPartecipanti && event.participantCount !== undefined
    && event.participantCount >= event.maxPartecipanti);

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

  async function handleJoin() {
    if (!id) return;
    setPartError(null);
    setParticipating(true);
    try {
      const result = await joinEvent(id);
      setEvent((prev) => prev && userId ? {
        ...prev,
        participantCount: result.participantCount,
        participantIds: [...(prev.participantIds || []), userId],
      } : prev);
    } catch (e) {
      setPartError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setParticipating(false);
    }
  }

  async function handleLeave() {
    if (!id) return;
    setPartError(null);
    setParticipating(true);
    try {
      const result = await leaveEvent(id);
      setEvent((prev) => prev && userId ? {
        ...prev,
        participantCount: result.participantCount,
        participantIds: (prev.participantIds || []).filter((p) => p !== userId),
      } : prev);
    } catch (e) {
      setPartError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setParticipating(false);
    }
  }

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
            {(event.maxPartecipanti !== null && event.maxPartecipanti !== undefined) && (
              <div>
                <dt>Partecipanti</dt>
                <dd>{event.participantCount ?? 0} / {event.maxPartecipanti}</dd>
              </div>
            )}
          </dl>

          {isCitizen && (
            <div className="event-participate-row">
              {isPast ? (
                <span className="muted-copy">Evento concluso</span>
              ) : isJoined ? (
                <button
                  type="button"
                  className="ghost-button"
                  disabled={participating}
                  onClick={handleLeave}
                >
                  {participating ? '...' : 'Annulla partecipazione'}
                </button>
              ) : isFull ? (
                <span className="muted-copy">Posti esauriti</span>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  disabled={participating}
                  onClick={handleJoin}
                >
                  {participating ? '...' : 'Partecipa all\'evento'}
                </button>
              )}
              {partError && <p className="form-error" style={{ margin: 0 }}>{partError}</p>}
            </div>
          )}
          {event.dateTime && (
            <CalendarButton
              icsUrl={getEventCalendarUrl(event.id)}
              icsFilename={`${event.title}.ics`}
              googleUrl={googleCalendarUrl(event.title, event.dateTime, event.location)}
              label="Aggiungi al calendario"
            />
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
