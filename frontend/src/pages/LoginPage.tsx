import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, login } from '../lib/api';

type CodeMode = 'totp' | 'recovery';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [codeMode, setCodeMode] = useState<CodeMode>('totp');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const codeToSend = otpToken || undefined;
      const result = await login(email, password, codeToSend);
      if (result.needs2faSetup) {
        navigate('/setup-2fa');
        return;
      }
      if (result.recoveryUsed) {
        const remaining = result.recoveryCodesRemaining ?? 0;
        window.alert(
          `Hai effettuato l'accesso con un codice di recupero. Te ne restano ${remaining}.\n\n` +
          `Se non hai più accesso al tuo authenticator, vai sul profilo e usa ` +
          `"Cambia authenticator / Reimposta 2FA" per riconfigurare la 2FA con un nuovo dispositivo.`,
        );
      }
      navigate('/');
      window.location.reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === '2FA_REQUIRED') {
        setNeeds2fa(true);
        setError('Inserisci il codice 2FA dal tuo authenticator');
      } else {
        setError(e instanceof Error ? e.message : 'Errore durante il login');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setCodeMode((m) => (m === 'totp' ? 'recovery' : 'totp'));
    setOtpToken('');
    setError(null);
  }

  return (
    <section className="auth-page">
      <form className="auth-form glass-card" onSubmit={handleSubmit}>
        <h1>Accedi</h1>
        <p>Entra nel tuo account Trento Live Activity</p>

        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>

        {needs2fa && codeMode === 'totp' && (
          <label>
            <span>Codice 2FA (6 cifre)</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              placeholder="000000"
              required
              autoFocus
            />
          </label>
        )}

        {needs2fa && codeMode === 'recovery' && (
          <label>
            <span>Codice di recupero</span>
            <input
              type="text"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value.toUpperCase())}
              maxLength={9}
              placeholder="XXXX-XXXX"
              required
              autoFocus
            />
            <small>Userai uno dei codici salvati al setup 2FA. Il codice verrà consumato e dovrai riconfigurare la 2FA.</small>
          </label>
        )}

        {needs2fa && (
          <button type="button" className="link-button" onClick={toggleMode}>
            {codeMode === 'totp' ? 'Ho perso l\'accesso all\'authenticator — usa codice di recupero' : 'Torna al codice authenticator'}
          </button>
        )}

        {error && <div className="form-error">{error}</div>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Accesso in corso...' : 'Accedi'}
        </button>

        <div className="auth-links">
          <Link to="/password-reset">Password dimenticata?</Link>
          <Link to="/registrazione">Non hai un account? Registrati</Link>
        </div>
      </form>
    </section>
  );
}
