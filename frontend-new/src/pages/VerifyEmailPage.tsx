import { useState } from "react";
import { Icon } from "../components/ui/Icon";

export function VerifyEmailPage({ page, setPage }: any) {
  const [success, setSuccess] = useState(false);

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--cyan)" }}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" }}>
            <Icon name="mail" size={26} style={{ color: "var(--cyan)" }} />
          </div>
          <h2>Verifica la tua Email</h2>
          <p>Conferma il tuo indirizzo email per sbloccare tutte le funzionalità</p>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
              <Icon name="check" size={12} /> Email verificata con successo!
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Grazie! Il tuo indirizzo email è stato verificato ed il tuo account è ora completamente attivo.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }} onClick={() => setPage("home")}>
              Accedi alla Dashboard
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
              Abbiamo inviato un link di verifica alla tua email. Clicca sul pulsante qui sotto per simulare il completamento della verifica.
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }} onClick={() => setSuccess(true)}>
              Simula Click Link Verifica
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
              Non hai ricevuto nulla? <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }}>Rinvia codice</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
