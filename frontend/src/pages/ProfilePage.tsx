import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  deleteAccount, getMe, listConsents, logout, regenerateRecoveryCodes,
  registerDeviceToken, sendTestPush, summarizeConsents, unregisterDeviceToken,
  updateConsent, updateEnteProfile, updateLocation, updateProfile,
  type ConsentType, type MeProfile,
} from '../lib/api';
import { requestFcmToken, revokeFcmToken } from '../lib/firebase';
import { reverseGeocode } from '../components/ui/GeocodedLocation';

const AVAILABLE_INTERESTS = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio', 'natura', 'tecnologia', 'volontariato'];
const FCM_TOKEN_KEY = 'tla_fcm_token';

interface MeUser {
  id?: string;
  email?: string;
  ruolo?: string;
  twoFactorEnabled?: boolean;
  twoFactorRecoveryCodesRemaining?: number;
  profile: MeProfile | null;
  // legacy fallback
  nome?: string;
  cognome?: string;
  interessi?: string[];
  nomeEnte?: string;
}

function roleLabel(ruolo?: string) {
  switch (ruolo) {
    case 'UtenteRegistrato': return 'Cittadino';
    case 'EnteCertificato': return 'Ente certificato';
    case 'AmministratoreComunale': return 'Amministratore comunale';
    case 'AmministratoreDiSistema': return 'Amministratore di sistema';
    default: return ruolo || '—';
  }
}

function initials(profile: MeProfile | null | undefined, user: MeUser): string {
  if (profile?.kind === 'cittadino') {
    return [(profile.nome || '')[0], (profile.cognome || '')[0]].filter(Boolean).join('').toUpperCase() || '◯';
  }
  if (profile?.kind === 'ente') {
    return (profile.nomeEnte || '◯')[0].toUpperCase();
  }
  if (profile?.kind === 'comunale' || profile?.kind === 'sistema') {
    return [(profile.nome || '')[0], (profile.cognome || '')[0]].filter(Boolean).join('').toUpperCase() || '◯';
  }
  return (user.email || '◯')[0].toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cittadino editable form
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [interessi, setInteressi] = useState<string[]>([]);

  // Ente editable form
  const [noteAdmin, setNoteAdmin] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationInFlight = useRef(false);

  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => Boolean(localStorage.getItem(FCM_TOKEN_KEY)));
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  // Two-step delete
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  // Riepilogo notifiche (sola lettura — la gestione vera è in /impostazioni)
  const [notifSummary, setNotifSummary] = useState<Partial<Record<ConsentType, boolean>>>({});

  useEffect(() => {
    getMe()
      .then((u) => {
        const me = u as unknown as MeUser;
        setUser(me);
        if (me.profile?.kind === 'cittadino') {
          setNome(me.profile.nome || '');
          setCognome(me.profile.cognome || '');
          setInteressi(me.profile.interessi || []);
        } else if (me.profile?.kind === 'ente') {
          setNoteAdmin(me.profile.noteAdmin || '');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function refreshSummary() {
      listConsents()
        .then((records) => setNotifSummary(summarizeConsents(records)))
        .catch(() => { /* ignore */ });
    }
    refreshSummary();
    // Risincronizza quando l'utente cambia consensi (es. dalla SettingsPage),
    // o quando torna sulla scheda dopo una modifica esterna.
    window.addEventListener('tla:consents-changed', refreshSummary);
    window.addEventListener('focus', refreshSummary);
    return () => {
      window.removeEventListener('tla:consents-changed', refreshSummary);
      window.removeEventListener('focus', refreshSummary);
    };
  }, []);

  async function handleEnablePush() {
    setPushError(null); setPushMessage(null);
    setIsTogglingPush(true);
    try {
      const token = await requestFcmToken();
      await registerDeviceToken(token, 'web');
      localStorage.setItem(FCM_TOKEN_KEY, token);
      // Allinea anche il consenso globale: se l'utente attiva push qui,
      // sta dando il consenso.
      try { await updateConsent('notif_push', true); } catch { /* best-effort */ }
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setPushEnabled(true);
      setPushMessage('Notifiche push attivate per questo browser');
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Errore attivazione notifiche');
    } finally { setIsTogglingPush(false); }
  }

  async function handleDisablePush() {
    setPushError(null); setPushMessage(null);
    setIsTogglingPush(true);
    try {
      const token = localStorage.getItem(FCM_TOKEN_KEY);
      if (token) {
        await unregisterDeviceToken(token);
        localStorage.removeItem(FCM_TOKEN_KEY);
      }
      // Cancella anche il token lato FCM client: senza questo l'SDK resta
      // con un token "stale" in cache e la riattivazione successiva può
      // hangare (specie su Firefox).
      await revokeFcmToken();
      // Revoca il consenso globale: il backend cancellerà anche eventuali
      // altri DeviceToken associati all'utente su altri dispositivi.
      try { await updateConsent('notif_push', false); } catch { /* best-effort */ }
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setPushEnabled(false);
      setPushMessage('Notifiche push disattivate');
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsTogglingPush(false); }
  }

  async function handleTestPush() {
    setPushError(null); setPushMessage(null);
    try {
      const result = await sendTestPush();
      setPushMessage(`Inviata notifica di test a ${result.tokensTargeted} dispositivo/i.`);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Errore');
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Rigenerare i codici di recupero? I vecchi codici saranno invalidati.')) return;
    setIsRegenerating(true); setError(null);
    try {
      const result = await regenerateRecoveryCodes();
      setNewRecoveryCodes(result.recoveryCodes);
      setUser((prev) => prev && { ...prev, twoFactorRecoveryCodesRemaining: result.recoveryCodes.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsRegenerating(false); }
  }

  function toggleInteresse(name: string) {
    setInteressi((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));
  }

  async function handleSaveCittadino(event: FormEvent) {
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

  async function handleSaveEnte(event: FormEvent) {
    event.preventDefault();
    setMessage(null); setError(null);
    try {
      await updateEnteProfile({ noteAdmin });
      setMessage('Note pubbliche aggiornate');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    }
  }

  async function handleShareLocation() {
    if (locationInFlight.current) return;
    if (!navigator.geolocation) { setLocationError('Geolocalizzazione non supportata dal browser'); return; }
    locationInFlight.current = true;
    setLocationError(null);
    setLocationMessage('Rilevamento posizione in corso...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation(pos.coords.latitude, pos.coords.longitude);
          const coordStr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          const placeName = await reverseGeocode(coordStr).catch(() => coordStr);
          setLocationMessage(`Posizione aggiornata: ${placeName}`);
          setLocationError(null);
        } catch (e) {
          setLocationError(e instanceof Error ? e.message : 'Errore');
          setLocationMessage(null);
        } finally { locationInFlight.current = false; }
      },
      (err) => {
        const reasons: Record<number, string> = {
          1: 'Permesso negato.',
          2: 'Posizione non disponibile.',
          3: 'Timeout.',
        };
        setLocationError(reasons[err.code] ?? `Errore (codice ${err.code})`);
        setLocationMessage(null);
        locationInFlight.current = false;
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }

  async function handleLogout() {
    const fcmToken = localStorage.getItem(FCM_TOKEN_KEY);
    if (fcmToken) {
      try { await unregisterDeviceToken(fcmToken); } catch { /* ignore */ }
      localStorage.removeItem(FCM_TOKEN_KEY);
    }
    await logout();
    navigate('/');
  }

  async function handleDelete() {
    if (deleteEmailConfirm.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
      setError('La conferma email non corrisponde.');
      return;
    }
    localStorage.removeItem(FCM_TOKEN_KEY);
    await deleteAccount();
    navigate('/');
    window.location.reload();
  }

  if (isLoading) return <section className="data-page"><div className="state-panel liquid-panel">Caricamento...</div></section>;
  if (!user) return <Navigate to="/login" replace />;

  const profile = user.profile;
  const role = user.ruolo;
  const isCittadino = profile?.kind === 'cittadino';
  const isEnte = profile?.kind === 'ente';
  const isComunale = profile?.kind === 'comunale';
  const isSistema = profile?.kind === 'sistema';

  const displayName = isCittadino
    ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || (user.email || 'Profilo')
    : isEnte
      ? profile.nomeEnte || user.email || 'Profilo'
      : (isComunale || isSistema)
        ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || (user.email || 'Profilo')
        : user.email || 'Profilo';

  return (
    <section className="data-page profile-page">
      <header className="profile-hero liquid-card">
        <div className="profile-avatar-big" aria-hidden="true">{initials(profile, user)}</div>
        <div className="profile-hero-info">
          <h1>{displayName}</h1>
          <p>
            <span className="role-badge">{roleLabel(role)}</span>
            <span className="muted-copy"> · {user.email}</span>
          </p>
          {isEnte && (
            <p>
              {profile.approvato
                ? <span className="report-stato report-stato-done">Ente approvato</span>
                : <span className="report-stato report-stato-open">In attesa di approvazione</span>}
            </p>
          )}
        </div>
        <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
      </header>

      <div className="profile-main-grid">
        <div className="profile-col">
          {/* ── Cittadino: nome/cognome editabili + interessi ── */}
          {isCittadino && (
            <form className="auth-form liquid-card" onSubmit={handleSaveCittadino}>
              <h2>Dati personali</h2>
              <div className="filter-row">
                <label>
                  <span>Nome</span>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
                </label>
                <label>
                  <span>Cognome</span>
                  <input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} />
                </label>
              </div>
              <label>
                <span>Codice fiscale</span>
                <input type="text" value={profile.codiceFiscale || ''} disabled readOnly />
                <small>Il codice fiscale non è modificabile.</small>
              </label>
              <label>
                <span>Data di nascita</span>
                <input type="text" value={profile.dataNascita ? new Date(profile.dataNascita + 'T00:00:00').toLocaleDateString('it-IT') : '—'} disabled readOnly />
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
          )}

          {/* ── Ente: dati istituzionali readonly + note ── */}
          {isEnte && (
            <form className="auth-form liquid-card" onSubmit={handleSaveEnte}>
              <h2>Dati ente</h2>
              <label>
                <span>Denominazione</span>
                <input type="text" value={profile.nomeEnte || ''} disabled readOnly />
              </label>
              <label>
                <span>PEC</span>
                <input type="text" value={profile.pec || ''} disabled readOnly />
                <small>La PEC è quella indicata in registrazione e non è modificabile.</small>
              </label>
              <label>
                <span>Note / descrizione</span>
                <textarea
                  rows={4}
                  value={noteAdmin}
                  onChange={(e) => setNoteAdmin(e.target.value)}
                  placeholder="Descrivi l'ente in poche righe (visibile alla moderazione)."
                />
              </label>
              {message && <div className="form-success">{message}</div>}
              {error && <div className="form-error">{error}</div>}
              <button className="primary-button" type="submit">Salva descrizione</button>
            </form>
          )}

          {/* ── Comunale: dati ufficio + SPID readonly ── */}
          {isComunale && (
            <div className="auth-form liquid-card">
              <h2>Dati amministratore comunale</h2>
              <div className="filter-row">
                <label>
                  <span>Nome</span>
                  <input type="text" value={profile.nome || ''} disabled readOnly />
                </label>
                <label>
                  <span>Cognome</span>
                  <input type="text" value={profile.cognome || ''} disabled readOnly />
                </label>
              </div>
              <label>
                <span>Ufficio</span>
                <input type="text" value={profile.ufficio || '—'} disabled readOnly />
              </label>
              <label>
                <span>SPID ID</span>
                <input type="text" value={profile.spidId || '—'} disabled readOnly />
                <small>I dati sono forniti dal provider SPID e non sono modificabili qui.</small>
              </label>
            </div>
          )}

          {/* ── Sistema: dati base + 2FA è obbligatoria ── */}
          {isSistema && (
            <div className="auth-form liquid-card">
              <h2>Dati amministratore di sistema</h2>
              <div className="filter-row">
                <label>
                  <span>Nome</span>
                  <input type="text" value={profile.nome || ''} disabled readOnly />
                </label>
                <label>
                  <span>Cognome</span>
                  <input type="text" value={profile.cognome || ''} disabled readOnly />
                </label>
              </div>
              {profile.superAdmin && (
                <p><span className="report-stato report-stato-done">Super admin</span></p>
              )}
            </div>
          )}

          {/* ── Posizione (solo cittadini, per notifiche geo-aware) ── */}
          {isCittadino && (
            <div className="auth-form liquid-card">
              <h2>Posizione</h2>
              <p>Condividi la tua posizione per ricevere notifiche di attività entro 50 km dai tuoi interessi.</p>
              {locationMessage && <div className="form-success">{locationMessage}</div>}
              {locationError && <div className="form-error">{locationError}</div>}
              <button type="button" className="primary-button" onClick={handleShareLocation}>
                📍 Condividi posizione
              </button>
            </div>
          )}
        </div>

        <div className="profile-col">
          {/* ── Notifiche: una sola stato chiaro ── */}
          {(isCittadino || isEnte) && (() => {
            // Stato unificato: l'utente vede UNA situazione, non 3 righe contraddittorie.
            const browserBlocked = 'Notification' in window && Notification.permission === 'denied';
            const consentDenied = notifSummary.notif_push === false;
            const pushActive = pushEnabled && !consentDenied && !browserBlocked;
            return (
              <div className="auth-form liquid-card">
                <h2>Notifiche push</h2>
                {browserBlocked ? (
                  <p className="form-error" style={{ margin: 0 }}>
                    Il browser ha bloccato le notifiche per questo sito. Riattivale dalle impostazioni del browser
                    (icona del lucchetto accanto all'URL) e ricarica la pagina.
                  </p>
                ) : pushActive ? (
                  <p className="muted-copy" style={{ marginTop: 0 }}>
                    Notifiche attive su questo browser. Riceverai aggiornamenti su eventi e attività vicine.
                  </p>
                ) : (
                  <p className="muted-copy" style={{ marginTop: 0 }}>
                    Notifiche push <strong>non attive</strong> su questo browser.
                  </p>
                )}

                {pushMessage && <div className="form-success">{pushMessage}</div>}
                {pushError && <div className="form-error">{pushError}</div>}

                {!browserBlocked && (
                  <div className="filter-actions">
                    {pushActive ? (
                      <>
                        <button type="button" className="primary-button" onClick={handleTestPush}>
                          Invia notifica di test
                        </button>
                        <button type="button" onClick={handleDisablePush} disabled={isTogglingPush}>
                          {isTogglingPush ? '...' : 'Disattiva'}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="primary-button" onClick={handleEnablePush} disabled={isTogglingPush}>
                        {isTogglingPush ? '...' : '🔔 Attiva notifiche push'}
                      </button>
                    )}
                  </div>
                )}

                <p className="muted-copy" style={{ fontSize: 12, margin: '6px 0 0' }}>
                  Email: <strong>{notifSummary.notif_email === false ? 'OFF' : 'ON'}</strong>
                  {' · '}
                  Gestisci tutte le preferenze in{' '}
                  <a href="/impostazioni">Impostazioni</a>.
                </p>
              </div>
            );
          })()}

          {/* ── 2FA: solo sistema (obbligatoria) o se attiva ── */}
          {(isSistema || user.twoFactorEnabled) && (
            <div className="auth-form liquid-card">
              <h2>Autenticazione a due fattori</h2>
              {user.twoFactorEnabled ? (
                <p>
                  2FA attiva. Codici di recupero restanti:{' '}
                  <strong>{user.twoFactorRecoveryCodesRemaining ?? 0}</strong> / 8.
                </p>
              ) : (
                <p>2FA non ancora configurata. Per gli amministratori di sistema è obbligatoria.</p>
              )}
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
                    <button type="button" onClick={() => setNewRecoveryCodes(null)}>Ho salvato</button>
                  </div>
                </>
              )}
              {!newRecoveryCodes && (
                <div className="filter-actions">
                  {user.twoFactorEnabled && (
                    <button type="button" className="primary-button" onClick={handleRegenerate} disabled={isRegenerating}>
                      {isRegenerating ? 'Generazione...' : 'Rigenera codici'}
                    </button>
                  )}
                  <button type="button" onClick={() => navigate('/setup-2fa')}>
                    {user.twoFactorEnabled ? 'Cambia authenticator' : 'Configura 2FA'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Elimina account: fuori dai card principali, in fondo ── */}
      <div className="profile-delete-footer">
        {!confirmingDelete ? (
          <button type="button" className="ghost-button danger-text" onClick={() => setConfirmingDelete(true)}>
            Elimina account
          </button>
        ) : (
          <div className="profile-delete-confirm liquid-card">
            <strong>Conferma eliminazione</strong>
            <p>L'azione è irreversibile (GDPR art. 17). Per procedere digita la tua email: <code>{user.email}</code></p>
            <input
              type="email"
              value={deleteEmailConfirm}
              onChange={(e) => setDeleteEmailConfirm(e.target.value)}
              placeholder={user.email}
              autoComplete="off"
            />
            <div className="filter-actions">
              <button type="button" onClick={() => { setConfirmingDelete(false); setDeleteEmailConfirm(''); setError(null); }}>
                Annulla
              </button>
              <button type="button" className="danger-button compact-button" onClick={handleDelete}>
                Elimina definitivamente
              </button>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
