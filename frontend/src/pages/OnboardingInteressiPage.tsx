import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { completeOnboarding, getMe, getSuggestedInterests } from '../lib/api';

function ageFromIso(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

const INTEREST_KEYS = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio', 'natura', 'tecnologia', 'volontariato'];
const EMOJIS: Record<string, string> = {
  sport: '⚽', cultura: '📚', musica: '🎶', arte: '🎨',
  gastronomia: '🍝', studio: '🧠', natura: '🌲', tecnologia: '💻', volontariato: '🤝',
};

export function OnboardingInteressiPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsBirthdate, setNeedsBirthdate] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const suggestionTimer = useRef<number | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => {
        if (me.profile?.kind === 'cittadino') {
          const dob = (me.profile as { dataNascita?: string }).dataNascita;
          if (!dob || dob.startsWith('2000-01-01')) setNeedsBirthdate(true);
        }
      })
      .catch(() => {});
  }, []);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const fetchSuggestions = useCallback((picked: string[]) => {
    if (suggestionTimer.current) window.clearTimeout(suggestionTimer.current);
    if (picked.length === 0) { setSuggestions([]); return; }
    suggestionTimer.current = window.setTimeout(() => {
      getSuggestedInterests(picked).then((r) => setSuggestions(r.suggestions)).catch(() => setSuggestions([]));
    }, 400);
  }, []);

  useEffect(() => { fetchSuggestions(selected); }, [selected, fetchSuggestions]);

  // Pre-compila la data di nascita se l'utente ne ha già una reale (es. registrato
  // con email). Gli account social hanno il placeholder 2000-01-01 → lasciamo vuoto
  // così la inseriscono davvero.
  useEffect(() => {
    getMe().then((me) => {
      const p = me.profile;
      const d = p && p.kind === 'cittadino' ? p.dataNascita : undefined;
      if (d && !d.startsWith('2000-01-01')) setDataNascita(d.slice(0, 10));
    }).catch(() => {});
  }, []);

  async function handleSave(skip: boolean) {
    setError(null);
    if (needsBirthdate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        setError(t('registration.birthDate') + ': ' + t('registration.ageGate'));
        return;
      }
      const age = ageFromIso(birthdate);
      if (Number.isNaN(age) || age < 13 || age > 120) {
        setError(t('registration.ageGate'));
        return;
      }
    }
    setSaving(true);
    try {
      await completeOnboarding({ interessi: skip ? [] : selected, ...(needsBirthdate ? { dataNascita: birthdate } : {}) });
      window.dispatchEvent(new CustomEvent('tla:user-updated'));
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="auth-page onboarding-page">
      <div className="liquid-card onboarding-card" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <span className="section-eyebrow">{t('onboarding.welcome')}</span>
          <h1 id="onboarding-title">{t('onboarding.title')}</h1>
          <p>{t('onboarding.subtitle')}</p>
        </header>

        {needsBirthdate && (
          <section className="onboarding-birthdate-section">
            <div className="onboarding-section-copy">
              <h2>{t('registration.birthDate')}</h2>
              <p>{t('registration.ageGate')}</p>
            </div>
            <label>
              <span>{t('registration.birthDate')}</span>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
              <small>{t('registration.ageGate')}</small>
            </label>
          </section>
        )}

        <section className="onboarding-interest-section" aria-labelledby="interest-selection-title">
          <div className="onboarding-section-copy">
            <h2 id="interest-selection-title">{t('onboarding.selectTitle')}</h2>
            <p>{t('onboarding.selectSubtitle')}</p>
          </div>

          <div className="onboarding-grid">
            {INTEREST_KEYS.map((key) => {
              const active = selected.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`onboarding-tile ${active ? 'active' : ''}`}
                  onClick={() => toggle(key)}
                  aria-pressed={active}
                >
                  <span className="onboarding-tile-check" aria-hidden="true">✓</span>
                  <span className="onboarding-emoji" aria-hidden="true">{EMOJIS[key]}</span>
                  <strong>{t(`onboarding.interests.${key}.label`)}</strong>
                  <small>{t(`onboarding.interests.${key}.description`)}</small>
                </button>
              );
            })}
          </div>
        </section>

        {suggestions.length > 0 && (
          <div className="onboarding-suggestions">
            <strong>{t('onboarding.suggestions')}</strong>
            <div className="onboarding-suggestion-list">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  className="chip"
                  onClick={() => toggle(s)}
                  aria-pressed={selected.includes(s)}
                >
                  {t(`onboarding.interests.${s}.label`, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) })}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="form-error onboarding-error" role="alert">{error}</div>}

        <div className="filter-actions onboarding-actions">
          <button
            type="button"
            className="primary-button"
            disabled={saving || selected.length === 0 || (needsBirthdate && !birthdate)}
            onClick={() => handleSave(false)}
          >
            {saving ? t('onboarding.saving') : selected.length > 0 ? t('onboarding.continueCount', { count: selected.length }) : t('onboarding.continue')}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={saving || (needsBirthdate && !birthdate)}
            onClick={() => handleSave(true)}
          >
            {t('onboarding.skip')}
          </button>
        </div>
      </div>
    </section>
  );
}
