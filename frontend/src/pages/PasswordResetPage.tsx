import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forgotPassword, resetPassword } from '../lib/api';
import { PasswordInput } from '../components/ui/PasswordInput';

export function PasswordResetPage() {
  const { token } = useParams<{ token?: string }>();
  const { t } = useTranslation();
  const isResetting = Boolean(token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleForgot(event: FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null); setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setIsLoading(false); }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    if (password !== confirm) { setError(t('auth.passwordReset.passwordMismatch')); return; }
    setIsLoading(true);
    try {
      const result = await resetPassword(token!, password);
      setMessage(result.message + t('auth.passwordReset.loginNow'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally { setIsLoading(false); }
  }

  return (
    <section className="auth-page">
      {isResetting ? (
        <form className="auth-form liquid-card" onSubmit={handleReset}>
          <h1>{t('auth.passwordReset.newTitle')}</h1>
          <label>
            <span>{t('auth.passwordReset.newPassword')}</span>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </label>
          <label>
            <span>{t('auth.passwordReset.confirmPassword')}</span>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? '...' : t('auth.passwordReset.reset')}
          </button>
          <div className="auth-links"><Link to="/login">{t('auth.passwordReset.backToLogin')}</Link></div>
        </form>
      ) : (
        <form className="auth-form liquid-card" onSubmit={handleForgot}>
          <h1>{t('auth.passwordReset.forgotTitle')}</h1>
          <p>{t('auth.passwordReset.forgotSubtitle')}</p>
          <label>
            <span>{t('auth.email')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? '...' : t('auth.passwordReset.sendLink')}
          </button>
          <div className="auth-links"><Link to="/login">{t('auth.passwordReset.backToLogin')}</Link></div>
        </form>
      )}
    </section>
  );
}
