import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getEventById, getEventCalendarUrl, googleCalendarUrl, getToken,
  joinEvent, leaveEvent, reportEvent,
  type ApiEvent,
} from '../lib/api';
import { CalendarButton } from '../components/ui/CalendarButton';
import { formatDateTimeFull } from '../lib/formatters';
import type { AppUser } from '../data/mockUser';

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'altro'];

export function EventDetailPage({ user }: { user?: AppUser }) {
  const { id } = useParams();
  const { t } = useTranslation();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0]);
  const [reportMsg, setReportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [participating, setParticipating] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';
  const canReport = isLoggedIn && user?.role !== 'certified_entity';
  const userId = user?.id;
  const isCitizen = user?.role === 'registered_user';

  const isJoined = !!(userId && event?.participantIds?.includes(userId));
  const isPast = event?.dateTime ? new Date(event.dateTime) < new Date() : false;
  const isFull = !!(event?.maxPartecipanti && event.participantCount !== undefined && event.participantCount >= event.maxPartecipanti);

  async function loadEvent() {
    if (!id) return;
    setIsLoading(true); setError(null);
    try { setEvent(await getEventById(id)); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadEvent(); }, [id]);

  async function handleJoin() {
    if (!id) return;
    setPartError(null); setParticipating(true);
    try {
      const result = await joinEvent(id);
      setEvent((prev) => prev && userId ? { ...prev, participantCount: result.participantCount, participantIds: [...(prev.participantIds || []), userId] } : prev);
    } catch (e) { setPartError(e instanceof Error ? e.message : t('common.error')); }
    finally { setParticipating(false); }
  }

  async function handleLeave() {
    if (!id) return;
    setPartError(null); setParticipating(true);
    try {
      const result = await leaveEvent(id);
      setEvent((prev) => prev && userId ? { ...prev, participantCount: result.participantCount, participantIds: (prev.participantIds || []).filter((p) => p !== userId) } : prev);
    } catch (e) { setPartError(e instanceof Error ? e.message : t('common.error')); }
    finally { setParticipating(false); }
  }

  return (
    <section className="detail-page liquid-panel">
      <Link className="back-link" to="/eventi">{t('events.backToList')}</Link>
      {isLoading && <p>{t('events.loading')}</p>}
      {error && (
        <div className="state-inline">
          <p>{error}</p>
          <button onClick={loadEvent} type="button">{t('common.retry')}</button>
        </div>
      )}
      {!isLoading && !error && event && (
        <>
          <div className="data-card-header">
            <span>{event.category}</span>
            {event.isCertified && <small className="badge">{t('events.certified')}</small>}
          </div>
          <h1>{event.title}</h1>
          <p>{event.description || t('events.noDescription')}</p>
          <dl className="detail-list">
            <div><dt>{t('common.where')}</dt><dd>{event.location || t('common.notSpecified')}</dd></div>
            <div><dt>{t('common.when')}</dt><dd>{formatDateTimeFull(event.dateTime)}</dd></div>
            {(event.maxPartecipanti !== null && event.maxPartecipanti !== undefined) && (
              <div><dt>{t('common.participants')}</dt><dd>{event.participantCount ?? 0} / {event.maxPartecipanti}</dd></div>
            )}
          </dl>

          {isCitizen && (
            <div className="event-participate-row">
              {isPast ? (
                <span className="muted-copy">{t('events.ended')}</span>
              ) : isJoined ? (
                <button type="button" className="ghost-button" disabled={participating} onClick={handleLeave}>
                  {participating ? '...' : t('events.leave')}
                </button>
              ) : isFull ? (
                <span className="muted-copy">{t('events.full')}</span>
              ) : (
                <button type="button" className="primary-button" disabled={participating} onClick={handleJoin}>
                  {participating ? '...' : t('events.joinEvent')}
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
              label={t('common.addToCalendar')}
            />
          )}

          {canReport && !reportMsg && (
            reporting ? (
              <div className="inline-form-row">
                <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value)}>
                  {REPORT_TYPES.map((tipo) => <option key={tipo} value={tipo}>{tipo.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="danger-button" onClick={async () => {
                  try { await reportEvent(id!, reportTipo); setReportMsg({ ok: true, text: t('events.reportSent') }); }
                  catch (e) { setReportMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') }); }
                  finally { setReporting(false); }
                }}>{t('events.sendReport')}</button>
                <button className="ghost-button" onClick={() => setReporting(false)}>{t('common.cancel')}</button>
              </div>
            ) : (
              <button className="ghost-button" onClick={() => setReporting(true)}>{t('events.reportEvent')}</button>
            )
          )}
          {reportMsg && <p className={reportMsg.ok ? 'success-message' : 'error-message'}>{reportMsg.text}</p>}
        </>
      )}
    </section>
  );
}
