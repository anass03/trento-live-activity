import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Palette, Globe, Bell, ShieldCheck, SlidersHorizontal,
  Accessibility, User, ExternalLink, LogOut, Trash2,
} from 'lucide-react';
import { getStoredTheme, setTheme, type Theme } from '../lib/theme';
import { setLanguage } from '../lib/i18n';
import {
  getToken, logout, deleteAccount,
  getSettings, updateAppearance, updateLanguageFormat,
  updateNotifications, updatePrivacyLocation, updatePreferences,
  updateAccessibility, type UserSettings,
} from '../lib/api';
import type { AppUser } from '../data/mockUser';
import { SetCard } from '../components/redesign/SetCard';
import { SetRow } from '../components/redesign/SetRow';
import { SetRadio } from '../components/redesign/SetRadio';
import { SetTheme } from '../components/redesign/SetTheme';
import '../styles/settings-redesign.css';

// ── Default settings (used when backend is unreachable or user is anonymous)
const DEFAULTS: UserSettings = {
  themeMode: 'light',
  visualEffects: 'full',
  language: 'it',
  timeFormat: '24h',
  distanceUnit: 'km',
  emailNotificationsEnabled: true,
  pushNotificationsEnabled: false,
  eventNotificationsEnabled: true,
  activityNotificationsEnabled: true,
  cityAlertNotificationsEnabled: true,
  locationMode: 'manual',
  participationVisibility: 'public',
  showProfileInParticipants: true,
  interestsJson: [],
  showOnlyReliableActivities: false,
  showVerifiedActivities: false,
  reduceAnimations: false,
  increaseContrast: false,
  largerText: false,
};

interface SettingsPageProps {
  user: AppUser;
}

export function SettingsPage({ user }: SettingsPageProps) {
  const { t } = useTranslation();
  void t; // suppress unused – keys not added yet

  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULTS, themeMode: getStoredTheme() });
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!getToken();

  // ── Fetch settings from backend on mount ──
  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    getSettings()
      .then((s) => setSettings({ ...s, themeMode: getStoredTheme() }))
      .catch(() => { /* offline → keep defaults */ })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  // ── Persist helper: updates local state + calls backend ──
  const patch = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K], apiFn: (data: Record<string, unknown>) => Promise<unknown>) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (isLoggedIn) void apiFn({ [key]: value }).catch(() => { /* TODO: toast error */ });
    },
    [isLoggedIn],
  );

  // ── Section 1: Appearance ──
  function handleTheme(next: Theme) {
    setSettings((prev) => ({ ...prev, themeMode: next }));
    setTheme(next);
    if (isLoggedIn) void updateAppearance({ themeMode: next }).catch(() => {});
  }
  function handleVisualEffects(v: string) {
    patch('visualEffects', v, (d) => updateAppearance(d as { visualEffects: string }));
  }

  // ── Section 2: Language & Format ──
  function handleLanguage(v: string) {
    setSettings((prev) => ({ ...prev, language: v }));
    setLanguage(v as 'it' | 'en');
    if (isLoggedIn) void updateLanguageFormat({ language: v }).catch(() => {});
  }
  function handleTimeFormat(v: string) {
    patch('timeFormat', v, (d) => updateLanguageFormat(d as { timeFormat: string }));
  }
  function handleDistanceUnit(v: string) {
    patch('distanceUnit', v, (d) => updateLanguageFormat(d as { distanceUnit: string }));
  }

  // ── Section 3: Notifications ──
  function handleNotifToggle(key: keyof Pick<UserSettings, 'emailNotificationsEnabled' | 'pushNotificationsEnabled' | 'eventNotificationsEnabled' | 'activityNotificationsEnabled' | 'cityAlertNotificationsEnabled'>) {
    return (value: boolean) => {
      patch(key, value, (d) => updateNotifications(d as Record<string, boolean>));
    };
  }

  // ── Section 4: Privacy & Location ──
  function handleLocationMode(v: string) {
    patch('locationMode', v, (d) => updatePrivacyLocation(d as { locationMode: string }));
  }
  function handleParticipationVisibility(v: string) {
    patch('participationVisibility', v, (d) => updatePrivacyLocation(d as { participationVisibility: string }));
  }
  function handleShowProfile(v: boolean) {
    patch('showProfileInParticipants', v, (d) => updatePrivacyLocation(d as { showProfileInParticipants: boolean }));
  }

  // ── Section 5: Preferences ──
  function handleReliable(v: boolean) {
    patch('showOnlyReliableActivities', v, (d) => updatePreferences(d as { showOnlyReliableActivities: boolean }));
  }
  function handleVerified(v: boolean) {
    patch('showVerifiedActivities', v, (d) => updatePreferences(d as { showVerifiedActivities: boolean }));
  }

  // ── Section 6: Accessibility ──
  function handleAccessibility(key: 'reduceAnimations' | 'increaseContrast' | 'largerText') {
    return (value: boolean) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      // Apply CSS classes to documentElement
      const cls = key === 'reduceAnimations' ? 'reduce-motion'
        : key === 'increaseContrast' ? 'high-contrast'
        : 'larger-text';
      document.documentElement.classList.toggle(cls, value);
      if (isLoggedIn) void updateAccessibility({ [key]: value }).catch(() => {});
    };
  }

  // ── Section 7: Account ──
  async function handleLogout() {
    await logout();
    window.location.href = '/';
  }
  async function handleDeleteAccount() {
    // TODO: add confirmation dialog
    if (!window.confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile.')) return;
    try {
      await deleteAccount();
      window.location.href = '/';
    } catch {
      /* TODO: toast error */
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <section className="data-page settings-scene">
        {/* TODO: i18n key settings.loading */}
        <div className="settings-loading">Caricamento impostazioni…</div>
      </section>
    );
  }

  return (
    <section className="data-page settings-scene">
      {/* ── Heading ── */}
      <div className="settings-heading">
        {/* TODO: i18n key settings.title */}
        <h1>Impostazioni</h1>
        {/* TODO: i18n key settings.subtitle */}
        <p>Personalizza l'esperienza, le notifiche e la privacy della tua app.</p>
      </div>

      {/* ── Grid: 2 columns for sections 1-6 ── */}
      <div className="settings-grid">

        {/* ── 01 Aspetto ── */}
        <SetCard
          num={1}
          /* TODO: i18n key settings.appearance.title */
          title="Aspetto"
          /* TODO: i18n key settings.appearance.desc */
          desc="Tema e effetti visivi"
          icon="Palette"
          color="oklch(0.65 0.15 330)"
        >
          <SetTheme value={settings.themeMode as Theme} onChange={handleTheme} />
          {/* TODO: i18n labels */}
          <SetRadio
            options={[
              { value: 'full', label: 'Effetti completi' },
              { value: 'reduced', label: 'Ridotti' },
              { value: 'none', label: 'Nessuno' },
            ]}
            value={settings.visualEffects}
            onChange={handleVisualEffects}
          />
        </SetCard>

        {/* ── 02 Lingua e Formato ── */}
        <SetCard
          num={2}
          /* TODO: i18n key settings.languageFormat.title */
          title="Lingua e formato"
          /* TODO: i18n key settings.languageFormat.desc */
          desc="Lingua, formato orario e unità"
          icon="Globe"
          color="oklch(0.60 0.14 240)"
        >
          {/* TODO: i18n labels */}
          <SetRadio
            options={[
              { value: 'it', label: 'Italiano' },
              { value: 'en', label: 'English' },
            ]}
            value={settings.language}
            onChange={handleLanguage}
          />
          <SetRadio
            options={[
              { value: '24h', label: '24 ore' },
              { value: '12h', label: '12 ore (AM/PM)' },
            ]}
            value={settings.timeFormat}
            onChange={handleTimeFormat}
          />
          <SetRadio
            options={[
              { value: 'km', label: 'Chilometri' },
              { value: 'mi', label: 'Miglia' },
            ]}
            value={settings.distanceUnit}
            onChange={handleDistanceUnit}
          />
        </SetCard>

        {/* ── 03 Notifiche ── */}
        <SetCard
          num={3}
          /* TODO: i18n key settings.notifications.title */
          title="Notifiche"
          /* TODO: i18n key settings.notifications.desc */
          desc="Scegli cosa ricevere"
          icon="Bell"
          color="oklch(0.68 0.16 55)"
        >
          {/* TODO: i18n labels */}
          <SetRow label="Email" sub="Aggiornamenti via email" on={settings.emailNotificationsEnabled} onChange={handleNotifToggle('emailNotificationsEnabled')} />
          <SetRow label="Push" sub="Notifiche push sul dispositivo" on={settings.pushNotificationsEnabled} onChange={handleNotifToggle('pushNotificationsEnabled')} />
          <SetRow label="Eventi" sub="Nuovi eventi nella tua zona" on={settings.eventNotificationsEnabled} onChange={handleNotifToggle('eventNotificationsEnabled')} />
          <SetRow label="Attività" sub="Attività dei tuoi interessi" on={settings.activityNotificationsEnabled} onChange={handleNotifToggle('activityNotificationsEnabled')} />
          <SetRow label="Avvisi città" sub="Comunicazioni dal Comune" on={settings.cityAlertNotificationsEnabled} onChange={handleNotifToggle('cityAlertNotificationsEnabled')} />
        </SetCard>

        {/* ── 04 Privacy e Posizione ── */}
        <SetCard
          num={4}
          /* TODO: i18n key settings.privacy.title */
          title="Privacy e posizione"
          /* TODO: i18n key settings.privacy.desc */
          desc="Localizzazione e visibilità"
          icon="ShieldCheck"
          color="oklch(0.55 0.18 150)"
        >
          {/* TODO: i18n labels */}
          <SetRadio
            options={[
              { value: 'auto', label: 'Automatica (GPS)' },
              { value: 'manual', label: 'Manuale' },
              { value: 'off', label: 'Disattivata' },
            ]}
            value={settings.locationMode}
            onChange={handleLocationMode}
          />
          <SetRadio
            options={[
              { value: 'public', label: 'Pubblica' },
              { value: 'friends', label: 'Solo amici' },
              { value: 'private', label: 'Privata' },
            ]}
            value={settings.participationVisibility}
            onChange={handleParticipationVisibility}
          />
          <SetRow label="Mostra profilo nei partecipanti" on={settings.showProfileInParticipants} onChange={handleShowProfile} />
        </SetCard>

        {/* ── 05 Preferenze ── */}
        <SetCard
          num={5}
          /* TODO: i18n key settings.preferences.title */
          title="Preferenze"
          /* TODO: i18n key settings.preferences.desc */
          desc="Filtra e personalizza i contenuti"
          icon="SlidersHorizontal"
          color="oklch(0.62 0.14 280)"
        >
          {/* TODO: i18n labels */}
          <SetRow label="Solo attività affidabili" sub="Nascondi quelle con pochi partecipanti" on={settings.showOnlyReliableActivities} onChange={handleReliable} />
          <SetRow label="Mostra attività verificate" sub="Evidenzia contenuti verificati" on={settings.showVerifiedActivities} onChange={handleVerified} />
        </SetCard>

        {/* ── 06 Accessibilità ── */}
        <SetCard
          num={6}
          /* TODO: i18n key settings.accessibility.title */
          title="Accessibilità"
          /* TODO: i18n key settings.accessibility.desc */
          desc="Animazioni, contrasto e dimensioni"
          icon="Accessibility"
          color="oklch(0.58 0.12 200)"
        >
          {/* TODO: i18n labels */}
          <SetRow label="Riduci animazioni" sub="Meno movimento, più comfort" on={settings.reduceAnimations} onChange={handleAccessibility('reduceAnimations')} />
          <SetRow label="Contrasto elevato" sub="Testo e bordi più visibili" on={settings.increaseContrast} onChange={handleAccessibility('increaseContrast')} />
          <SetRow label="Testo più grande" sub="Aumenta la dimensione dei caratteri" on={settings.largerText} onChange={handleAccessibility('largerText')} />
        </SetCard>

        {/* ── 07 Account (full width) ── */}
        <SetCard
          num={7}
          /* TODO: i18n key settings.account.title */
          title="Account"
          /* TODO: i18n key settings.account.desc */
          desc="Profilo, dati e sessione"
          icon="User"
          color="oklch(0.50 0.10 145)"
          full
        >
          {/* User info row */}
          <div className="s-account-user">
            <div className="s-account-avatar">{user.avatar}</div>
            <div className="s-account-info">
              <div className="s-account-name">{user.name}</div>
              {user.email && <div className="s-account-email">{user.email}</div>}
            </div>
          </div>

          {/* Links */}
          <div className="s-account-links">
            {/* TODO: i18n labels */}
            <a href="/profilo">
              <User size={15} />
              Vai al profilo
            </a>
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} />
              Privacy policy
            </a>
            <a href="/termini" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} />
              Termini di servizio
            </a>
            {isLoggedIn && (
              <>
                <button type="button" onClick={handleLogout}>
                  <LogOut size={15} />
                  Esci
                </button>
                <button type="button" className="s-danger" onClick={handleDeleteAccount}>
                  <Trash2 size={15} />
                  Elimina account
                </button>
              </>
            )}
          </div>
        </SetCard>
      </div>
    </section>
  );
}
