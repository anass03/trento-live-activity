import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOnboarding, getSuggestedInterests } from '../lib/api';

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

export function OnboardingInteressiPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestionTimer = useRef<number | null>(null);

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
    setError(null); setSaving(true);
    try {
      await completeOnboarding(skip ? [] : selected);
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
            disabled={saving || selected.length === 0}
            onClick={() => handleSave(false)}
          >
            {saving ? 'Salvataggio…' : `Continua${selected.length ? ` (${selected.length})` : ''}`}
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={saving}
            onClick={() => handleSave(true)}
          >
            Salta per ora
          </button>
        </div>
      </div>
    </section>
  );
}
