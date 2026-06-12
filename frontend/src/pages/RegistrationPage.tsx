import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register, registerEntity } from '../lib/api';
import { PasswordInput } from '../components/ui/PasswordInput';
import { SocialButtons } from '../components/auth/SocialButtons';

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

export function RegistrationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('user');
  const [form, setForm] = useState({
    email: '', password: '', nome: '', cognome: '', dataNascita: '',
    codiceFiscale: '', nomeEnte: '', pec: '',
  });
  const [consents, setConsents] = useState({ privacy_policy: false, terms_of_service: false, marketing: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (password.length < 8) hints.push(t('registration.strength.minChars'));
    else if (password.length < 12) hints.push(t('registration.strength.moreChars'));
    if (!hasUpper) hints.push(t('registration.strength.uppercase'));
    if (!hasLower) hints.push(t('registration.strength.lowercase'));
    if (!hasDigit) hints.push(t('registration.strength.number'));
    if (!hasSymbol) hints.push(t('registration.strength.symbol'));
    if (hasRepeat) hints.push(t('registration.strength.noRepeat'));
    if (hasSequence) hints.push(t('registration.strength.noSequence'));

    const clamped = Math.max(1, Math.min(5, score)) as PasswordStrength['score'];
    const meta: Record<PasswordStrength['score'], { label: string; color: string }> = {
      1: { label: t('registration.strength.veryWeak'), color: '#d63a3a' },
      2: { label: t('registration.strength.weak'),     color: '#e8784a' },
      3: { label: t('registration.strength.fair'),     color: '#d1be58' },
      4: { label: t('registration.strength.good'),     color: '#7dc962' },
      5: { label: t('registration.strength.excellent'),color: '#3dbb6e' },
    };
    return { score: clamped, label: meta[clamped].label, color: meta[clamped].color, hints };
  }

  function validatePassword(password: string): string | null {
    if (password.length < 8) return t('registration.strength.minChars');
    if (!/[A-Z]/.test(password)) return t('registration.strength.uppercase');
    if (!/[a-z]/.test(password)) return t('registration.strength.lowercase');
    if (!/[0-9]/.test(password)) return t('registration.strength.number');
    if (!/[^A-Za-z0-9]/.test(password)) return t('registration.strength.symbol');
    return null;
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const passwordStrength = getPasswordStrength(form.password);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }
    setIsLoading(true);
    try {
      if (mode === 'user') {
        if (!consents.privacy_policy || !consents.terms_of_service) {
          throw new Error(t('registration.error'));
        }
        if (!isValidCodiceFiscale(form.codiceFiscale)) {
          throw new Error(t('registration.fiscalCodeInvalid'));
        }
        const result = await register({
          email: form.email, password: form.password, nome: form.nome,
          cognome: form.cognome, dataNascita: form.dataNascita,
          codiceFiscale: form.codiceFiscale.trim().toUpperCase(),
          consents,
        });
        if ('emailVerificationRequired' in result && result.emailVerificationRequired) {
          setSuccess(t('registration.checkEmail'));
          return;
        }
        navigate('/');
        window.location.reload();
      } else {
        if (!consents.privacy_policy || !consents.terms_of_service) {
          throw new Error(t('registration.error'));
        }
        if (!isValidPec(form.pec)) {
          throw new Error(t('registration.pecInvalid'));
        }
        const pecNorm = form.pec.trim().toLowerCase();
        const result = await registerEntity({
          email: pecNorm,
          password: form.password,
          nomeEnte: form.nomeEnte,
          pec: pecNorm,
          consents,
        });
        setSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('registration.error'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form liquid-card" onSubmit={handleSubmit}>
        <h1>{t('registration.title')}</h1>

        {mode === 'user' && (
          <>
            <SocialButtons />
            <div className="social-divider">{t('registration.createWithEmail')}</div>
          </>
        )}

        <div className="mode-switch">
          <button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => setMode('user')}>{t('auth.citizen')}</button>
          <button type="button" className={mode === 'entity' ? 'active' : ''} onClick={() => setMode('entity')}>{t('auth.entity')}</button>
        </div>

        {mode === 'entity' && (
          <p className="hint">{t('registration.entityHint')}</p>
        )}

        {mode === 'user' && (
          <label>
            <span>{t('auth.email')}</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
        )}
        <label>
          <span>{t('auth.password')}</span>
          <PasswordInput value={form.password} onChange={(e) => update('password', e.target.value)} required autoComplete="new-password" />
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
                <small>{t('registration.strength.addHint')} {passwordStrength.hints.slice(0, 3).join(', ')}</small>
              )}
            </div>
          </div>
        )}

        {mode === 'user' ? (
          <>
            <label>
              <span>{t('common.name')}</span>
              <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} required />
            </label>
            <label>
              <span>{t('common.lastName')}</span>
              <input type="text" value={form.cognome} onChange={(e) => update('cognome', e.target.value)} required />
            </label>
            <label>
              <span>{t('registration.birthDate')}</span>
              <input type="date" value={form.dataNascita} onChange={(e) => update('dataNascita', e.target.value)} required />
              <small>{t('registration.ageGate')}</small>
            </label>
            <label>
              <span>{t('auth.fiscalCode')}</span>
              <input
                type="text"
                value={form.codiceFiscale}
                onChange={(e) => update('codiceFiscale', e.target.value.toUpperCase().replace(/\s/g, ''))}
                required minLength={16} maxLength={16}
                pattern="[A-Z0-9]{16}"
                placeholder="RSSMRA85T10A562S"
                autoComplete="off"
              />
              <small>
                {form.codiceFiscale && !isValidCodiceFiscale(form.codiceFiscale)
                  ? t('registration.fiscalCodeInvalid')
                  : t('registration.fiscalCodeHint')}
              </small>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>{t('registration.entityName')}</span>
              <input type="text" value={form.nomeEnte} onChange={(e) => update('nomeEnte', e.target.value)} required />
            </label>
            <label>
              <span>{t('auth.pec')}</span>
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
                  ? t('registration.pecInvalid')
                  : t('registration.pecHint')}
              </small>
            </label>
          </>
        )}

        <fieldset className="consents">
          <legend>{t('registration.consents')}</legend>
          <label className="checkbox">
            <input type="checkbox" checked={consents.privacy_policy} onChange={(e) => setConsents({ ...consents, privacy_policy: e.target.checked })} required />
            <span>{t('registration.acceptPrivacy')} <Link to="/privacy" target="_blank" rel="noreferrer">*</Link></span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={consents.terms_of_service} onChange={(e) => setConsents({ ...consents, terms_of_service: e.target.checked })} required />
            <span>{t('registration.acceptTerms')} <Link to="/termini" target="_blank" rel="noreferrer">*</Link></span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={consents.marketing} onChange={(e) => setConsents({ ...consents, marketing: e.target.checked })} />
            <span>{t('registration.acceptMarketing')}</span>
          </label>
        </fieldset>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? t('registration.submitting') : t('registration.submit')}
        </button>

        <div className="auth-links">
          <Link to="/login">{t('registration.hasAccount')}</Link>
        </div>
      </form>
    </section>
  );
}
