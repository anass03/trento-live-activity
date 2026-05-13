import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, setToken } from '../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Link non valido: token mancante.');
      return;
    }
    verifyEmail(token)
      .then((result) => {
        setToken(result.token);
        setStatus('success');
      })
      .catch((e) => {
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : 'Errore durante la verifica.');
      });
  }, [searchParams]);

  return (
    <section className="auth-page">
      <div className="auth-form glass-card">
        {status === 'loading' && (
          <>
            <h1>Verifica in corso...</h1>
            <p>Attendere.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1>Email verificata!</h1>
            <p>Il tuo account è attivo. Benvenuto su Trento Live Activity.</p>
            <Link to="/" className="primary-button" style={{ display: 'inline-block', marginTop: '1rem' }}>
              Vai alla mappa
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Verifica non riuscita</h1>
            <div className="form-error">{errorMsg}</div>
            <p style={{ marginTop: '1rem' }}>
              Il link potrebbe essere scaduto o già utilizzato.{' '}
              <Link to="/registrazione">Registrati di nuovo</Link> oppure{' '}
              <Link to="/login">accedi</Link> se hai già verificato l'email.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
