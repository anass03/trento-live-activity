import { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { useNavigate } from 'react-router-dom';
import { oauthAppleLogin, oauthGoogleLogin } from '../../lib/api';

const GOOGLE_CLIENT_ID = (import.meta as ImportMeta & { env: { VITE_GOOGLE_CLIENT_ID?: string } }).env.VITE_GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = (import.meta as ImportMeta & { env: { VITE_APPLE_CLIENT_ID?: string } }).env.VITE_APPLE_CLIENT_ID || '';
const APPLE_REDIRECT = (import.meta as ImportMeta & { env: { VITE_APPLE_REDIRECT_URI?: string } }).env.VITE_APPLE_REDIRECT_URI || window.location.origin;

interface Props {
  onSpidClick?: () => void;
  showSpid?: boolean;
}

export function SocialButtons({ onSpidClick, showSpid = false }: Props) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    setError(null);
    if (!credentialResponse.credential) {
      setError('Google non ha restituito un idToken');
      return;
    }
    try {
      await oauthGoogleLogin(credentialResponse.credential);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore login Google');
    }
  }

  async function handleAppleSuccess(response: { authorization?: { id_token?: string } }) {
    setError(null);
    const idToken = response.authorization?.id_token;
    if (!idToken) { setError('Apple non ha restituito un idToken'); return; }
    try {
      await oauthAppleLogin(idToken);
      navigate('/');
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
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Login Google annullato o non riuscito')}
            theme="outline"
            shape="pill"
            text="continue_with"
            width={280}
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
        <button type="button" className="social-button apple" disabled title="Configura VITE_APPLE_CLIENT_ID per abilitare">
           Continua con Apple
        </button>
      )}

      {showSpid && (
        <button type="button" className="social-button spid" onClick={onSpidClick}>
          <span className="spid-logo" aria-hidden="true">SP</span> Entra con SPID
        </button>
      )}

      {error && <div className="form-error" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
