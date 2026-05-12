import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getActivityById, type ApiActivity } from '../lib/api';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function ActivityDetailPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivity() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      setActivity(await getActivityById(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento del dettaglio attività.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, [id]);

  return (
    <section className="detail-page glass-panel">
      <Link className="back-link" to="/attivita">Torna alle attività</Link>
      {isLoading && <p>Caricamento attività...</p>}
      {error && (
        <div className="state-inline">
          <p>{error}</p>
          <button onClick={loadActivity} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && activity && (
        <>
          <div className="data-card-header">
            <span>{activity.category}</span>
            <small>{activity.status || 'attiva'}</small>
          </div>
          <h1>{activity.title}</h1>
          <p>{activity.description || 'Attività spontanea organizzata dalla community.'}</p>
          <dl className="detail-list">
            <div>
              <dt>Luogo</dt>
              <dd>{activity.location || 'Non specificato'}</dd>
            </div>
            <div>
              <dt>Quando</dt>
              <dd>{formatDateTime(activity.dateTime)}</dd>
            </div>
            <div>
              <dt>Partecipanti</dt>
              <dd>{activity.participantCount} / {activity.maxParticipants}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
