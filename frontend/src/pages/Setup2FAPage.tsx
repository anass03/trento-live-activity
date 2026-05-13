import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { setup2fa, verify2fa } from '../lib/api';

export function Setup2FAPage() {
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setup2fa()
      .then(async ({ otpauthUrl, base32 }) => {
        setSecret(base32);
        const dataUrl = await QRCode.toDataURL(otpauthUrl, { width: 256, margin: 2 });
        setQrDataUrl(dataUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore inizializzazione 2FA'))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);
    try {
      await verify2fa(code);
      setSuccess('2FA attivata con successo. Reindirizzamento...');
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Codice non valido');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-form glass-card" style={{ minWidth: 480 }}>
        <h1>Configurazione 2FA</h1>
        <p>Come amministratore di sistema devi attivare l'autenticazione a due fattori (RNF15) per completare l'accesso.</p>

        {isLoading && <div className="state-panel glass-panel">Generazione QR code...</div>}

        {error && <div className="form-error">{error}</div>}

        {!isLoading && qrDataUrl && (
          <>
            <div className="qr-section">
              <p><strong>Passo 1.</strong> Inquadra questo QR code con la tua app di autenticazione (Google Authenticator, Aegis, Authy, 1Password, ecc.).</p>
              <div className="qr-frame">
                <img src={qrDataUrl} alt="QR code per 2FA" />
              </div>
              {secret && (
                <details>
                  <summary>Non riesci a scannerizzare? Inserisci la chiave manualmente</summary>
                  <code className="secret-fallback">{secret}</code>
                </details>
              )}
            </div>

            <form onSubmit={handleVerify}>
              <label>
                <span><strong>Passo 2.</strong> Inserisci il codice a 6 cifre generato dall'app</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                />
              </label>
              {success && <div className="form-success">{success}</div>}
              <button className="primary-button" type="submit" disabled={isVerifying || code.length !== 6}>
                {isVerifying ? 'Verifica in corso...' : 'Conferma e attiva 2FA'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
