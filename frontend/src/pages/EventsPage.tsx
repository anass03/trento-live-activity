import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents, type ApiEvent } from '../lib/api';

function formatDateTime(value: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function EventsPage({ certifiedOnly = false }: { certifiedOnly?: boolean }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadEvents();
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => !certifiedOnly || event.isCertified),
    [certifiedOnly, events],
  );

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div>
          <h1>{certifiedOnly ? 'Eventi certificati' : 'Eventi'}</h1>
          <p>Dati caricati dal database PostgreSQL tramite API backend</p>
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
                <div>
                  <dt>Luogo</dt>
                  <dd>{event.location || 'Non specificato'}</dd>
                </div>
                <div>
                  <dt>Quando</dt>
                  <dd>{formatDateTime(event.dateTime)}</dd>
                </div>
              </dl>
              <Link className="detail-link" to={`/eventi/${event.id}`}>Apri dettagli</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
