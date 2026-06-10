import { useEffect, useState } from "react";
import { login } from "../../lib/api";
import { Icon } from "../ui/Icon";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (needs2faSetup?: boolean) => void;
  onRegister: () => void;
  onPasswordReset: () => void;
};

export function LoginModal({ open, onClose, onSuccess, onRegister, onPasswordReset }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setError("");
  }, [open]);

  if (!open) return null;

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Inserisci sia l'email che la password.");
      return;
    }
    if (showOtp && !otpToken) {
      setError("Inserisci il codice 2FA.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password, showOtp ? otpToken : undefined);
      onSuccess(!!res.needs2faSetup);
    } catch (err: any) {
      if (err.code === "2FA_REQUIRED") {
        setShowOtp(true);
        setError("Inserisci il codice di verifica 2FA.");
      } else {
        setError(err.message || "Errore durante l'accesso.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-modal-scrim" onMouseDown={onClose}>
      <div className="login-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <button className="detail-modal-close login-modal-x" onClick={onClose} aria-label="Chiudi">
          <Icon name="x" size={17} />
        </button>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" } as any}>
            <Icon name="logIn" size={26} />
          </div>
          <h2 id="login-modal-title">Accedi</h2>
          <p>Entra per partecipare, salvare contenuti e gestire le tue attivita.</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="revamp-form-group">
            <label className="revamp-form-label">Email</label>
            <div className="revamp-form-input-wrap">
              <Icon name="mail" size={16} />
              <input
                type="email"
                className="revamp-form-input"
                placeholder="nome@esempio.com"
                value={email}
                disabled={loading || showOtp}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-group">
            <label className="revamp-form-label">Password</label>
            <div className="revamp-form-input-wrap">
              <Icon name="key" size={16} />
              <input
                type="password"
                className="revamp-form-input"
                placeholder="Password"
                value={password}
                disabled={loading || showOtp}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {showOtp && (
            <div className="revamp-form-group anim-in">
              <label className="revamp-form-label">Codice 2FA o recupero</label>
              <div className="revamp-form-input-wrap" style={{ borderColor: "var(--cyan)" }}>
                <Icon name="shieldCheck" size={16} />
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder="000000"
                  value={otpToken}
                  disabled={loading}
                  onChange={(e) => setOtpToken(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="revamp-form-row">
            <span className="login-modal-guest">Gli ospiti possono esplorare tutto.</span>
            <button type="button" className="revamp-form-link bare-btn" onClick={onPasswordReset}>
              Password dimenticata?
            </button>
          </div>

          <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as any} disabled={loading}>
            {loading ? "Caricamento..." : "Accedi"}
            {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
          </button>
        </form>

        <div className="revamp-form-foot">
          Non hai un account?{" "}
          <button className="revamp-form-link bare-btn" onClick={onRegister}>
            Registrati ora
          </button>
        </div>
      </div>
    </div>
  );
}
