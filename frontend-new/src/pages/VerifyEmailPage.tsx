import { useEffect, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { verifyEmail } from "../lib/api";

export function VerifyEmailPage({ page, setPage }: any) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setLoading(true);
      verifyEmail(token)
        .then(() => {
          setSuccess(true);
          // Clean URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err: any) => {
          setError(err.message || "Token di verifica non valido o scaduto.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
            <Icon name="mail" size={26} style={{ color: "var(--cyan)" }} />
          </div>
          <h2>Verifica la tua Email</h2>
          <p>Conferma il tuo indirizzo email per attivare l'account</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Verifica dell'indirizzo email in corso...</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center" }}>
            <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
              <Icon name="warn" size={12} /> {error}
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>
              Il link potrebbe essere scaduto. Controlla la tua casella di posta o esegui nuovamente la registrazione.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("login")}>
              Torna al Login
            </button>
          </div>
        )}

        {!loading && !error && success && (
          <div style={{ textAlign: "center" }}>
            <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
              <Icon name="check" size={12} /> Email verificata con successo!
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Grazie! Il tuo indirizzo email è stato verificato ed il tuo account è ora completamente attivo.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("home")}>
              Accedi alla Dashboard
            </button>
          </div>
        )}

        {!loading && !error && !success && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
              Abbiamo inviato un link di verifica alla tua email. Controlla la tua posta elettronica e clicca sul link per attivare l'account.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("login")}>
              Torna al Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
