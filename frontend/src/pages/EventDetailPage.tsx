import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEventById, type ApiEvent } from '../lib/api';

function formatDateTime(value: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <section className="detail-page glass-panel">
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
        </>
      )}
    </section>
  );
}
