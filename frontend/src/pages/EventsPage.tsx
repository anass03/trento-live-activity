import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEventCalendarUrl, googleCalendarUrl, getEvents, getToken, reportEvent, type ApiEvent } from '../lib/api';
import type { AppUser } from '../data/mockUser';

function formatDateTime(value: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'altro'];

export function EventsPage({ certifiedOnly = false, user }: { certifiedOnly?: boolean; user?: AppUser }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0]);
  const [reportMsg, setReportMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';
  const hasInterests = Array.isArray(user?.interessi) && (user!.interessi!.length ?? 0) > 0;

  async function loadEvents() {
    setIsLoading(true);
    setError(null);
    try {
      setEvents(await getEvents());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento degli eventi.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadEvents(); }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => {
      if (certifiedOnly && !event.isCertified) return false;
      if (hasInterests && user?.interessi && event.category) {
        return user.interessi.includes(event.category);
      }
      return true;
    }),
    [certifiedOnly, events, hasInterests, user],
  );

  async function submitReport(eventId: string) {
    try {
      await reportEvent(eventId, reportTipo);
      setReportMsg({ id: eventId, ok: true, text: 'Segnalazione inviata.' });
    } catch (e) {
      setReportMsg({ id: eventId, ok: false, text: e instanceof Error ? e.message : 'Errore' });
    } finally {
      setReportingId(null);
    }
  }

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div>
          <h1>{certifiedOnly ? 'Eventi certificati' : 'Eventi'}</h1>
          <p>{hasInterests ? `Filtrati per i tuoi interessi: ${user?.interessi?.join(', ')}` : 'Dati caricati dal database PostgreSQL tramite API backend'}</p>
        </div>
        <button className="refresh-button" onClick={loadEvents} type="button">Aggiorna</button>
      </header>

      {isLoading && <div className="state-panel glass-panel">Caricamento eventi...</div>}
      {error && (
        <div className="state-panel glass-panel">
          <p>{error}</p>
          <button onClick={loadEvents} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && visibleEvents.length === 0 && (
        <div className="state-panel glass-panel">Nessun evento trovato nel database.</div>
      )}
      {!isLoading && !error && visibleEvents.length > 0 && (
        <div className="data-grid">
          {visibleEvents.map((event) => (
            <article className="data-card glass-card" key={event.id}>
              <div className="data-card-header">
                <span>{event.category}</span>
                {event.isCertified && <small className="badge">Certificato</small>}
              </div>
              <h2>{event.title}</h2>
              <p>{event.description || 'Nessuna descrizione disponibile.'}</p>
              <dl>
                <div><dt>Luogo</dt><dd>{event.location || 'Non specificato'}</dd></div>
                <div><dt>Quando</dt><dd>{formatDateTime(event.dateTime)}</dd></div>
              </dl>
              {event.dateTime && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={getEventCalendarUrl(event.id)} download={`${event.title}.ics`} style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>📅 Apple / Outlook</a>
                  <a href={googleCalendarUrl(event.title, event.dateTime, event.location)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>📅 Google Calendar</a>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <Link className="detail-link" to={`/eventi/${event.id}`}>Apri dettagli</Link>
                {isLoggedIn && reportMsg?.id !== event.id && (
                  reportingId === event.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-glass-border)', color: 'inherit', borderRadius: 6, padding: '4px 8px', font: 'inherit', fontSize: 12 }}>
                        {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                      </select>
                      <button className="danger-button" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => submitReport(event.id)}>Invia</button>
                      <button onClick={() => setReportingId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReportingId(event.id); setReportMsg(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>🚩 Segnala</button>
                  )
                )}
                {reportMsg?.id === event.id && (
                  <small style={{ color: reportMsg.ok ? '#d2ffe6' : '#ffd0d0' }}>{reportMsg.text}</small>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
