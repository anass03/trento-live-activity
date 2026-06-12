import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMe, verifyEmail, setToken } from '../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg(t('auth.verifyEmail.invalidToken'));
      return;
    }
    verifyEmail(token)
      .then(async (result) => {
        setToken(result.token);
        window.dispatchEvent(new Event('tla:user-updated'));
        setStatus('success');
        try {
          const me = await getMe();
          const profile = me.profile;
          const needsOnboarding = profile?.kind === 'cittadino' && !profile.onboardingComplete;
          setTimeout(() => navigate(needsOnboarding ? '/onboarding/interessi' : '/'), 1400);
        } catch {
          setTimeout(() => navigate('/'), 1800);
        }
      })
      .catch((e) => {
        setStatus('error');
        setErrorMsg(e instanceof Error ? e.message : t('auth.verifyEmail.error'));
      });
  }, [searchParams, navigate, t]);

  return (
    <section className="auth-page">
      <div className="auth-form glass-card">
        {status === 'loading' && (
          <>
            <h1>{t('auth.verifyEmail.loading')}</h1>
            <p>{t('auth.verifyEmail.loadingSubtitle')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1>{t('auth.verifyEmail.success')}</h1>
            <p>{t('auth.verifyEmail.successSubtitle')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>{t('auth.verifyEmail.error')}</h1>
            <div className="form-error">{errorMsg}</div>
            <p style={{ marginTop: '1rem' }}>
              {t('auth.verifyEmail.expired')}{' '}
              <Link to="/registrazione">{t('auth.verifyEmail.registerAgain')}</Link>{' '}
              {t('common.or')}{' '}
              <Link to="/login">{t('auth.verifyEmail.orLogin')}</Link>{' '}
              {t('auth.verifyEmail.ifVerified')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
