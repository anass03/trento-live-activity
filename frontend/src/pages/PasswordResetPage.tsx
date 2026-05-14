import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../lib/api';

export function PasswordResetPage() {
  const { token } = useParams<{ token?: string }>();
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
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsLoading(false); }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    if (password !== confirm) { setError('Le password non coincidono'); return; }
    setIsLoading(true);
    try {
      const result = await resetPassword(token!, password);
      setMessage(result.message + ' — ora puoi accedere');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally { setIsLoading(false); }
  }

  return (
    <section className="auth-page">
      {isResetting ? (
        <form className="auth-form liquid-card" onSubmit={handleReset}>
          <h1>Imposta nuova password</h1>
          <label>
            <span>Nuova password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <label>
            <span>Conferma password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? '...' : 'Reimposta password'}
          </button>
          <div className="auth-links"><Link to="/login">Torna al login</Link></div>
        </form>
      ) : (
        <form className="auth-form liquid-card" onSubmit={handleForgot}>
          <h1>Recupero password</h1>
          <p>Inserisci la tua email — ti invieremo un link per reimpostare la password.</p>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? '...' : 'Invia link di reset'}
          </button>
          <div className="auth-links"><Link to="/login">Torna al login</Link></div>
        </form>
      )}
    </section>
  );
}
