import { useEffect, useMemo, useState } from 'react';
import { InteractiveMapCard } from '../components/ui/InteractiveMapCard';
import { getEventCalendarUrl, getEvents, getToken, googleCalendarUrl, reportEvent, type ApiEvent } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import type { AppUser } from '../data/mockUser';

function formatDateTime(value: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDay(value: string | null) {
  if (!value) return 'Da definire';
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(value));
}

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'altro'];

function eventCrowdLevel(event: ApiEvent) {
  return event.isCertified ? 68 : 44;
}

export function EventsPage({ certifiedOnly = false, user }: { certifiedOnly?: boolean; user?: AppUser }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0]);
  const [reportMsg, setReportMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'certified'>('all');

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

  useEffect(() => {
    if (!selectedEvent) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedEvent]);

  const visibleEvents = useMemo(
    () => events.filter((event) => {
      if (certifiedOnly && !event.isCertified) return false;
      if (timeFilter === 'certified' && !event.isCertified) return false;
      if (timeFilter === 'today' && event.dateTime) {
        const eventDate = new Date(event.dateTime);
        const today = new Date();
        if (
          eventDate.getFullYear() !== today.getFullYear()
          || eventDate.getMonth() !== today.getMonth()
          || eventDate.getDate() !== today.getDate()
        ) return false;
      }
      if (hasInterests && user?.interessi && event.category) {
        return user.interessi.includes(event.category);
      }
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return `${event.title} ${event.description || ''} ${event.category} ${event.location || ''}`.toLowerCase().includes(q);
    }),
    [certifiedOnly, events, hasInterests, search, timeFilter, user],
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

  const featuredEvent = visibleEvents[0];
  const timelineEvents = visibleEvents.slice(0, 5);

  function renderEventCard(event: ApiEvent, className = '') {
    return (
      <InteractiveMapCard
        key={event.id}
        id={event.id}
        className={`activity-card ${className}`}
        onSelect={() => setSelectedEvent(event)}
        map={{
          latitude: event.latitude,
          longitude: event.longitude,
          title: event.title,
          category: event.category,
          description: event.description || 'Nessuna descrizione disponibile.',
          dateTime: event.dateTime,
          type: 'event',
          crowdLevel: eventCrowdLevel(event),
        }}
      >
        <div className="interactive-map-card-header">
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
          <CalendarButton
            icsUrl={getEventCalendarUrl(event.id)}
            icsFilename={`${event.title}.ics`}
            googleUrl={googleCalendarUrl(event.title, event.dateTime, event.location)}
          />
        )}
        <div className="card-actions-row">
          <button className="detail-link" type="button" onClick={() => setSelectedEvent(event)}>Apri anteprima</button>
          {isLoggedIn && reportMsg?.id !== event.id && (
            reportingId === event.id ? (
              <div className="report-controls">
                <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value)}>
                  {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="danger-button compact-button" onClick={() => submitReport(event.id)}>Invia</button>
                <button className="ghost-button compact-button" onClick={() => setReportingId(null)}>Annulla</button>
              </div>
            ) : (
              <button className="ghost-button compact-button" onClick={() => { setReportingId(event.id); setReportMsg(null); }}>Segnala</button>
            )
          )}
          {reportMsg?.id === event.id && (
            <small className={reportMsg.ok ? 'success-message' : 'error-message'}>{reportMsg.text}</small>
          )}
        </div>
      </InteractiveMapCard>
    );
  }

  const stateContent = (
    <>
      {isLoading && <div className="state-panel liquid-panel">Caricamento eventi...</div>}
      {error && (
        <div className="state-panel liquid-panel">
          <p>{error}</p>
          <button onClick={loadEvents} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && visibleEvents.length === 0 && (
        <div className="state-panel liquid-panel">Nessun evento trovato nel database.</div>
      )}
    </>
  );

  const eventPopup = selectedEvent && (
    <div className="activity-popup-backdrop event-popup-backdrop" role="presentation" onClick={() => setSelectedEvent(null)}>
      <article
        className="activity-popup event-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="activity-popup-close" type="button" onClick={() => setSelectedEvent(null)} aria-label="Chiudi">
          ×
        </button>
        <span className="section-eyebrow">{selectedEvent.isCertified ? 'Evento certificato' : selectedEvent.category}</span>
        <h2 id="event-popup-title">{selectedEvent.title}</h2>
        <p>{selectedEvent.description || 'Nessuna descrizione disponibile.'}</p>
        <dl>
          <div><dt>Categoria</dt><dd>{selectedEvent.category}</dd></div>
          <div><dt>Luogo</dt><dd>{selectedEvent.location || 'Non specificato'}</dd></div>
          <div><dt>Quando</dt><dd>{formatDateTime(selectedEvent.dateTime)}</dd></div>
        </dl>
        <div className="activity-popup-actions">
          {selectedEvent.dateTime && (
            <CalendarButton
              icsUrl={getEventCalendarUrl(selectedEvent.id)}
              icsFilename={`${selectedEvent.title}.ics`}
              googleUrl={googleCalendarUrl(selectedEvent.title, selectedEvent.dateTime, selectedEvent.location)}
            />
          )}
          {isLoggedIn && reportMsg?.id !== selectedEvent.id && (
            reportingId === selectedEvent.id ? (
              <div className="report-controls">
                <select value={reportTipo} onChange={(event) => setReportTipo(event.target.value)}>
                  {REPORT_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="danger-button compact-button" type="button" onClick={() => submitReport(selectedEvent.id)}>Invia</button>
                <button className="ghost-button compact-button" type="button" onClick={() => setReportingId(null)}>Annulla</button>
              </div>
            ) : (
              <button className="ghost-button" type="button" onClick={() => { setReportingId(selectedEvent.id); setReportMsg(null); }}>Segnala</button>
            )
          )}
          <button className="ghost-button" type="button" onClick={() => setSelectedEvent(null)}>Chiudi</button>
          {reportMsg?.id === selectedEvent.id && (
            <small className={reportMsg.ok ? 'success-message' : 'error-message'}>{reportMsg.text}</small>
          )}
        </div>
      </article>
    </div>
  );

  if (certifiedOnly) {
    return (
      <section className="certified-page">
        <header className="certified-hero">
          <label className="city-search">
            <span>Cerca</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cerca eventi certificati" />
          </label>
          <div className="time-filter" aria-label="Filtri certificati">
            <button className={timeFilter === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('all')}>Tutti</button>
            <button className={timeFilter === 'today' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('today')}>Oggi</button>
          </div>
          <button className="refresh-button" onClick={loadEvents} type="button">Aggiorna</button>
        </header>

        {stateContent}

        {!isLoading && !error && visibleEvents.length > 0 && (
          <div className="certified-layout">
            <aside className="certified-trust-panel">
              <strong>{visibleEvents.length} eventi verificati</strong>
              <ul>
                <li>Identità ente controllata</li>
                <li>Informazioni calendario pronte</li>
                <li>Segnalazione sempre disponibile</li>
              </ul>
            </aside>
            <div className="certified-registry">
              {visibleEvents.map((event) => renderEventCard(event, 'certified-event-card'))}
            </div>
          </div>
        )}
        {eventPopup}
      </section>
    );
  }

  return (
    <section className="events-page">
      <header className="events-hero">
        <label className="city-search">
          <span>Cerca</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Cerca evento, luogo, categoria" />
        </label>
        <div className="time-filter" aria-label="Filtri eventi">
          <button className={timeFilter === 'all' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('all')}>Tutti</button>
          <button className={timeFilter === 'today' ? 'active-filter' : undefined} type="button" onClick={() => setTimeFilter('today')}>Oggi</button>
        </div>
        <button className="refresh-button" onClick={loadEvents} type="button">Aggiorna</button>
      </header>

      {stateContent}

      {!isLoading && !error && visibleEvents.length > 0 && (
        <div className="event-editorial-layout">
          {featuredEvent && (
            <article className="event-feature-story">
              <div className="event-date-tile">
                <strong>{formatDay(featuredEvent.dateTime)}</strong>
                <span>{formatDateTime(featuredEvent.dateTime)}</span>
              </div>
              <div>
                <div className="feature-badges" aria-label="Stato evento">
                  <span>{featuredEvent.category}</span>
                  {featuredEvent.isCertified && <span>Certificato</span>}
                </div>
                <h2>{featuredEvent.title}</h2>
                <p>{featuredEvent.description || 'Nessuna descrizione disponibile.'}</p>
                <button className="detail-link" type="button" onClick={() => setSelectedEvent(featuredEvent)}>Apri anteprima</button>
              </div>
            </article>
          )}

          <aside className="event-timeline-panel">
            <span className="section-eyebrow">Timeline</span>
            <ol>
              {timelineEvents.map((event) => (
                <li key={event.id}>
                  <time>{formatDay(event.dateTime)}</time>
                  <span>{event.title}</span>
                </li>
              ))}
            </ol>
          </aside>

          <div className="event-card-strip">
            {visibleEvents.map((event) => renderEventCard(event, 'event-explorer-card'))}
          </div>
        </div>
      )}
      {eventPopup}
    </section>
  );
}
