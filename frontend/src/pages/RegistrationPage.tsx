import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, registerEntity } from '../lib/api';

type Mode = 'user' | 'entity';
type PasswordStrength = {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  hints: string[];
};

const CF_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
const CF_ODD: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const CF_EVEN: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
  K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
  U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

function isValidCodiceFiscale(value: string): boolean {
  const cf = value.trim().toUpperCase();
  if (!CF_REGEX.test(cf)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += (i % 2 === 0) ? CF_ODD[cf[i]] : CF_EVEN[cf[i]];
  }
  return String.fromCharCode(65 + (sum % 26)) === cf[15];
}

const KNOWN_PEC_DOMAINS = [
  'pec.it', 'legalmail.it', 'pec.aruba.it', 'postecert.it', 'pec.poste.it',
  'gigapec.it', 'sicurezzapostale.it', 'ticertifica.it', 'pec.actalis.it',
  'pec.cgn.it', 'pec.giuffre.it', 'cert.legalmail.it', 'cert-posta.it',
  'pec.libero.it', 'arubapec.it',
];

function isValidPec(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domain = email.split('@')[1];
  if (!domain) return false;
  if (/(^|\.)pec\./.test(domain) || /pec\.[a-z]+$/.test(domain) || domain.includes('legalmail')) return true;
  return KNOWN_PEC_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasRepeat = /(.)\1{2,}/.test(password);
  const hasSequence = /(?:abc|bcd|cde|def|123|234|345|456|qwerty|password)/i.test(password);

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (hasUpper && hasLower) score++;
  if (hasDigit) score++;
  if (hasSymbol) score++;
  if (hasRepeat) score--;
  if (hasSequence) score--;

  const hints: string[] = [];
  if (password.length < 8) hints.push('almeno 8 caratteri');
  else if (password.length < 12) hints.push('meglio se 12+ caratteri');
  if (!hasUpper) hints.push('una maiuscola');
  if (!hasLower) hints.push('una minuscola');
  if (!hasDigit) hints.push('un numero');
  if (!hasSymbol) hints.push('un simbolo (!@#$…)');
  if (hasRepeat) hints.push('evita 3 caratteri ripetuti');
  if (hasSequence) hints.push('evita sequenze comuni');

  const clamped = Math.max(1, Math.min(5, score)) as PasswordStrength['score'];
  const meta: Record<PasswordStrength['score'], { label: string; color: string }> = {
    1: { label: 'Molto debole', color: '#d63a3a' },
    2: { label: 'Debole', color: '#e8784a' },
    3: { label: 'Discreta', color: '#d1be58' },
    4: { label: 'Buona', color: '#7dc962' },
    5: { label: 'Eccellente', color: '#3dbb6e' },
  };
  return { score: clamped, label: meta[clamped].label, color: meta[clamped].color, hints };
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
    email: '', password: '', nome: '', cognome: '', dataNascita: '',
    codiceFiscale: '', nomeEnte: '', pec: '',
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
        if (!isValidCodiceFiscale(form.codiceFiscale)) {
          throw new Error('Codice fiscale non valido: controlla i 16 caratteri');
        }
        const result = await register({
          email: form.email, password: form.password, nome: form.nome,
          cognome: form.cognome, dataNascita: form.dataNascita,
          codiceFiscale: form.codiceFiscale.trim().toUpperCase(),
          consents,
        });
        if ('emailVerificationRequired' in result && result.emailVerificationRequired) {
          setSuccess('Registrazione completata. Controlla la tua email per verificare l\'account prima di accedere.');
          return;
        }
        navigate('/');
        window.location.reload();
      } else {
        if (!isValidPec(form.pec)) {
          throw new Error('Indirizzo PEC non valido: deve essere un\'email su un dominio di posta certificata');
        }
        const pecNorm = form.pec.trim().toLowerCase();
        const result = await registerEntity({
          email: pecNorm,
          password: form.password,
          nomeEnte: form.nomeEnte,
          pec: pecNorm,
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

        {mode === 'user' && (
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
        )}
        <label>
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
        </label>
        {passwordStrength && (
          <div className="password-strength">
            <div className="password-strength-bar">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="password-strength-segment"
                  style={{ backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#e0e0e0' }}
                />
              ))}
            </div>
            <div className="password-strength-meta">
              <strong style={{ color: passwordStrength.color }}>{passwordStrength.label}</strong>
              {passwordStrength.hints.length > 0 && (
                <small>Aggiungi: {passwordStrength.hints.slice(0, 3).join(', ')}</small>
              )}
            </div>
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
            <label>
              <span>Codice fiscale</span>
              <input
                type="text"
                value={form.codiceFiscale}
                onChange={(e) => update('codiceFiscale', e.target.value.toUpperCase().replace(/\s/g, ''))}
                required
                minLength={16}
                maxLength={16}
                pattern="[A-Z0-9]{16}"
                placeholder="RSSMRA85T10A562S"
                autoComplete="off"
              />
              <small>
                {form.codiceFiscale && !isValidCodiceFiscale(form.codiceFiscale)
                  ? 'Codice fiscale non valido (controllo carattere di controllo)'
                  : '16 caratteri — verifica algoritmica del carattere di controllo'}
              </small>
            </label>

            <fieldset className="consents">
              <legend>Consensi (GDPR)</legend>
              <label className="checkbox">
                <input type="checkbox" checked={consents.privacy_policy} onChange={(e) => setConsents({ ...consents, privacy_policy: e.target.checked })} required />
                <span>Accetto la <Link to="/privacy" target="_blank" rel="noreferrer">privacy policy</Link> *</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={consents.terms_of_service} onChange={(e) => setConsents({ ...consents, terms_of_service: e.target.checked })} required />
                <span>Accetto i <Link to="/termini" target="_blank" rel="noreferrer">termini di servizio</Link> *</span>
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
            <label>
              <span>PEC (Posta Elettronica Certificata)</span>
              <input
                type="email"
                value={form.pec}
                onChange={(e) => update('pec', e.target.value.toLowerCase())}
                required
                placeholder="ente@pec.it"
                autoComplete="off"
              />
              <small>
                {form.pec && !isValidPec(form.pec)
                  ? 'PEC non valida: deve essere un\'email su dominio di posta certificata (es. pec.it, legalmail.it, pec.aruba.it)'
                  : 'L\'indirizzo PEC verrà verificato e usato per le comunicazioni ufficiali'}
              </small>
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
