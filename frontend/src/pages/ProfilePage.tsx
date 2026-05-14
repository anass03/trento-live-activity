import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteAccount, getMe, logout, regenerateRecoveryCodes,
  registerDeviceToken, unregisterDeviceToken,
  updateLocation, updateProfile,
} from '../lib/api';
import { onForegroundMessage, requestFcmToken } from '../lib/firebase';

const AVAILABLE_INTERESTS = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio'];
const FCM_TOKEN_KEY = 'tla_fcm_token';

interface MeUser {
  nome?: string;
  cognome?: string;
  email?: string;
  ruolo?: string;
  interessi?: string[];
  twoFactorEnabled?: boolean;
  twoFactorRecoveryCodesRemaining?: number;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<MeUser | null>(null);
  const [interessi, setInteressi] = useState<string[]>([]);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => Boolean(localStorage.getItem(FCM_TOKEN_KEY)));
  const [isTogglingPush, setIsTogglingPush] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        const me = u as unknown as MeUser;
        setUser(me);
        setNome(me.nome || '');
        setCognome(me.cognome || '');
        setInteressi(me.interessi || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for push messages that arrive while the page is open (foreground).
  // When tab is in background or closed, the service worker shows them instead.
  useEffect(() => {
    const unsub = onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'Notifica';
      setMessage(`${title}: ${payload.notification?.body || ''}`);
    });
    return unsub;
  }, []);

  async function handleEnablePush() {
    setError(null); setMessage(null);
    setIsTogglingPush(true);
    try {
      const token = await requestFcmToken();
      await registerDeviceToken(token, 'web');
      localStorage.setItem(FCM_TOKEN_KEY, token);
      setPushEnabled(true);
      setMessage('Notifiche push attivate per questo browser');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore attivazione notifiche');
    } finally { setIsTogglingPush(false); }
  }

  async function handleDisablePush() {
    setError(null); setMessage(null);
    setIsTogglingPush(true);
    try {
      const token = localStorage.getItem(FCM_TOKEN_KEY);
      if (token) {
        await unregisterDeviceToken(token);
        localStorage.removeItem(FCM_TOKEN_KEY);
      }
      setPushEnabled(false);
      setMessage('Notifiche push disattivate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsTogglingPush(false); }
  }

  async function handleRegenerate() {
    if (!window.confirm('Rigenerare i codici di recupero? I vecchi codici saranno invalidati.')) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const result = await regenerateRecoveryCodes();
      setNewRecoveryCodes(result.recoveryCodes);
      setUser((prev) => prev && { ...prev, twoFactorRecoveryCodesRemaining: result.recoveryCodes.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setIsRegenerating(false);
    }
  }

  function toggleInteresse(name: string) {
    setInteressi((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    try {
      await updateProfile({ nome, cognome, interessi });
      setMessage('Profilo aggiornato');
      window.dispatchEvent(new CustomEvent('tla:user-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    }
  }

  async function handleShareLocation() {
    if (!navigator.geolocation) { setError('Geolocalizzazione non supportata dal browser'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation(pos.coords.latitude, pos.coords.longitude);
          setMessage('Posizione aggiornata');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Errore aggiornamento posizione');
        }
      },
      () => setError('Impossibile ottenere la posizione'),
    );
  }

  async function handleLogout() {
    await logout();
    navigate('/');
    window.location.reload();
  }

  async function handleDelete() {
    if (!window.confirm('Sicuro di voler eliminare il tuo account? L\'operazione è irreversibile (GDPR art. 17).')) return;
    await deleteAccount();
    navigate('/');
    window.location.reload();
  }

  if (isLoading) return <section className="data-page"><div className="state-panel liquid-panel">Caricamento...</div></section>;
  if (!user) return <section className="data-page"><div className="state-panel liquid-panel">Non autenticato. <a href="/login">Accedi</a></div></section>;

  return (
    <section className="data-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>Il mio profilo</h1>
          <p>{user.email} — {user.ruolo}</p>
        </div>
        <button type="button" className="primary-button" onClick={handleLogout}>Logout</button>
      </header>

      <form className="auth-form liquid-card" onSubmit={handleSave}>
        <label>
          <span>Nome</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label>
          <span>Cognome</span>
          <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </label>

        <fieldset>
          <legend>Interessi</legend>
          <div className="chips">
            {AVAILABLE_INTERESTS.map((i) => (
              <label key={i} className={`chip ${interessi.includes(i) ? 'active' : ''}`}>
                <input type="checkbox" checked={interessi.includes(i)} onChange={() => toggleInteresse(i)} />
                {i}
              </label>
            ))}
          </div>
        </fieldset>

        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}

        <button className="primary-button" type="submit">Salva modifiche</button>
      </form>

      <div className="auth-form liquid-card">
        <h2>Posizione (per notifiche di attività vicine)</h2>
        <p>Condividi la tua posizione corrente per ricevere notifiche di attività entro 3 km dai tuoi interessi.</p>
        <button type="button" className="primary-button" onClick={handleShareLocation}>Condividi posizione</button>
      </div>

      <div className="auth-form liquid-card">
        <h2>Notifiche push</h2>
        <p>
          Ricevi notifiche immediate sul tuo dispositivo per nuovi partecipanti alle tue attività,
          eventi che corrispondono ai tuoi interessi e attività vicine a te.
          {pushEnabled
            ? ' Sono attive su questo browser.'
            : ' Non sono attive su questo browser.'}
        </p>
        {pushEnabled ? (
          <button type="button" onClick={handleDisablePush} disabled={isTogglingPush}>
            {isTogglingPush ? '...' : 'Disattiva notifiche push'}
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={handleEnablePush} disabled={isTogglingPush}>
            {isTogglingPush ? '...' : 'Attiva notifiche push'}
          </button>
        )}
      </div>

      {user.twoFactorEnabled && (
        <div className="auth-form liquid-card">
          <h2>Autenticazione a due fattori</h2>
          <p>
            2FA attiva. Codici di recupero monouso restanti:{' '}
            <strong>{user.twoFactorRecoveryCodesRemaining ?? 0}</strong> di 8.
          </p>

          {newRecoveryCodes && (
            <>
              <div className="warning-box">
                <strong>Salva subito questi codici.</strong> Verranno mostrati solo ora.
              </div>
              <div className="recovery-codes-grid">
                {newRecoveryCodes.map((c) => <code key={c} className="recovery-code">{c}</code>)}
              </div>
              <div className="filter-actions">
                <button type="button" onClick={() => navigator.clipboard.writeText(newRecoveryCodes.join('\n'))}>Copia</button>
                <button type="button" onClick={() => setNewRecoveryCodes(null)}>Ho salvato, chiudi</button>
              </div>
            </>
          )}

          {!newRecoveryCodes && (
            <div className="filter-actions">
              <button type="button" className="primary-button" onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating ? 'Generazione...' : 'Rigenera codici di recupero'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Cambiare authenticator richiede di rifare il setup 2FA con un nuovo dispositivo. Procedere?')) {
                    navigate('/setup-2fa');
                  }
                }}
              >
                Cambia authenticator / Reimposta 2FA
              </button>
            </div>
          )}
        </div>
      )}

      <div className="auth-form liquid-card danger-zone">
        <h2>Zona pericolosa</h2>
        <p>Elimina permanentemente il tuo account e tutti i tuoi dati personali (GDPR art. 17 — diritto all'oblio).</p>
        <button type="button" className="danger-button" onClick={handleDelete}>Elimina account</button>
      </div>
    </section>
  );
}
