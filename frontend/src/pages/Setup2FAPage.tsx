import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { setup2fa, verify2fa } from '../lib/api';

type Phase = 'scan' | 'codes';

export function Setup2FAPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      .catch((e) => setError(e instanceof Error ? e.message : t('twofa.initError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsVerifying(true);
    try {
      const result = await verify2fa(code);
      setRecoveryCodes(result.recoveryCodes);
      setPhase('codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('twofa.invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  }

  function handleCopyCodes() {
    void navigator.clipboard.writeText(recoveryCodes.join('\n'));
  }

  function handleDownloadCodes() {
    const blob = new Blob([
      `Trento Live Activity — Recovery codes 2FA\n` +
      `Account: admin@trento-live.it\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `Keep these in a safe place. Each code is single-use.\n\n` +
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
      <div className="auth-form liquid-card two-factor-card">
        {phase === 'scan' && (
          <>
            <h1>{t('twofa.setupTitle')}</h1>
            <p>{t('twofa.setupSubtitle')}</p>

            {isLoading && <div className="state-panel liquid-panel">{t('twofa.loadingQR')}</div>}
            {error && <div className="form-error">{error}</div>}

            {!isLoading && qrDataUrl && (
              <>
                <div className="qr-section">
                  <p><strong>{t('twofa.step1')}</strong></p>
                  <div className="qr-frame">
                    <img src={qrDataUrl} alt="QR code 2FA" />
                  </div>
                  {secret && (
                    <details>
                      <summary>{t('twofa.cannotScan')}</summary>
                      <code className="secret-fallback">{secret}</code>
                    </details>
                  )}
                </div>

                <form onSubmit={handleVerify}>
                  <label>
                    <span><strong>{t('twofa.step2')}</strong></span>
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
                    {isVerifying ? t('twofa.verifying') : t('twofa.confirm')}
                  </button>
                </form>
              </>
            )}
          </>
        )}

        {phase === 'codes' && (
          <>
            <h1>{t('twofa.codesTitle')}</h1>
            <div className="warning-box">
              <strong>{t('twofa.codesWarning')}</strong>
            </div>

            <div className="recovery-codes-grid">
              {recoveryCodes.map((c) => (
                <code key={c} className="recovery-code">{c}</code>
              ))}
            </div>

            <div className="filter-actions">
              <button type="button" onClick={handleCopyCodes}>{t('twofa.copyToClipboard')}</button>
              <button type="button" onClick={handleDownloadCodes}>{t('twofa.downloadTxt')}</button>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              <span>{t('twofa.acknowledgeLabel')}</span>
            </label>

            <button className="primary-button" type="button" disabled={!acknowledged} onClick={handleContinue}>
              {t('twofa.continue')}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
