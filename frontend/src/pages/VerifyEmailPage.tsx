import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMe, isPlaceholderBirthdate, verifyEmail, setToken } from '../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Link non valido: token mancante.');
      return;
    }
    verifyEmail(token)
      .then(async (result) => {
        setToken(result.token);
        window.dispatchEvent(new Event('tla:user-updated'));
        setStatus('success');
        // Se cittadino e onboarding non ancora completato, indirizzalo lì.
        try {
          const me = await getMe();
          const profile = me.profile;
          const needsOnboarding = profile?.kind === 'cittadino'
            && (!profile.onboardingComplete || isPlaceholderBirthdate(profile.dataNascita));
          setTimeout(() => navigate(needsOnboarding ? '/onboarding/interessi' : '/'), 1400);
        } catch {
          setTimeout(() => navigate('/'), 1800);
        }
      })
      .catch((e) => {
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : 'Errore durante la verifica.');
      });
  }, [searchParams, navigate]);

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
            <p>Il tuo account è attivo. Verrai reindirizzato alla mappa tra un momento...</p>
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
