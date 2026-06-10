import { useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Header } from "../components/layout/Header";

export function Setup2FAPage({ page, setPage, theme, setTheme, user }: any) {
  const [code, setCode] = useState("");
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = (e: any) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Inserisci un codice valido di 6 cifre.");
      return;
    }
    setCompleted(true);
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="revamp-form-card anim-in" style={{ "--accent": "var(--amber)" }}>
          <div className="revamp-form-head">
            <div className="revamp-form-logo" style={{ "--accent": "var(--amber)" }}>
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
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                Il tuo account è ora protetto con l'autenticazione a due fattori tramite la tua app preferita (Google Authenticator, Authy, ecc.).
              </p>
              <button className="revamp-form-btn" style={{ "--accent": "var(--amber)" }} onClick={() => setPage("impostazioni")}>
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
                  width: 90, height: 90, borderRadius: 12, background: "#fff", display: "grid", placeItems: "center", border: "1px solid var(--border-soft)"
                }}>
                  {/* mockup QR Code using icon grid */}
                  <Icon name="grid" size={44} style={{ color: "#000" }} />
                </div>
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)" }}>
                  1. Scansiona il codice QR sopra con la tua app di autenticazione.<br />
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
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    style={{ letterSpacing: "0.2em", textAlign: "center", fontSize: 16, fontWeight: 700 }}
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--amber)" }}>
                Verifica e attiva
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
