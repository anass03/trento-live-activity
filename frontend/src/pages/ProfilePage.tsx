import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  changePassword, deleteAccount, getMe, listConsents, logout, regenerateRecoveryCodes,
  registerDeviceToken, sendTestPush, setToken, summarizeConsents, unregisterDeviceToken,
  updateConsent, updateEnteProfile, updateLocation, updateProfile,
  type ConsentType, type MeProfile,
} from '../lib/api';
import { requestFcmToken, revokeFcmToken } from '../lib/firebase';

const AVAILABLE_INTERESTS = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio', 'natura', 'tecnologia', 'volontariato'];
const FCM_TOKEN_KEY = 'tla_fcm_token';

interface MeUser {
  id?: string;
  email?: string;
  ruolo?: string;
  twoFactorEnabled?: boolean;
  twoFactorRecoveryCodesRemaining?: number;
  hasPassword?: boolean;
  profile: MeProfile | null;
  nome?: string;
  cognome?: string;
  interessi?: string[];
  nomeEnte?: string;
}

function initials(profile: MeProfile | null | undefined, user: MeUser): string {
  if (profile?.kind === 'cittadino') return [(profile.nome || '')[0], (profile.cognome || '')[0]].filter(Boolean).join('').toUpperCase() || '◯';
  if (profile?.kind === 'ente') return (profile.nomeEnte || '◯')[0].toUpperCase();
  if (profile?.kind === 'comunale' || profile?.kind === 'sistema') return [(profile.nome || '')[0], (profile.cognome || '')[0]].filter(Boolean).join('').toUpperCase() || '◯';
  return (user.email || '◯')[0].toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [interessi, setInteressi] = useState<string[]>([]);
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [notifSummary, setNotifSummary] = useState<Partial<Record<ConsentType, boolean>>>({});

  useEffect(() => {
    getMe()
      .then((u) => {
        const me = u as unknown as MeUser;
        setUser(me);
        if (me.profile?.kind === 'cittadino') { setNome(me.profile.nome || ''); setCognome(me.profile.cognome || ''); setInteressi(me.profile.interessi || []); }
        else if (me.profile?.kind === 'ente') { setNoteAdmin(me.profile.noteAdmin || ''); }
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setIsLoading(false));
  }, [t]);

  useEffect(() => {
    function refreshSummary() {
      listConsents().then((records) => setNotifSummary(summarizeConsents(records))).catch(() => { /* ignore */ });
    }
    refreshSummary();
    window.addEventListener('tla:consents-changed', refreshSummary);
    window.addEventListener('focus', refreshSummary);
    return () => { window.removeEventListener('tla:consents-changed', refreshSummary); window.removeEventListener('focus', refreshSummary); };
  }, []);

  async function handleEnablePush() {
    setPushError(null); setPushMessage(null); setIsTogglingPush(true);
    try {
      const token = await requestFcmToken();
      await registerDeviceToken(token, 'web');
      localStorage.setItem(FCM_TOKEN_KEY, token);
      try { await updateConsent('notif_push', true); } catch { /* best-effort */ }
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setPushEnabled(true); setPushMessage(t('profile.pushEnabled'));
    } catch (e) { setPushError(e instanceof Error ? e.message : t('common.error')); }
    finally { setIsTogglingPush(false); }
  }

  async function handleDisablePush() {
    setPushError(null); setPushMessage(null); setIsTogglingPush(true);
    try {
      const token = localStorage.getItem(FCM_TOKEN_KEY);
      if (token) { await unregisterDeviceToken(token); localStorage.removeItem(FCM_TOKEN_KEY); }
      await revokeFcmToken();
      try { await updateConsent('notif_push', false); } catch { /* best-effort */ }
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setPushEnabled(false); setPushMessage(t('profile.pushDisabled'));
    } catch (e) { setPushError(e instanceof Error ? e.message : t('common.error')); }
    finally { setIsTogglingPush(false); }
  }

  async function handleTestPush() {
    setPushError(null); setPushMessage(null);
    try { const result = await sendTestPush(); setPushMessage(t('profile.testSent', { count: result.tokensTargeted })); }
    catch (e) { setPushError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleRegenerate() {
    if (!window.confirm(t('profile.regenerateConfirm'))) return;
    setIsRegenerating(true); setError(null);
    try {
      const result = await regenerateRecoveryCodes();
      setNewRecoveryCodes(result.recoveryCodes);
      setUser((prev) => prev && { ...prev, twoFactorRecoveryCodesRemaining: result.recoveryCodes.length });
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setIsRegenerating(false); }
  }

  function toggleInteresse(name: string) {
    setInteressi((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));
  }

  async function handleSaveCittadino(event: FormEvent) {
    event.preventDefault(); setMessage(null); setError(null);
    try { await updateProfile({ nome, cognome, interessi }); setMessage(t('profile.profileSaved')); window.dispatchEvent(new CustomEvent('tla:user-updated')); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleSaveEnte(event: FormEvent) {
    event.preventDefault(); setMessage(null); setError(null);
    try { await updateEnteProfile({ noteAdmin }); setMessage(t('profile.notesSaved')); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleShareLocation() {
    if (locationInFlight.current) return;
    if (!navigator.geolocation) { setLocationError(t('profile.locationUnsupported')); return; }
    locationInFlight.current = true;
    setLocationError(null);
    setLocationMessage(t('profile.locationDetecting'));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await updateLocation(pos.coords.latitude, pos.coords.longitude);
          const placeName = result.address || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
          setLocationMessage(t('profile.locationUpdated', { place: placeName }));
          setLocationError(null);
        } catch (e) { setLocationError(e instanceof Error ? e.message : t('common.error')); setLocationMessage(null); }
        finally { locationInFlight.current = false; }
      },
      (err) => {
        const reasons: Record<number, string> = {
          1: t('profile.locationDenied'),
          2: t('profile.locationUnavailable'),
          3: t('profile.locationTimeout'),
        };
        setLocationError(reasons[err.code] ?? `Error (code ${err.code})`);
        setLocationMessage(null);
        locationInFlight.current = false;
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }

  async function handleLogout() {
    const fcmToken = localStorage.getItem(FCM_TOKEN_KEY);
    if (fcmToken) { try { await unregisterDeviceToken(fcmToken); } catch { /* ignore */ } localStorage.removeItem(FCM_TOKEN_KEY); }
    await logout();
    navigate('/');
  }

  async function handleDelete() {
    setError(null);
    const payload: { currentPassword?: string; confirmEmail?: string } = {};
    if (user?.hasPassword) {
      if (!deletePassword) { setError(t('profile.deletePasswordRequired')); return; }
      payload.currentPassword = deletePassword;
    } else {
      const expected = `DELETE ${user?.email || ''}`.toLowerCase().trim();
      if (deleteEmailConfirm.trim().toLowerCase() !== expected) {
        setError(`${t('profile.deleteConfirmType')} DELETE ${user?.email}`);
        return;
      }
      payload.confirmEmail = deleteEmailConfirm;
    }
    try {
      localStorage.removeItem(FCM_TOKEN_KEY);
      await deleteAccount(payload);
      setToken(null);
      navigate('/');
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault(); setPwdError(null); setPwdMessage(null);
    if (pwdNew !== pwdConfirm) { setPwdError(t('profile.passwordMismatch')); return; }
    if (pwdNew === pwdCurrent) { setPwdError(t('profile.passwordSameAsCurrent')); return; }
    setPwdSaving(true);
    try {
      await changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdMessage(t('profile.passwordUpdated'));
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
      setToken(null);
      setTimeout(() => { navigate('/login'); window.location.reload(); }, 1500);
    } catch (e) { setPwdError(e instanceof Error ? e.message : t('common.error')); }
    finally { setPwdSaving(false); }
  }

  if (isLoading) return <section className="data-page"><div className="state-panel liquid-panel">{t('profile.loading')}</div></section>;
  if (!user) return <Navigate to="/login" replace />;

  const profile = user.profile;
  const role = user.ruolo;
  const isCittadino = profile?.kind === 'cittadino';
  const isEnte = profile?.kind === 'ente';
  const isComunale = profile?.kind === 'comunale';
  const isSistema = profile?.kind === 'sistema';

  const roleLabel = role ? (t(`profile.roles.${role}`, { defaultValue: role }) as string) : '—';
  const displayName = isCittadino
    ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || (user.email || t('common.name'))
    : isEnte ? (profile.nomeEnte || user.email || t('common.name'))
    : (isComunale || isSistema) ? `${profile.nome || ''} ${profile.cognome || ''}`.trim() || (user.email || t('common.name'))
    : user.email || t('common.name');

  return (
    <section className="data-page profile-page">
      <header className="profile-hero liquid-card">
        <div className="profile-avatar-big" aria-hidden="true">{initials(profile, user)}</div>
        <div className="profile-hero-info">
          <h1>{displayName}</h1>
          <p>
            <span className="role-badge">{roleLabel}</span>
            <span className="muted-copy"> · {user.email}</span>
          </p>
          {isEnte && (
            <p>
              {profile.approvato
                ? <span className="report-stato report-stato-done">{t('profile.entityApproved')}</span>
                : <span className="report-stato report-stato-open">{t('profile.entityPending')}</span>}
            </p>
          )}
        </div>
        <button type="button" className="ghost-button" onClick={handleLogout}>{t('nav.logout')}</button>
      </header>

      <div className="profile-main-grid">
        <div className="profile-col">
          {isCittadino && (
            <form className="auth-form liquid-card" onSubmit={handleSaveCittadino}>
              <h2>{t('profile.citizenData')}</h2>
              <div className="filter-row">
                <label><span>{t('common.name')}</span><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
                <label><span>{t('common.lastName')}</span><input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} /></label>
              </div>
              <label>
                <span>{t('profile.fiscalCode')}</span>
                <input type="text" value={profile.codiceFiscale || ''} disabled readOnly />
                <small>{t('profile.fiscalCodeReadOnly')}</small>
              </label>
              <label>
                <span>{t('profile.birthDate')}</span>
                <input type="text" value={profile.dataNascita ? new Date(profile.dataNascita + 'T00:00:00').toLocaleDateString() : '—'} disabled readOnly />
              </label>
              <fieldset>
                <legend>{t('profile.interests')}</legend>
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
              <button className="primary-button" type="submit">{t('profile.saveChanges')}</button>
            </form>
          )}

          {isEnte && (
            <form className="auth-form liquid-card" onSubmit={handleSaveEnte}>
              <h2>{t('profile.entityData')}</h2>
              <label><span>{t('profile.entityName')}</span><input type="text" value={profile.nomeEnte || ''} disabled readOnly /></label>
              <label>
                <span>{t('profile.pec')}</span>
                <input type="text" value={profile.pec || ''} disabled readOnly />
                <small>{t('profile.pecReadOnly')}</small>
              </label>
              <label>
                <span>{t('profile.entityNotes')}</span>
                <textarea rows={4} value={noteAdmin} onChange={(e) => setNoteAdmin(e.target.value)} placeholder={t('profile.entityNotesPlaceholder')} />
              </label>
              {message && <div className="form-success">{message}</div>}
              {error && <div className="form-error">{error}</div>}
              <button className="primary-button" type="submit">{t('profile.saveNotes')}</button>
            </form>
          )}

          {isComunale && (
            <div className="auth-form liquid-card">
              <h2>{t('profile.comunalData')}</h2>
              <div className="filter-row">
                <label><span>{t('common.name')}</span><input type="text" value={profile.nome || ''} disabled readOnly /></label>
                <label><span>{t('common.lastName')}</span><input type="text" value={profile.cognome || ''} disabled readOnly /></label>
              </div>
              <label><span>{t('profile.office')}</span><input type="text" value={profile.ufficio || '—'} disabled readOnly /></label>
              <label>
                <span>{t('profile.spidId')}</span>
                <input type="text" value={profile.spidId || '—'} disabled readOnly />
                <small>{t('profile.spidReadOnly')}</small>
              </label>
            </div>
          )}

          {isSistema && (
            <div className="auth-form liquid-card">
              <h2>{t('profile.sistemaData')}</h2>
              <div className="filter-row">
                <label><span>{t('common.name')}</span><input type="text" value={profile.nome || ''} disabled readOnly /></label>
                <label><span>{t('common.lastName')}</span><input type="text" value={profile.cognome || ''} disabled readOnly /></label>
              </div>
              {profile.superAdmin && <p><span className="report-stato report-stato-done">{t('profile.superAdmin')}</span></p>}
            </div>
          )}

          {isCittadino && (
            <div className="auth-form liquid-card">
              <h2>{t('profile.location')}</h2>
              <p>{t('profile.locationHint')}</p>
              {locationMessage && <div className="form-success">{locationMessage}</div>}
              {locationError && <div className="form-error">{locationError}</div>}
              <button type="button" className="primary-button" onClick={handleShareLocation}>{t('profile.shareLocation')}</button>
            </div>
          )}
        </div>

        <div className="profile-col">
          {(isCittadino || isEnte || isComunale || isSistema) && (() => {
            const browserBlocked = 'Notification' in window && Notification.permission === 'denied';
            const consentDenied = notifSummary.notif_push === false;
            const pushActive = pushEnabled && !consentDenied && !browserBlocked;
            return (
              <div className="auth-form liquid-card">
                <h2>{t('profile.pushNotifications')}</h2>
                {browserBlocked ? (
                  <p className="form-error" style={{ margin: 0 }}>{t('profile.pushBlocked')}</p>
                ) : pushActive ? (
                  <p className="muted-copy" style={{ marginTop: 0 }}>{t('profile.pushActive')}</p>
                ) : (
                  <p className="muted-copy" style={{ marginTop: 0 }}>{t('profile.pushInactive')}</p>
                )}
                {pushMessage && <div className="form-success">{pushMessage}</div>}
                {pushError && <div className="form-error">{pushError}</div>}
                {!browserBlocked && (
                  <div className="filter-actions">
                    {pushActive ? (
                      <>
                        <button type="button" className="primary-button" onClick={handleTestPush}>{t('profile.sendTest')}</button>
                        <button type="button" onClick={handleDisablePush} disabled={isTogglingPush}>{isTogglingPush ? '...' : t('profile.disable')}</button>
                      </>
                    ) : (
                      <button type="button" className="primary-button" onClick={handleEnablePush} disabled={isTogglingPush}>{isTogglingPush ? '...' : t('profile.enablePush')}</button>
                    )}
                  </div>
                )}
                <p className="muted-copy" style={{ fontSize: 12, margin: '6px 0 0' }}>
                  Email: <strong>{notifSummary.notif_email === false ? 'OFF' : 'ON'}</strong>
                  {' · '}
                  {t('profile.managePrefsPrefix')}{' '}<a href="/impostazioni">{t('settings.title')}</a>.
                </p>
                {isSistema && (
                  <p className="muted-copy" style={{ fontSize: 12, margin: '8px 0 0' }}>
                    📣 {t('profile.broadcastLinkText')}: <a href="/admin/notifiche">{t('admin.notifications.title')}</a>.
                  </p>
                )}
              </div>
            );
          })()}

          {(isSistema || user.twoFactorEnabled) && (
            <div className="auth-form liquid-card">
              <h2>{t('profile.twoFactor')}</h2>
              {user.twoFactorEnabled ? (
                <p>{t('profile.twoFactorActive', { remaining: user.twoFactorRecoveryCodesRemaining ?? 0 })}</p>
              ) : (
                <p>{t('profile.twoFactorInactive')}</p>
              )}
              {newRecoveryCodes && (
                <>
                  <div className="warning-box"><strong>{t('profile.recoverySaveWarning')}</strong></div>
                  <div className="recovery-codes-grid">{newRecoveryCodes.map((c) => <code key={c} className="recovery-code">{c}</code>)}</div>
                  <div className="filter-actions">
                    <button type="button" onClick={() => navigator.clipboard.writeText(newRecoveryCodes.join('\n'))}>{t('profile.copyCode')}</button>
                    <button type="button" onClick={() => setNewRecoveryCodes(null)}>{t('profile.savedCodes')}</button>
                  </div>
                </>
              )}
              {!newRecoveryCodes && (
                <div className="filter-actions">
                  {user.twoFactorEnabled && (
                    <button type="button" className="primary-button" onClick={handleRegenerate} disabled={isRegenerating}>
                      {isRegenerating ? t('profile.regenerating') : t('profile.regenerate')}
                    </button>
                  )}
                  <button type="button" onClick={() => navigate('/setup-2fa')}>
                    {user.twoFactorEnabled ? t('profile.changeAuthenticator') : t('profile.configure2FA')}
                  </button>
                </div>
              )}
            </div>
          )}

          {user.hasPassword && (
            <form className="auth-form liquid-card" onSubmit={handleChangePassword}>
              <h2>{t('profile.changePassword')}</h2>
              <p className="muted-copy" style={{ marginTop: 0 }}>{t('profile.changePasswordHint')}</p>
              <label><span>{t('profile.currentPassword')}</span><input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} autoComplete="current-password" required /></label>
              <label><span>{t('profile.newPassword')}</span><input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
              <label><span>{t('profile.confirmNewPassword')}</span><input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
              <p className="muted-copy" style={{ fontSize: 12, margin: '4px 0 0' }}>{t('profile.passwordHint')}</p>
              {pwdError && <div className="form-error">{pwdError}</div>}
              {pwdMessage && <div className="form-success">{pwdMessage}</div>}
              <button className="primary-button" type="submit" disabled={pwdSaving || !pwdCurrent || !pwdNew}>
                {pwdSaving ? t('profile.saving') : t('profile.updatePassword')}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="profile-delete-footer">
        {!confirmingDelete ? (
          <button type="button" className="ghost-button danger-text" onClick={() => setConfirmingDelete(true)}>{t('profile.deleteAccount')}</button>
        ) : (
          <div className="profile-delete-confirm liquid-card">
            <strong>{t('profile.confirmDeleteTitle')}</strong>
            <p>{t('profile.deleteIrreversible')}</p>
            {user.hasPassword ? (
              <label>
                <span>{t('profile.currentPassword')}</span>
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" required />
              </label>
            ) : (
              <label>
                <span>{t('profile.deleteConfirmType')} <code>DELETE {user.email}</code></span>
                <input type="text" value={deleteEmailConfirm} onChange={(e) => setDeleteEmailConfirm(e.target.value)} placeholder={`DELETE ${user.email}`} autoComplete="off" />
              </label>
            )}
            <div className="filter-actions">
              <button type="button" onClick={() => { setConfirmingDelete(false); setDeleteEmailConfirm(''); setDeletePassword(''); setError(null); }}>{t('common.cancel')}</button>
              <button type="button" className="danger-button compact-button" onClick={handleDelete}>{t('profile.deleteFinal')}</button>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
