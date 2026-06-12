import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cancelActivity, getActivityById, getActivityCalendarUrl, googleCalendarUrl, getToken, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import { formatDateTimeFull } from '../lib/formatters';
import { resolveActivityTitle } from '../lib/activityTitle';
import type { AppUser } from '../data/mockUser';

export function ActivityDetailPage({ user }: { user?: AppUser }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canParticipate = !!getToken() && user?.role === 'registered_user';
  const translateStatus = (s?: string | null) => {
    if (!s || s === 'attiva') return t('activities.statusActive');
    if (s === 'cancellata') return t('activities.statusCancelled');
    if (s === 'conclusa') return t('activities.statusCompleted');
    return s;
  };

  async function loadActivity() {
    if (!id) return;
    setIsLoading(true); setError(null);
    try { setActivity(await getActivityById(id)); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadActivity(); }, [id]);

  async function handleJoin() {
    if (!id) return;
    setJoining(true); setJoinMsg(null);
    try {
      const updated = await joinActivity(id);
      setActivity(updated);
      setJoinMsg({ ok: true, text: t('activities.joined') });
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') });
    } finally { setJoining(false); }
  }

  async function handleLeave() {
    if (!id) return;
    setJoining(true); setJoinMsg(null);
    try {
      await leaveActivity(id);
      await loadActivity();
      setJoinMsg({ ok: true, text: t('activities.left') });
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') });
    } finally { setJoining(false); }
  }

  async function handleCancelActivity() {
    if (!id) return;
    if (!window.confirm(t('activities.cancelConfirmDetail'))) return;
    setCancelling(true); setJoinMsg(null);
    try {
      await cancelActivity(id);
      setJoinMsg({ ok: true, text: t('activities.cancelled') });
      setTimeout(() => navigate('/attivita'), 1200);
    } catch (e) {
      setJoinMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') });
      setCancelling(false);
    }
  }

  const isFull = activity ? activity.participantCount >= activity.maxParticipants : false;
  const userId = user?.id ?? null;
  const isParticipating = !!userId && !!activity?.participantIds?.includes(userId);
  const isCreator = !!userId && activity?.creator?.id === userId;

  return (
    <section className="detail-page liquid-panel">
      <Link className="back-link" to="/attivita">{t('activities.backToList')}</Link>
      {isLoading && <p>{t('activities.loading')}</p>}
      {error && (
        <div className="state-inline">
          <p>{error}</p>
          <button onClick={loadActivity} type="button">{t('common.retry')}</button>
        </div>
      )}
      {!isLoading && !error && activity && (
        <>
          <div className="data-card-header">
            <span>{t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}</span>
            <small>{translateStatus(activity.status)}</small>
          </div>
          <h1>{resolveActivityTitle(activity.category, t)}</h1>
          <p>{activity.description || t('activities.defaultDescription')}</p>
          <dl className="detail-list">
            <div><dt>{t('common.where')}</dt><dd>{activity.location || t('common.notSpecified')}</dd></div>
            <div><dt>{t('common.when')}</dt><dd>{formatDateTimeFull(activity.dateTime)}</dd></div>
            <div><dt>{t('common.participants')}</dt><dd>{activity.participantCount} / {activity.maxParticipants}</dd></div>
          </dl>
          {activity.dateTime && (
            <CalendarButton
              icsUrl={getActivityCalendarUrl(activity.id)}
              icsFilename={`attivita-${activity.id}.ics`}
              googleUrl={googleCalendarUrl(activity.title, activity.dateTime, activity.location)}
              label={t('common.addToCalendar')}
            />
          )}
          {canParticipate && activity.status === 'attiva' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isCreator ? (
                <button className="danger-button" onClick={handleCancelActivity} disabled={cancelling}>
                  {cancelling ? t('activities.cancelling') : t('activities.cancel')}
                </button>
              ) : isParticipating ? (
                <button onClick={handleLeave} disabled={joining} style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', borderRadius: 999, padding: '10px 14px', cursor: 'pointer' }}>
                  {joining ? '...' : t('activities.leave')}
                </button>
              ) : isFull ? (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{t('activities.atCapacity')}</span>
              ) : (
                <button className="primary-button" onClick={handleJoin} disabled={joining}>
                  {joining ? '...' : t('activities.join')}
                </button>
              )}
            </div>
          )}
          {joinMsg && <p style={{ margin: 0, color: joinMsg.ok ? '#d2ffe6' : '#ffd0d0' }}>{joinMsg.text}</p>}
        </>
      )}
    </section>
  );
}
