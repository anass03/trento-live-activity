import { useEffect, useState } from 'react';
import { getPushStats, sendAdminBroadcast, type PushAudience, type PushStats } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';

const AUDIENCES: { value: PushAudience; label: string; hint: string }[] = [
  { value: 'all', label: 'Tutti gli utenti', hint: 'Ogni dispositivo registrato' },
  { value: 'cittadini', label: 'Cittadini', hint: 'Solo utenti registrati' },
  { value: 'enti', label: 'Enti certificati', hint: 'Solo account ente' },
  { value: 'comunali', label: 'Amministratori comunali', hint: 'Solo dashboard Comune' },
];

const MAX_TITLE = 80;
const MAX_BODY = 240;

export function AdminNotificationsPage() {
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
      .catch((e) => setStatsError(e instanceof Error ? e.message : 'Errore nel caricamento delle statistiche.'));
  }

  useEffect(() => { void loadStats(); }, []);
  // Auto-aggiornamento delle statistiche di copertura (niente pulsante manuale).
  useAutoRefresh(loadStats, 30_000);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!title.trim() || !body.trim()) {
      setError('Inserisci sia il titolo sia il messaggio.');
      return;
    }
    const audLabel = AUDIENCES.find((a) => a.value === audience)?.label ?? audience;
    if (!window.confirm(`Inviare la notifica push a "${audLabel}"?`)) return;

    setSending(true);
    try {
      const res = await sendAdminBroadcast({ title: title.trim(), body: body.trim(), audience });
      setMessage(
        res.tokensTargeted > 0
          ? `Notifica inviata a ${res.tokensTargeted} dispositivo/i (${audLabel}).`
          : `Nessun dispositivo registrato per "${audLabel}". Notifica non recapitata.`,
      );
      setTitle('');
      setBody('');
      void loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invio non riuscito.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Notifiche push</h1>
          <p>Invia comunicazioni push agli utenti e monitora la copertura dei dispositivi.</p>
        </div>
      </header>

      {/* ── Copertura / statistiche ── */}
      <div className="moderation-stats">
        <div className="moderation-stat">
          <strong>{stats?.totalTokens ?? '—'}</strong>
          <span>Dispositivi registrati</span>
        </div>
        <div className="moderation-stat">
          <strong>{stats?.usersReachable ?? '—'}</strong>
          <span>Utenti raggiungibili</span>
        </div>
        <div className="moderation-stat">
          <strong>{stats?.byPlatform?.web ?? 0}</strong>
          <span>Web</span>
        </div>
        <div className="moderation-stat">
          <strong>{(stats?.byPlatform?.android ?? 0) + (stats?.byPlatform?.ios ?? 0)}</strong>
          <span>Mobile (iOS/Android)</span>
        </div>
      </div>
      {statsError && <div className="state-panel liquid-panel"><p>{statsError}</p></div>}

      {/* ── Composizione messaggio ── */}
      <form className="liquid-card filter-bar admin-notify-form" onSubmit={handleSend}>
        <div className="filter-row">
          <label>
            <span>Destinatari</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value as PushAudience)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label} — {a.hint}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-row">
          <label>
            <span>Titolo <small className="muted-copy">({title.length}/{MAX_TITLE})</small></span>
            <input
              type="text"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Allerta meteo in centro"
            />
          </label>
        </div>
        <div className="filter-row">
          <label>
            <span>Messaggio <small className="muted-copy">({body.length}/{MAX_BODY})</small></span>
            <textarea
              value={body}
              maxLength={MAX_BODY}
              rows={3}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Testo della notifica push…"
            />
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <div className="filter-actions">
          <button type="submit" className="primary-button" disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'Invio…' : '🔔 Invia notifica push'}
          </button>
        </div>

        <p className="muted-copy" style={{ fontSize: 12, margin: 0 }}>
          La notifica raggiunge solo gli utenti che hanno attivato le notifiche push sul proprio dispositivo.
          Se Firebase non è configurato lato server, l'invio viene registrato nei log (modalità stub).
        </p>
      </form>
    </section>
  );
}
