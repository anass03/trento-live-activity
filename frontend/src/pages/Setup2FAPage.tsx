import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { setup2fa, verify2fa } from '../lib/api';

type Phase = 'scan' | 'codes';

export function Setup2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRecovery = (location.state as { fromRecovery?: boolean } | null)?.fromRecovery === true;
  const [phase, setPhase] = useState<Phase>('scan');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

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
      const result = await verify2fa(code);
      setRecoveryCodes(result.recoveryCodes);
      setPhase('codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Codice non valido');
    } finally {
      setIsVerifying(false);
    }
  }

  function handleCopyCodes() {
    void navigator.clipboard.writeText(recoveryCodes.join('\n'));
  }

  function handleDownloadCodes() {
    const blob = new Blob([
      `Trento Live Activity — Codici di recupero 2FA\n` +
      `Account: admin@trento-live.it\n` +
      `Generati il: ${new Date().toLocaleString('it-IT')}\n\n` +
      `Conservali in un luogo sicuro. Ogni codice è monouso.\n\n` +
      recoveryCodes.join('\n') + '\n',
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trento-live-activity-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleContinue() {
    navigate('/');
    window.location.reload();
  }

  return (
    <section className="auth-page">
      <div className="auth-form glass-card" style={{ minWidth: 480 }}>
        {phase === 'scan' && (
          <>
            <h1>Configurazione 2FA</h1>
            {fromRecovery && (
              <div className="warning-box">
                Hai usato un codice di recupero. La 2FA è stata disattivata e devi
                riconfigurarla con un nuovo authenticator prima di proseguire.
                Tutti i codici di recupero precedenti sono stati invalidati.
              </div>
            )}
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
                  <button className="primary-button" type="submit" disabled={isVerifying || code.length !== 6}>
                    {isVerifying ? 'Verifica in corso...' : 'Conferma e attiva 2FA'}
                  </button>
                </form>
              </>
            )}
          </>
        )}

        {phase === 'codes' && (
          <>
            <h1>Salva i tuoi codici di recupero</h1>
            <div className="warning-box">
              <strong>⚠ Importante:</strong> questi 8 codici servono ad accedere al tuo account
              se perdi l'authenticator. Sono <strong>monouso</strong> e verranno mostrati
              <strong> solo questa volta</strong>. Stampali o salvali in un password manager.
            </div>

            <div className="recovery-codes-grid">
              {recoveryCodes.map((c) => (
                <code key={c} className="recovery-code">{c}</code>
              ))}
            </div>

            <div className="filter-actions">
              <button type="button" onClick={handleCopyCodes}>Copia negli appunti</button>
              <button type="button" onClick={handleDownloadCodes}>Scarica come .txt</button>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              <span>Ho salvato i codici in un luogo sicuro</span>
            </label>

            <button className="primary-button" type="button" disabled={!acknowledged} onClick={handleContinue}>
              Continua
            </button>
          </>
        )}
      </div>
    </section>
  );
}
