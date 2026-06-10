import { useEffect, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { forgotPassword, resetPassword } from "../lib/api";

export function PasswordResetPage({ page, setPage }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [token, setToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Check URL query parameters for a reset token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || params.get("resetToken");
    if (t) {
      setToken(t);
    }
  }, []);

  const handleRequestLink = async (e: any) => {
    e.preventDefault();
    if (!email) {
      setError("Inserisci il tuo indirizzo email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Errore durante l'invio dell'email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e: any) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Compila tutti i campi.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPassword(token!, password);
      setSuccessMsg("Password reimpostata con successo! Ora puoi accedere.");
      setTimeout(() => {
        // Clean URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        setPage("login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Errore durante la reimpostazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--magenta)" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--magenta)" } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" fill="none" stroke="var(--magenta)" strokeWidth="2" />
              <path d="M12 7v5l3 3" stroke="var(--magenta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>{token ? "Scegli Nuova Password" : "Reimposta Password"}</h2>
          <p>{token ? "Inserisci la tua nuova password d'accesso" : "Riceverai un link via email per reimpostare la tua password"}</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="revamp-status-pill success" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="check" size={12} /> {successMsg}
          </div>
        )}

        {token ? (
          /* Confirm reset password form */
          !successMsg && (
            <form onSubmit={handleResetConfirm}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Nuova Password</label>
                <div className="revamp-form-input-wrap">
                  <Icon name="key" size={16} />
                  <input
                    type="password"
                    className="revamp-form-input"
                    placeholder="Minimo 8 caratteri"
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Conferma Password</label>
                <div className="revamp-form-input-wrap">
                  <Icon name="key" size={16} />
                  <input
                    type="password"
                    className="revamp-form-input"
                    placeholder="Ripeti la nuova password"
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--magenta)" } as React.CSSProperties} disabled={loading}>
                {loading ? "Reimpostazione..." : "Reimposta Password"}{" "}
                {!loading && <Icon name="check" size={16} />}
              </button>
            </form>
          )
        ) : (
          /* Request link form */
          submitted ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
                <Icon name="check" size={12} /> Email inviata con successo!
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>
                Controlla la tua casella postale all'indirizzo <b>{email}</b> e segui le istruzioni fornite.
              </p>
              <button className="revamp-form-btn" style={{ "--accent": "var(--magenta)" } as React.CSSProperties} onClick={() => setPage("login")}>
                Torna al Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestLink}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Email dell'account</label>
                <div className="revamp-form-input-wrap">
                  <Icon name="mail" size={16} />
                  <input
                    type="email"
                    className="revamp-form-input"
                    placeholder="nome@esempio.com"
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--magenta)" } as React.CSSProperties} disabled={loading}>
                {loading ? "Invio in corso..." : "Invia istruzioni"}{" "}
                {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
              </button>
            </form>
          )
        )}

        {!submitted && !successMsg && (
          <div className="revamp-form-foot">
            <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("login")}>
              Annulla e torna indietro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
