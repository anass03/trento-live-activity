import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPushStats, sendAdminBroadcast, type PushAudience, type PushStats } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';

const MAX_TITLE = 80;
const MAX_BODY = 240;

const AUDIENCE_KEYS: PushAudience[] = ['all', 'cittadini', 'enti', 'comunali'];

export function AdminNotificationsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<PushStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<PushAudience>('all');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadStats() {
    return getPushStats()
      .then((s) => { setStats(s); setStatsError(null); })
      .catch((e) => setStatsError(e instanceof Error ? e.message : t('common.error')));
  }

  useEffect(() => { void loadStats(); }, []);
  useAutoRefresh(loadStats, 30_000);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!title.trim() || !body.trim()) { setError(t('admin.notifications.emptyError')); return; }

    const audLabel = t(`admin.notifications.audiences.${audience}.label`);
    if (!window.confirm(t('admin.notifications.confirmSend', { audience: audLabel }))) return;

    setSending(true);
    try {
      const res = await sendAdminBroadcast({ title: title.trim(), body: body.trim(), audience });
      setMessage(
        res.tokensTargeted > 0
          ? t('admin.notifications.sent', { count: res.tokensTargeted, audience: audLabel })
          : t('admin.notifications.noDevices', { audience: audLabel }),
      );
      setTitle(''); setBody('');
      void loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setSending(false); }
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('admin.notifications.title')}</h1>
          <p>{t('admin.notifications.subtitle')}</p>
        </div>
      </header>

      <div className="moderation-stats">
        <div className="moderation-stat">
          <strong>{stats?.totalTokens ?? '—'}</strong>
          <span>{t('admin.notifications.devicesRegistered')}</span>
        </div>
        <div className="moderation-stat">
          <strong>{stats?.usersReachable ?? '—'}</strong>
          <span>{t('admin.notifications.usersReachable')}</span>
        </div>
        <div className="moderation-stat">
          <strong>{stats?.byPlatform?.web ?? 0}</strong>
          <span>Web</span>
        </div>
        <div className="moderation-stat">
          <strong>{(stats?.byPlatform?.android ?? 0) + (stats?.byPlatform?.ios ?? 0)}</strong>
          <span>{t('admin.notifications.mobile')}</span>
        </div>
      </div>
      {statsError && <div className="state-panel liquid-panel"><p>{statsError}</p></div>}

      <form className="liquid-card filter-bar admin-notify-form" onSubmit={handleSend}>
        <div className="filter-row">
          <label>
            <span>{t('admin.notifications.recipients')}</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value as PushAudience)}>
              {AUDIENCE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`admin.notifications.audiences.${key}.label`)} — {t(`admin.notifications.audiences.${key}.hint`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-row">
          <label>
            <span>{t('admin.notifications.titleField')} <small className="muted-copy">({title.length}/{MAX_TITLE})</small></span>
            <input type="text" value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} placeholder={t('admin.notifications.titlePlaceholder')} />
          </label>
        </div>
        <div className="filter-row">
          <label>
            <span>{t('admin.notifications.messageField')} <small className="muted-copy">({body.length}/{MAX_BODY})</small></span>
            <textarea value={body} maxLength={MAX_BODY} rows={3} onChange={(e) => setBody(e.target.value)} placeholder={t('admin.notifications.messagePlaceholder')} />
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <div className="filter-actions">
          <button type="submit" className="primary-button" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? t('admin.notifications.sending') : t('admin.notifications.send')}
          </button>
        </div>

        <p className="muted-copy" style={{ fontSize: 12, margin: 0 }}>
          {t('admin.notifications.disclaimer')}
        </p>
      </form>
    </section>
  );
}
