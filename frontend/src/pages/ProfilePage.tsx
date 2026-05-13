import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteAccount, getMe, logout, regenerateRecoveryCodes, updateLocation, updateProfile,
} from '../lib/api';

const AVAILABLE_INTERESTS = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio'];

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

  if (isLoading) return <section className="data-page"><div className="state-panel glass-panel">Caricamento...</div></section>;
  if (!user) return <section className="data-page"><div className="state-panel glass-panel">Non autenticato. <a href="/login">Accedi</a></div></section>;

  return (
    <section className="data-page">
      <header className="utility-strip glass-card">
        <div>
          <h1>Il mio profilo</h1>
          <p>{user.email} — {user.ruolo}</p>
        </div>
        <button type="button" className="primary-button" onClick={handleLogout}>Logout</button>
      </header>

      <form className="auth-form glass-card" onSubmit={handleSave}>
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

      <div className="auth-form glass-card">
        <h2>Posizione (per notifiche di attività vicine)</h2>
        <p>Condividi la tua posizione corrente per ricevere notifiche di attività entro 3 km dai tuoi interessi.</p>
        <button type="button" className="primary-button" onClick={handleShareLocation}>📍 Condividi posizione</button>
      </div>

      {user.twoFactorEnabled && (
        <div className="auth-form glass-card">
          <h2>Autenticazione a due fattori</h2>
          <p>
            2FA attiva. Codici di recupero monouso restanti:{' '}
            <strong>{user.twoFactorRecoveryCodesRemaining ?? 0}</strong> di 8.
          </p>

          {newRecoveryCodes && (
            <>
              <div className="warning-box">
                <strong>⚠ Salva subito questi codici.</strong> Verranno mostrati solo ora.
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

      <div className="auth-form glass-card danger-zone">
        <h2>Zona pericolosa</h2>
        <p>Elimina permanentemente il tuo account e tutti i tuoi dati personali (GDPR art. 17 — diritto all'oblio).</p>
        <button type="button" className="danger-button" onClick={handleDelete}>Elimina account</button>
      </div>
    </section>
  );
}
