import { useState } from "react";
import { Icon } from "../components/ui/Icon";

export function PasswordResetPage({ page, setPage }: any) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleReset = (e: any) => {
    e.preventDefault();
    if (!email) {
      setError("Inserisci il tuo indirizzo email.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--magenta)" }}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--magenta)" }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" fill="none" stroke="var(--magenta)" strokeWidth="2" />
              <path d="M12 7v5l3 3" stroke="var(--magenta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Reimposta Password</h2>
          <p>Riceverai un link via email per reimpostare la tua password</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
              <Icon name="check" size={12} /> Email inviata con successo!
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>
              Controlla la tua casella postale all'indirizzo <b>{email}</b> e segui le istruzioni fornite.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--magenta)" }} onClick={() => setPage("login")}>
              Torna al Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            {error && (
              <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
                <Icon name="warn" size={12} /> {error}
              </div>
            )}

            <div className="revamp-form-group">
              <label className="revamp-form-label">Email dell'account</label>
              <div className="revamp-form-input-wrap">
                <Icon name="mail" size={16} />
                <input
                  type="email"
                  className="revamp-form-input"
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--magenta)" }}>
              Invia istruzioni <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />
            </button>
          </form>
        )}

        {!submitted && (
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
