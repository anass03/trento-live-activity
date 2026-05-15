import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelActivity, getActivityById, getActivityCalendarUrl, googleCalendarUrl, getToken, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import type { AppUser } from '../data/mockUser';

function formatDateTime(value?: string | null) {
  if (!value) return 'Data da definire';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export function ActivityDetailPage({ user }: { user?: AppUser }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';

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

  useEffect(() => { void loadActivity(); }, [id]);

  async function handleJoin() {
    if (!id) return;
    setJoining(true); setJoinMsg(null);
    try {
      const updated = await joinActivity(id);
      setActivity(updated);
      setJoinMsg({ ok: true, text: 'Iscrizione confermata!' });
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : 'Errore' });
    } finally { setJoining(false); }
  }

  async function handleLeave() {
    if (!id) return;
    setJoining(true); setJoinMsg(null);
    try {
      await leaveActivity(id);
      await loadActivity();
      setJoinMsg({ ok: true, text: 'Hai abbandonato l\'attività.' });
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : 'Errore' });
    } finally { setJoining(false); }
  }

  async function handleCancelActivity() {
    if (!id) return;
    if (!window.confirm('Annullare definitivamente questa attività? I partecipanti riceveranno una notifica.')) return;
    setCancelling(true); setJoinMsg(null);
    try {
      await cancelActivity(id);
      setJoinMsg({ ok: true, text: 'Attività annullata. Reindirizzamento...' });
      setTimeout(() => navigate('/attivita'), 1200);
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : 'Errore annullamento' });
      setCancelling(false);
    }
  }

  const isFull = activity ? activity.participantCount >= activity.maxParticipants : false;
  const userId = user?.id ?? null;
  const isParticipating = !!userId && !!activity?.participantIds?.includes(userId);
  const isCreator = !!userId && activity?.creator?.id === userId;

  return (
    <section className="detail-page liquid-panel">
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
            <div><dt>Luogo</dt><dd>{activity.location || 'Non specificato'}</dd></div>
            <div><dt>Quando</dt><dd>{formatDateTime(activity.dateTime)}</dd></div>
            <div><dt>Partecipanti</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
          </dl>
          {activity.dateTime && (
            <CalendarButton
              icsUrl={getActivityCalendarUrl(activity.id)}
              icsFilename={`attivita-${activity.id}.ics`}
              googleUrl={googleCalendarUrl(activity.title, activity.dateTime, activity.location)}
              label="Aggiungi al calendario"
            />
          )}
          {isLoggedIn && activity.status === 'attiva' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isCreator ? (
                <button className="danger-button" onClick={handleCancelActivity} disabled={cancelling}>
                  {cancelling ? 'Annullamento...' : 'Annulla attività'}
                </button>
              ) : isParticipating ? (
                <button onClick={handleLeave} disabled={joining} style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', borderRadius: 999, padding: '10px 14px', cursor: 'pointer' }}>{joining ? '...' : 'Abbandona'}</button>
              ) : isFull ? (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Attività al completo</span>
              ) : (
                <button className="primary-button" onClick={handleJoin} disabled={joining}>{joining ? '...' : 'Partecipa'}</button>
              )}
            </div>
          )}
          {joinMsg && <p style={{ margin: 0, color: joinMsg.ok ? '#d2ffe6' : '#ffd0d0' }}>{joinMsg.text}</p>}
        </>
      )}
    </section>
  );
}
