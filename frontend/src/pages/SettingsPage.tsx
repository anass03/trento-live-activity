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

  async function toggleNotifEmail(value: boolean) {
    setNotifError(null);
    setNotifEmail(value);
    if (!isLoggedIn) {
      window.localStorage.setItem('tla:notif:email', String(value));
      setSaved(true);
      return;
    }
    try {
      await updateConsent('notif_email', value);
      window.dispatchEvent(new CustomEvent('tla:consents-changed'));
      setSaved(true);
    } catch (e) {
      setNotifError(e instanceof Error ? e.message : 'Errore salvataggio preferenza');
      setNotifEmail(!value); // rollback
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
          {!isLoggedIn && <em>Accedi per salvare le preferenze sul tuo account. </em>}
          Le notifiche push si gestiscono dal <a href="/profilo">profilo</a> (dipendono dal browser specifico).
        </p>
        {notifError && <div className="form-error">{notifError}</div>}
        <label className="settings-row settings-row-toggle">
          <div>
            <strong>Email</strong>
            <small>Conferme partecipazione, modifiche eventi, segnalazioni</small>
          </div>
          <input type="checkbox" checked={notifEmail} onChange={(e) => toggleNotifEmail(e.target.checked)} />
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
