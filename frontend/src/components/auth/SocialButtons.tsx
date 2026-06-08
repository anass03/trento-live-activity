import { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMe, oauthAppleLogin, oauthGoogleLogin } from '../../lib/api';

const GOOGLE_CLIENT_ID = (import.meta as ImportMeta & { env: { VITE_GOOGLE_CLIENT_ID?: string } }).env.VITE_GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = (import.meta as ImportMeta & { env: { VITE_APPLE_CLIENT_ID?: string } }).env.VITE_APPLE_CLIENT_ID || '';
const APPLE_REDIRECT = (import.meta as ImportMeta & { env: { VITE_APPLE_REDIRECT_URI?: string } }).env.VITE_APPLE_REDIRECT_URI || window.location.origin;

interface Props {
  onSpidClick?: () => void;
  showSpid?: boolean;
}

// Wrapper interno che usa useGoogleLogin (hook richiede di stare dentro al provider).
// Lo separiamo dal componente esterno per poter condizionare il render del provider
// solo quando GOOGLE_CLIENT_ID è configurato.
function GoogleButton({ onError, onSuccess }: { onError: (msg: string) => void; onSuccess: () => void | Promise<void> }) {
  // Flusso "implicit" — restituisce access_token (non id_token). Usiamo solo
  // scope NON sensibili (openid email profile): Google non mostra l'avviso
  // "app non verificata" e non serve la verifica per scope sensibili. La data
  // di nascita non si chiede piu' qui ma nello step di onboarding interessi.
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        onError('Google non ha restituito un access_token');
        return;
      }
      try {
        await oauthGoogleLogin(tokenResponse.access_token);
        await onSuccess();
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Errore login Google');
      }
    },
    onError: () => onError('Login Google annullato o non riuscito'),
    scope: 'openid email profile',
  });

  return (
    <button type="button" className="social-button google" onClick={() => login()}>
      <span className="social-icon">G</span> Continua con Google
    </button>
  );
}

export function SocialButtons({ onSpidClick, showSpid = false }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Dopo OAuth: se è un nuovo cittadino (o uno esistente senza interessi),
  // manda all'onboarding. Stessa logica usata in VerifyEmailPage.
  async function redirectAfterLogin() {
    try {
      const me = await getMe();
      const profile = me.profile;
      const needsOnboarding = profile?.kind === 'cittadino'
        && !profile.onboardingComplete;
      navigate(needsOnboarding ? '/onboarding/interessi' : '/');
    } catch {
      navigate('/');
    }
  }

  async function handleAppleSuccess(response: { authorization?: { id_token?: string } }) {
    setError(null);
    const idToken = response.authorization?.id_token;
    if (!idToken) { setError('Apple non ha restituito un idToken'); return; }
    try {
      await oauthAppleLogin(idToken);
      await redirectAfterLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore login Apple');
    }
  }

  if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID && !showSpid) {
    return (
      <div className="social-buttons-disabled muted-copy">
        <small>Accesso con Google / Apple disponibile dopo la configurazione delle API key.</small>
      </div>
    );
  }

  return (
    <div className="social-buttons">
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleButton
            onError={setError}
            onSuccess={redirectAfterLogin}
          />
        </GoogleOAuthProvider>
      ) : (
        <button type="button" className="social-button google" disabled title="Configura VITE_GOOGLE_CLIENT_ID per abilitare">
          <span className="social-icon">G</span> Continua con Google
        </button>
      )}

      {APPLE_CLIENT_ID ? (
        <AppleSignin
          authOptions={{
            clientId: APPLE_CLIENT_ID,
            scope: 'email name',
            redirectURI: APPLE_REDIRECT,
            usePopup: true,
          }}
          uiType="dark"
          onSuccess={handleAppleSuccess}
          onError={(err: unknown) => setError(err instanceof Error ? err.message : 'Errore Apple')}
          render={(props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
            <button {...props} className="social-button apple" type="button">
               Continua con Apple
            </button>
          )}
        />
      ) : (
        <button type="button" className="social-button apple apple-coming-soon" disabled>
          <span className="apple-label-default"> {t('auth.continueWithApple')}</span>
          <span className="apple-label-hover">{t('auth.appleComingSoon')}</span>
        </button>
      )}

      {showSpid && (
        <button type="button" className="social-button spid spid-coming-soon" disabled>
          <span className="spid-label-default"><span className="spid-logo" aria-hidden="true">SP</span> {t('auth.continueWithSpid')}</span>
          <span className="spid-label-hover">{t('auth.spidComingSoon')}</span>
        </button>
      )}

      {error && <div className="form-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
