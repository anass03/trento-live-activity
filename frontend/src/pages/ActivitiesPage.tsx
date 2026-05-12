import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActivities, type ApiActivity } from '../lib/api';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function ActivitiesPage() {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivities() {
    setIsLoading(true);
    setError(null);
    try {
      setActivities(await getActivities());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento delle attività.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActivities();
  }, []);

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div>
          <h1>Attività</h1>
          <p>Attività spontanee lette dal database tramite il backend Express</p>
        </div>
        <button className="refresh-button" onClick={loadActivities} type="button">Aggiorna</button>
      </header>

      {isLoading && <div className="state-panel glass-panel">Caricamento attività...</div>}
      {error && (
        <div className="state-panel glass-panel">
          <p>{error}</p>
          <button onClick={loadActivities} type="button">Riprova</button>
        </div>
      )}
      {!isLoading && !error && activities.length === 0 && (
        <div className="state-panel glass-panel">Nessuna attività trovata nel database.</div>
      )}
      {!isLoading && !error && activities.length > 0 && (
        <div className="data-grid">
          {activities.map((activity) => (
            <article className="data-card glass-card" key={activity.id}>
              <div className="data-card-header">
                <span>{activity.category}</span>
                <small>{activity.status || 'attiva'}</small>
              </div>
              <h2>{activity.title}</h2>
              <p>{activity.description || 'Attività spontanea organizzata dalla community.'}</p>
              <dl>
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
              <Link className="detail-link" to={`/attivita/${activity.id}`}>Apri dettagli</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
