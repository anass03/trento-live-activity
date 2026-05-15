import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, registerEntity } from '../lib/api';

type Mode = 'user' | 'entity';
type PasswordStrength = { score: 1 | 2 | 3; label: string; color: string };

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score: 1, label: 'Debole', color: '#df5e5e' };
  if (score <= 4) return { score: 2, label: 'Media', color: '#d1be58' };
  return { score: 3, label: 'Forte', color: '#53e198' };
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'La password deve avere almeno 8 caratteri';
  if (!/[A-Z]/.test(password)) return 'La password deve contenere almeno una lettera maiuscola';
  if (!/[a-z]/.test(password)) return 'La password deve contenere almeno una lettera minuscola';
  if (!/[0-9]/.test(password)) return 'La password deve contenere almeno un numero';
  if (!/[^A-Za-z0-9]/.test(password)) return 'La password deve contenere almeno un carattere speciale (!@#$%...)';
  return null;
}

export function RegistrationPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('user');
  const [form, setForm] = useState({
    email: '', password: '', nome: '', cognome: '', dataNascita: '', nomeEnte: '',
  });
  const [consents, setConsents] = useState({ privacy_policy: false, terms_of_service: false, marketing: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const passwordStrength = getPasswordStrength(form.password);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }
    setIsLoading(true);
    try {
      if (mode === 'user') {
        if (!consents.privacy_policy || !consents.terms_of_service) {
          throw new Error('Devi accettare privacy policy e termini di servizio per registrarti');
        }
        const result = await register({
          email: form.email, password: form.password, nome: form.nome,
          cognome: form.cognome, dataNascita: form.dataNascita,
          consents,
        });
        if ('emailVerificationRequired' in result && result.emailVerificationRequired) {
          setSuccess('Registrazione completata. Controlla la tua email per verificare l\'account prima di accedere.');
          return;
        }
        navigate('/');
        window.location.reload();
      } else {
        const result = await registerEntity({
          email: form.email, password: form.password, nomeEnte: form.nomeEnte,
        });
        setSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form liquid-card" onSubmit={handleSubmit}>
        <h1>Registrazione</h1>

        <div className="mode-switch">
          <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>Cittadino</button>
          <button type="button" className={mode === 'entity' ? 'active' : ''} onClick={() => setMode('entity')}>Ente certificato</button>
        </div>

        {mode === 'entity' && (
          <p className="hint">La richiesta sarà sottoposta all'approvazione di un amministratore di sistema.</p>
        )}

        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
        </label>
        {passwordStrength && (
          <div className="password-strength">
            <div className="password-strength-bar">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="password-strength-segment"
                  style={{ backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#e0e0e0' }}
                />
              ))}
            </div>
            <small style={{ color: passwordStrength.color }}>{passwordStrength.label}</small>
          </div>
        )}

        {mode === 'user' ? (
          <>
            <label>
              <span>Nome</span>
              <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} required />
            </label>
            <label>
              <span>Cognome</span>
              <input type="text" value={form.cognome} onChange={(e) => update('cognome', e.target.value)} required />
            </label>
            <label>
              <span>Data di nascita</span>
              <input type="date" value={form.dataNascita} onChange={(e) => update('dataNascita', e.target.value)} required />
              <small>Devi avere almeno 13 anni (GDPR art. 8)</small>
            </label>

            <fieldset className="consents">
              <legend>Consensi (GDPR)</legend>
              <label className="checkbox">
                <input type="checkbox" checked={consents.privacy_policy} onChange={(e) => setConsents({ ...consents, privacy_policy: e.target.checked })} required />
                <span>Accetto la privacy policy *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.terms_of_service} onChange={(e) => setConsents({ ...consents, terms_of_service: e.target.checked })} required />
                <span>Accetto i termini di servizio *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.marketing} onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })} />
                <span>Accetto di ricevere comunicazioni di marketing (facoltativo)</span>
              </label>
            </fieldset>
          </>
        ) : (
          <>
            <label>
              <span>Nome dell'ente</span>
              <input type="text" value={form.nomeEnte} onChange={(e) => update('nomeEnte', e.target.value)} required />
            </label>
          </>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Registrazione in corso...' : 'Registrati'}
        </button>

        <div className="auth-links">
          <Link to="/login">Hai già un account? Accedi</Link>
        </div>
      </form>
    </section>
  );
}
