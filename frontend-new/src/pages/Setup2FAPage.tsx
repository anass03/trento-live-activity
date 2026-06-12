import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Icon } from "../components/ui/Icon";
import { Header } from "../components/layout/Header";
import { setup2fa, verify2fa } from "../lib/api";

export function Setup2FAPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setup2fa()
      .then(async (res) => {
        setSecret(res.base32);
        // QR generato localmente: il secret TOTP non lascia mai il browser.
        const dataUrl = await QRCode.toDataURL(res.otpauthUrl, { width: 256, margin: 2 });
        setQrUrl(dataUrl);
      })
      .catch((err: any) => {
        setError(err.message || t("twofa.initError"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: any) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(t("twofa.codeLength"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verify2fa(code);
      setRecoveryCodes(res.recoveryCodes || []);
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || t("twofa.invalidCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handleDownloadCodes = () => {
    const blob = new Blob([
      `${t("twofa.downloadHeader")}\n` +
      (user?.email ? `Account: ${user.email}\n` : "") +
      `${t("twofa.downloadGenerated")} ${new Date().toLocaleString()}\n\n` +
      `${t("twofa.downloadKeepSafe")}\n\n` +
      recoveryCodes.join("\n") + "\n",
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trento-live-activity-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const smallBtnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    background: "var(--chip-fill)", border: "1px solid var(--border-soft)",
    color: "var(--text-primary)", cursor: "pointer",
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap" style={{ display: "grid", placeItems: "center", minHeight: "65vh", padding: "40px 0" }}>
        <div className="revamp-form-card anim-in" style={{ "--accent": "var(--amber)", maxWidth: "500px" } as React.CSSProperties}>
          <div className="revamp-form-head">
            <div className="revamp-form-logo" style={{ "--accent": "var(--amber)" } as React.CSSProperties}>
              <Icon name="shieldCheck" size={26} style={{ color: "var(--amber)" }} />
            </div>
            <h2>{t("twofa.title")}</h2>
            <p>{t("twofa.subtitle")}</p>
          </div>

          {completed ? (
            <div style={{ textAlign: "center" }}>
              <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
                <Icon name="check" size={12} /> {t("twofa.activeTitle")}
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
                {t("twofa.savedHint")}
              </p>

              {recoveryCodes.length > 0 && (
                <>
                  <div style={{
                    background: "var(--chip-fill)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-soft)",
                    textAlign: "left", marginBottom: 14, fontFamily: "var(--mono)", fontSize: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"
                  }}>
                    {recoveryCodes.map((c, i) => (
                      <div key={i} style={{ color: "var(--text-primary)" }}>● {c}</div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
                    <button type="button" style={smallBtnStyle} onClick={handleCopyCodes}>
                      <Icon name="check" size={13} style={copied ? { color: "var(--green)" } : { opacity: 0.6 }} />
                      {copied ? t("twofa.copied") : t("twofa.copyToClipboard")}
                    </button>
                    <button type="button" style={smallBtnStyle} onClick={handleDownloadCodes}>
                      <Icon name="ticket" size={13} style={{ opacity: 0.6 }} />
                      {t("twofa.downloadTxt")}
                    </button>
                  </div>

                  <label style={{
                    display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start",
                    fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, cursor: "pointer", textAlign: "left"
                  }}>
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      style={{ accentColor: "var(--amber)", width: 15, height: 15 }}
                    />
                    {t("twofa.acknowledgeLabel")}
                  </label>
                </>
              )}

              <button
                className="revamp-form-btn"
                style={{ "--accent": "var(--amber)" } as React.CSSProperties}
                disabled={recoveryCodes.length > 0 && !acknowledged}
                onClick={() => setPage("impostazioni")}
              >
                {t("twofa.backToSettings")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerify}>
              {error && (
                <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
                  <Icon name="warn" size={12} /> {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
                <div style={{
                  width: 90, height: 90, borderRadius: 12, background: "#fff", display: "grid", placeItems: "center", border: "1px solid var(--border-soft)", overflow: "hidden"
                }}>
                  {qrUrl ? (
                    <img src={qrUrl} alt="QR Code 2FA" style={{ width: "80px", height: "80px" }} />
                  ) : (
                    <Icon name="grid" size={44} style={{ color: "#000" }} />
                  )}
                </div>
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)" }}>
                  {t("twofa.step1")}<br />
                  {secret && <>{t("twofa.manualCode")} <code style={{ color: "var(--amber)", fontSize: "11px", fontWeight: "bold" }}>{secret}</code><br /></>}
                  {t("twofa.step2")}
                </div>
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("twofa.codeLabel")}</label>
                <div className="revamp-form-input-wrap">
                  <Icon name="key" size={16} />
                  <input
                    type="text"
                    maxLength={6}
                    className="revamp-form-input"
                    placeholder="123456"
                    value={code}
                    disabled={loading}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    style={{ letterSpacing: "0.2em", textAlign: "center", fontSize: 16, fontWeight: 700 }}
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--amber)" } as React.CSSProperties} disabled={loading}>
                {loading ? t("twofa.activating") : t("twofa.verifyActivate")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
