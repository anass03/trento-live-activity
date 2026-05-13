import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActivities, getActivityCalendarUrl, googleCalendarUrl, getToken, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import type { AppUser } from '../data/mockUser';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ActivityCard({
  activity, isLoggedIn, userId,
  onJoin, onLeave, joining, joinMsg,
}: {
  activity: ApiActivity;
  isLoggedIn: boolean;
  userId: string | null;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  joining: string | null;
  joinMsg?: { ok: boolean; text: string };
}) {
  const isParticipating = !!userId && !!activity.participantIds?.includes(userId);
  const isFull = activity.participantCount >= activity.maxParticipants;

  return (
    <article className="data-card glass-card" key={activity.id}>
      <div className="data-card-header">
        <span>{activity.category}</span>
        <small>{activity.status || 'attiva'}</small>
      </div>
      <h2>{activity.title}</h2>
      <p>{activity.description || 'Attività spontanea organizzata dalla community.'}</p>
      <dl>
        <div><dt>Luogo</dt><dd>{activity.location || 'Non specificato'}</dd></div>
        <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
        <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
      </dl>
      {activity.dateTime && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={getActivityCalendarUrl(activity.id)} download={`attivita-${activity.id}.ics`} style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>📅 Apple / Outlook</a>
          <a href={googleCalendarUrl(activity.title, activity.dateTime, activity.location)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>📅 Google Calendar</a>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Link className="detail-link" to={`/attivita/${activity.id}`}>Apri dettagli</Link>
        {isLoggedIn && (
          isParticipating
            ? <button onClick={() => onLeave(activity.id)} disabled={joining === activity.id} style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>{joining === activity.id ? '...' : 'Abbandona'}</button>
            : isFull
              ? <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Al completo</span>
              : <button className="primary-button" style={{ padding: '6px 12px', fontSize: 13 }} disabled={joining === activity.id} onClick={() => onJoin(activity.id)}>{joining === activity.id ? '...' : 'Partecipa'}</button>
        )}
      </div>
      {joinMsg && <p style={{ margin: 0, fontSize: 12, color: joinMsg.ok ? '#d2ffe6' : '#ffd0d0' }}>{joinMsg.text}</p>}
    </article>
  );
}

export function ActivitiesPage({ userInterests, user }: { userInterests?: string[]; user?: AppUser }) {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinMsgs, setJoinMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [joining, setJoining] = useState<string | null>(null);
  const hasInterests = Array.isArray(userInterests) && userInterests.length > 0;
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';
  const userId = user?.id ?? null;

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

  useEffect(() => { void loadActivities(); }, []);

  async function handleJoin(activityId: string) {
    setJoining(activityId);
    try {
      const updated = await joinActivity(activityId);
      setActivities((prev) => prev.map((a) => a.id === activityId ? updated : a));
      setJoinMsgs((prev) => ({ ...prev, [activityId]: { ok: true, text: 'Iscritto!' } }));
    } catch (e) {
      setJoinMsgs((prev) => ({ ...prev, [activityId]: { ok: false, text: e instanceof Error ? e.message : 'Errore' } }));
    } finally { setJoining(null); }
  }

  async function handleLeave(activityId: string) {
    setJoining(activityId);
    try {
      await leaveActivity(activityId);
      const updated = await getActivities();
      setActivities(updated);
      setJoinMsgs((prev) => ({ ...prev, [activityId]: { ok: true, text: 'Hai abbandonato l\'attività.' } }));
    } catch (e) {
      setJoinMsgs((prev) => ({ ...prev, [activityId]: { ok: false, text: e instanceof Error ? e.message : 'Errore' } }));
    } finally { setJoining(null); }
  }

  const cardProps = { isLoggedIn, userId, onJoin: handleJoin, onLeave: handleLeave, joining };

  const myActivities = isLoggedIn && userId
    ? activities.filter((a) => a.participantIds?.includes(userId))
    : [];

  const filteredActivities = activities.filter((a) => !hasInterests || userInterests!.includes(a.category));

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div>
          <h1>Attività</h1>
          <p>{hasInterests ? `Filtrate per i tuoi interessi: ${userInterests!.join(', ')}` : 'Attività spontanee lette dal database tramite il backend Express'}</p>
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

      {!isLoading && !error && myActivities.length > 0 && (
        <div className="glass-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Le mie attività</h2>
          <div className="data-grid">
            {myActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} joinMsg={joinMsgs[activity.id]} {...cardProps} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && filteredActivities.length === 0 && (
        <div className="state-panel glass-panel">Nessuna attività trovata nel database.</div>
      )}
      {!isLoading && !error && filteredActivities.length > 0 && (
        <div className="data-grid">
          {filteredActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} joinMsg={joinMsgs[activity.id]} {...cardProps} />
          ))}
        </div>
      )}
    </section>
  );
}
