import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStoredTheme, setTheme, type Theme } from '../lib/theme';
import { setLanguage } from '../lib/i18n';
import { getToken, listConsents, summarizeConsents, updateConsent } from '../lib/api';
import i18n from 'i18next';

type Lang = 'it' | 'en';

function getStoredLang(): Lang {
  const v = i18n.language;
  return v?.startsWith('en') ? 'en' : 'it';
}

export function SettingsPage() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [lang, setLang] = useState<Lang>(() => getStoredLang());
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    listConsents()
      .then((records) => {
        const summary = summarizeConsents(records);
        // Default true: se non c'è un record esplicito di revoca, notifiche attive.
        setNotifEmail(summary.notif_email !== false);
        setNotifPush(summary.notif_push !== false);
      })
      .catch(() => { /* offline → mantieni default */ });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2200);
    return () => clearTimeout(t);
  }, [saved]);

  function changeTheme(next: Theme) {
    setThemeState(next);
    setTheme(next);
    setSaved(true);
  }

  function changeLang(next: Lang) {
    setLang(next);
    setLanguage(next);
    setSaved(true);
  }

  async function toggleNotif(kind: 'email' | 'push', value: boolean) {
    setNotifError(null);
    if (kind === 'email') setNotifEmail(value);
    else setNotifPush(value);
    if (!isLoggedIn) {
      // Per ospiti tieni in localStorage; verranno applicati al primo login.
      window.localStorage.setItem(`tla:notif:${kind}`, String(value));
      setSaved(true);
      return;
    }
    try {
      await updateConsent(kind === 'email' ? 'notif_email' : 'notif_push', value);
      // Se l'utente disattiva push da qui, ripulisci anche il token FCM locale:
      // il backend ha già revocato tutti i DeviceToken, ma il browser conserva
      // ancora il sottoscrittore. Eviterebbe il falso "Attive su questo browser".
      if (kind === 'push' && !value) {
        window.localStorage.removeItem('tla_fcm_token');
      }
      // Notifica le altre pagine (es. ProfilePage riepilogo) per refresh.
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setSaved(true);
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : 'Errore salvataggio preferenza');
      // Rollback ottimistico
      if (kind === 'email') setNotifEmail(!value);
      else setNotifPush(!value);
    }
  }

  return (
    <section className="data-page settings-page">
      <header className="utility-strip liquid-card">
        <div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
        {saved && <span className="settings-saved" role="status">{t('settings.saved')}</span>}
      </header>

      <div className="liquid-card settings-card">
        <h2>{t('settings.appearance')}</h2>
        <div className="settings-theme-switch" role="radiogroup" aria-label={t('settings.appearance')}>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            className={theme === 'light' ? 'active' : ''}
            onClick={() => changeTheme('light')}
          >
            <span className="settings-theme-swatch settings-theme-swatch-light" />
            <strong>{t('settings.themeLight')}</strong>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => changeTheme('dark')}
          >
            <span className="settings-theme-swatch settings-theme-swatch-dark" />
            <strong>{t('settings.themeDark')}</strong>
          </button>
        </div>
      </div>

      <div className="liquid-card settings-card">
        <h2>{t('settings.language')}</h2>
        <label className="settings-row">
          <span>{t('settings.languageHint')}</span>
          <select value={lang} onChange={(e) => changeLang(e.target.value as Lang)}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <div className="liquid-card settings-card">
        <h2>{t('settings.notifications')}</h2>
        <p>
          Scegli come ricevere gli aggiornamenti.{' '}
          {!isLoggedIn && <em>(Accedi per salvare le preferenze sul tuo account.)</em>}
        </p>
        {notifError && <div className="form-error">{notifError}</div>}
        <label className="settings-row settings-row-toggle">
          <div>
            <strong>Email</strong>
            <small>Conferme partecipazione, modifiche eventi, segnalazioni</small>
          </div>
          <input type="checkbox" checked={notifEmail} onChange={(e) => toggleNotif('email', e.target.checked)} />
        </label>
        <label className="settings-row settings-row-toggle">
          <div>
            <strong>Push (browser)</strong>
            <small>Notifiche in tempo reale via Firebase Cloud Messaging. Disattivare revoca tutti i token dei tuoi dispositivi.</small>
          </div>
          <input type="checkbox" checked={notifPush} onChange={(e) => toggleNotif('push', e.target.checked)} />
        </label>
      </div>

      <div className="liquid-card settings-card">
        <h2>Account</h2>
        <p>Gestisci i tuoi dati personali e i consensi.</p>
        <div className="filter-actions">
          <a className="primary-button" href="/profilo">Vai al profilo</a>
          <a href="/privacy">Informativa privacy</a>
          <a href="/termini">Termini di servizio</a>
        </div>
      </div>
    </section>
  );
}
