import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOnboarding, getMe, getSuggestedInterests, isPlaceholderBirthdate } from '../lib/api';

const INTERESSI: Array<{ key: string; label: string; emoji: string; description: string }> = [
  { key: 'sport', label: 'Sport', emoji: '⚽', description: 'Calcetto, running, padel…' },
  { key: 'cultura', label: 'Cultura', emoji: '📚', description: 'Mostre, libri, conferenze' },
  { key: 'musica', label: 'Musica', emoji: '🎶', description: 'Concerti, jam session' },
  { key: 'arte', label: 'Arte', emoji: '🎨', description: 'Mostre, atelier, performance' },
  { key: 'gastronomia', label: 'Gastronomia', emoji: '🍝', description: 'Aperitivi, food tour' },
  { key: 'studio', label: 'Studio', emoji: '🧠', description: 'Aule, gruppi di studio' },
  { key: 'natura', label: 'Natura', emoji: '🌲', description: 'Trekking, parchi, escursioni' },
  { key: 'tecnologia', label: 'Tecnologia', emoji: '💻', description: 'Hackathon, meetup tech' },
  { key: 'volontariato', label: 'Volontariato', emoji: '🤝', description: 'Iniziative civiche' },
];

const labelFor = (key: string) =>
  INTERESSI.find((i) => i.key === key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);

// Calcolo età locale per dare feedback immediato all'utente prima di chiamare
// il backend. Il check definitivo resta lato server (auth.service:calcAge).
function ageFromIso(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NaN;
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age -= 1;
  return age;
}

export function OnboardingInteressiPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsBirthdate, setNeedsBirthdate] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const suggestionTimer = useRef<number | null>(null);

  // Determina se mostrare il campo data: se l'utente è arrivato qui con il
  // placeholder (es. signup Google senza birthday su Google) deve fornirla
  // ora per superare il check >=13 anni del GDPR.
  useEffect(() => {
    getMe()
      .then((me) => {
        if (me.profile?.kind === 'cittadino' && isPlaceholderBirthdate(me.profile.dataNascita)) {
          setNeedsBirthdate(true);
        }
      })
      .catch(() => { /* best effort: se getMe fallisce, l'errore arriverà sul submit */ });
  }, []);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  // Debounced fetch dei suggerimenti man mano che l'utente seleziona
  const fetchSuggestions = useCallback((picked: string[]) => {
    if (suggestionTimer.current) window.clearTimeout(suggestionTimer.current);
    if (picked.length === 0) { setSuggestions([]); return; }
    suggestionTimer.current = window.setTimeout(() => {
      getSuggestedInterests(picked).then((r) => setSuggestions(r.suggestions)).catch(() => setSuggestions([]));
    }, 400);
  }, []);

  useEffect(() => { fetchSuggestions(selected); }, [selected, fetchSuggestions]);

  async function handleSave(skip: boolean) {
    setError(null);
    // Pre-validation lato client: feedback immediato senza round-trip.
    if (needsBirthdate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        setError('Inserisci la tua data di nascita per continuare.');
        return;
      }
      const age = ageFromIso(birthdate);
      if (Number.isNaN(age) || age < 13) {
        setError('Devi avere almeno 13 anni per usare il servizio (GDPR art. 8).');
        return;
      }
      if (age > 120) {
        setError('Data di nascita non valida.');
        return;
      }
    }
    setSaving(true);
    try {
      await completeOnboarding({
        interessi: skip ? [] : selected,
        ...(needsBirthdate ? { dataNascita: birthdate } : {}),
      });
      window.dispatchEvent(new CustomEvent('tla:user-updated'));
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="auth-page onboarding-page">
      <div className="auth-form liquid-card onboarding-card">
        <header className="onboarding-header">
          <span className="section-eyebrow">Benvenutə in Trento Live Activity</span>
          <h1>I tuoi interessi</h1>
          <p>Scegline qualcuno per ricevere notifiche e suggerimenti su misura. Potrai modificarli dal profilo in qualsiasi momento.</p>
        </header>

        {needsBirthdate && (
          <div className="auth-form" style={{ padding: 0, marginBottom: 16 }}>
            <label>
              <span>Data di nascita <strong style={{ color: '#d33' }}>*</strong></span>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <p className="muted-copy" style={{ fontSize: 12, margin: '4px 0 0' }}>
              Obbligatoria per legge (GDPR art. 8): il servizio è riservato ai maggiori di 13 anni.
            </p>
          </div>
        )}

        <div className="onboarding-grid">
          {INTERESSI.map((item) => {
            const active = selected.includes(item.key);
            return (
              <button
                key={item.key}
                type="button"
                className={`onboarding-tile ${active ? 'active' : ''}`}
                onClick={() => toggle(item.key)}
                aria-pressed={active}
              >
                <span className="onboarding-emoji" aria-hidden="true">{item.emoji}</span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </button>
            );
          })}
        </div>

        {suggestions.length > 0 && (
          <div className="onboarding-suggestions">
            <strong>Anche utenti come te seguono:</strong>
            <div>
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  className="chip"
                  onClick={() => toggle(s)}
                  aria-pressed={selected.includes(s)}
                >
                  + {labelFor(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="filter-actions onboarding-actions">
          <button
            type="button"
            className="primary-button"
            disabled={saving || selected.length === 0 || (needsBirthdate && !birthdate)}
            onClick={() => handleSave(false)}
          >
            {saving ? 'Salvataggio…' : `Continua${selected.length ? ` (${selected.length})` : ''}`}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={saving || (needsBirthdate && !birthdate)}
            onClick={() => handleSave(true)}
          >
            Salta per ora
          </button>
        </div>
      </div>
    </section>
  );
}
