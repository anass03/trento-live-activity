import { useEffect, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Header } from "../components/layout/Header";
import { setup2fa, verify2fa } from "../lib/api";

export function Setup2FAPage({ page, setPage, theme, setTheme, user }: any) {
  const [code, setCode] = useState("");
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    setup2fa()
      .then((res) => {
        setSecret(res.base32);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(res.otpauthUrl)}`);
      })
      .catch((err: any) => {
        setError(err.message || "Impossibile caricare la configurazione 2FA.");
      });
  }, []);

  const handleVerify = async (e: any) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Inserisci un codice di 6 cifre.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verify2fa(code);
      setRecoveryCodes(res.recoveryCodes || []);
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || "Codice non valido. Riprova.");
    } finally {
      setLoading(false);
    }
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
            <h2>Configura 2FA</h2>
            <p>Aggiungi un ulteriore livello di sicurezza per il tuo account</p>
          </div>

          {completed ? (
            <div style={{ textAlign: "center" }}>
              <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
                <Icon name="check" size={12} /> Autenticazione a due fattori attiva!
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
                L'autenticazione a due fattori è stata attivata. Conserva i seguenti codici di sicurezza in un luogo sicuro. Potrai usarli per accedere se perdi il dispositivo.
              </p>
              
              {recoveryCodes.length > 0 && (
                <div style={{
                  background: "var(--chip-fill)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-soft)",
                  textAlign: "left", marginBottom: 20, fontFamily: "var(--mono)", fontSize: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"
                }}>
                  {recoveryCodes.map((c, i) => (
                    <div key={i} style={{ color: "var(--text-primary)" }}>● {c}</div>
                  ))}
                </div>
              )}

              <button className="revamp-form-btn" style={{ "--accent": "var(--amber)" } as React.CSSProperties} onClick={() => setPage("impostazioni")}>
                Torna alle Impostazioni
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
                  1. Scansiona il codice QR con la tua app di autenticazione.<br />
                  {secret && <>Codice manuale: <code style={{ color: "var(--amber)", fontSize: "11px", fontWeight: "bold" }}>{secret}</code><br /></>}
                  2. Inserisci il codice a 6 cifre visualizzato sulla tua app sotto.
                </div>
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Codice di verifica</label>
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
                {loading ? "Attivazione..." : "Verifica e attiva"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
