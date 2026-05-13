import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, login } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(email, password, otpToken || undefined);
      if (result.needs2faSetup) {
        navigate('/setup-2fa');
        return;
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

        {needs2fa && (
          <label>
            <span>Codice 2FA (6 cifre)</span>
            <input type="text" inputMode="numeric" pattern="[0-9]{6}" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} maxLength={6} required />
          </label>
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
