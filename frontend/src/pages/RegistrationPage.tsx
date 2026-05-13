import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, registerEntity } from '../lib/api';

type Mode = 'user' | 'entity';

interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '' };
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

function validatePasswordClient(password: string): string | null {
  if (password.length < 8) return 'Minimo 8 caratteri';
  if (!/[A-Z]/.test(password)) return 'Serve almeno una lettera maiuscola';
  if (!/[a-z]/.test(password)) return 'Serve almeno una lettera minuscola';
  if (!/[0-9]/.test(password)) return 'Serve almeno un numero';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Serve almeno un carattere speciale (!@#$%...)';
  return null;
}

function validateEmail(email: string): string | null {
  if (!email) return 'Email obbligatoria';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Formato email non valido';
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = getPasswordStrength(form.password);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function calcAge(dataNascita: string): number {
    const today = new Date();
    const birth = new Date(dataNascita);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function clientValidate(): string | null {
    const emailErr = validateEmail(form.email);
    if (emailErr) return emailErr;
    const pwErr = validatePasswordClient(form.password);
    if (pwErr) return pwErr;
    if (mode === 'user') {
      if (!form.nome.trim()) return 'Nome obbligatorio';
      if (!form.cognome.trim()) return 'Cognome obbligatorio';
      if (!form.dataNascita) return 'Data di nascita obbligatoria';
      if (calcAge(form.dataNascita) < 13) return 'Devi avere almeno 13 anni per registrarti (GDPR art. 8)';
      if (!consents.privacy_policy || !consents.terms_of_service) return 'Devi accettare privacy policy e termini di servizio';
    } else {
      if (!form.nomeEnte.trim()) return 'Nome dell\'ente obbligatorio';
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const clientErr = clientValidate();
    if (clientErr) { setError(clientErr); return; }
    setIsLoading(true);
    try {
      if (mode === 'user') {
        await register({
          email: form.email, password: form.password, nome: form.nome,
          cognome: form.cognome, dataNascita: form.dataNascita, consents,
        });
        setSuccess(`Registrazione completata! Abbiamo inviato un'email di verifica a ${form.email}. Clicca il link nell'email per attivare il tuo account.`);
      } else {
        const result = await registerEntity({ email: form.email, password: form.password, nomeEnte: form.nomeEnte });
        setSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  }

  const emailErr = touched.email ? validateEmail(form.email) : null;
  const pwErr = touched.password && form.password ? validatePasswordClient(form.password) : null;

  return (
    <section className="auth-page">
      <form className="auth-form glass-card" onSubmit={handleSubmit} noValidate>
        <h1>Registrazione</h1>

        <div className="mode-switch">
          <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => { setMode('user'); setError(null); setSuccess(null); }}>Cittadino</button>
          <button type="button" className={mode === 'entity' ? 'active' : ''} onClick={() => { setMode('entity'); setError(null); setSuccess(null); }}>Ente certificato</button>
        </div>

        {mode === 'entity' && (
          <p className="hint">La richiesta sarà sottoposta all'approvazione di un amministratore di sistema.</p>
        )}

        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            onBlur={() => touch('email')}
            required
          />
          {emailErr && <small style={{ color: '#ffd0d0' }}>{emailErr}</small>}
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            onBlur={() => touch('password')}
            required
          />
          {form.password && (
            <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4, height: 4 }}>
                {([1, 2, 3] as const).map((level) => (
                  <div
                    key={level}
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background: strength.score >= level ? strength.color : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
              <small style={{ color: strength.color }}>{strength.label}</small>
            </div>
          )}
          {pwErr && <small style={{ color: '#ffd0d0' }}>{pwErr}</small>}
          {!pwErr && (
            <small style={{ color: 'var(--color-text-secondary)' }}>
              Min. 8 caratteri, una maiuscola, una minuscola, un numero, un carattere speciale
            </small>
          )}
        </label>

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
                <input type="checkbox" checked={consents.privacy_policy} onChange={(e) => setConsents({ ...consents, privacy_policy: e.target.checked })} />
                <span>Accetto la privacy policy *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.terms_of_service} onChange={(e) => setConsents({ ...consents, terms_of_service: e.target.checked })} />
                <span>Accetto i termini di servizio *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.marketing} onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })} />
                <span>Accetto di ricevere comunicazioni di marketing (facoltativo)</span>
              </label>
            </fieldset>
          </>
        ) : (
          <label>
            <span>Nome dell'ente</span>
            <input type="text" value={form.nomeEnte} onChange={(e) => update('nomeEnte', e.target.value)} required />
          </label>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {!success && (
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        )}

        <div className="auth-links">
          <Link to="/login">Hai già un account? Accedi</Link>
        </div>
      </form>
    </section>
  );
}
