import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function AdminNotificationsPage({ page, setPage, theme, setTheme, user }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("info");
  const [success, setSuccess] = useState(false);

  const handleSend = (e: any) => {
    e.preventDefault();
    if (!title || !desc) return;
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTitle("");
      setDesc("");
    }, 1500);
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>Invio Notifiche di Broadcast</h1>
        <p>Invia avvisi e notifiche di sistema in tempo reale a tutti gli utenti dell'applicazione</p>

        <div className="revamp-legal-card anim-in" style={{ "--accent": "var(--cyan)", maxWidth: 640, margin: "20px auto 0" }}>
          <h2>Compila Messaggio Broadcast</h2>
          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "12px 0", justifyContent: "center", marginBottom: 14 }}>
              <Icon name="check" size={12} /> Notifica inviata con successo!
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Livello Notifica</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={"s-rpill" + (type === "info" ? " on" : "")}
                    style={{ "--accent": "var(--cyan)" }}
                    onClick={() => setType("info")}
                  >
                    <Icon name="cloud" size={14} /> Informativa
                  </button>
                  <button
                    type="button"
                    className={"s-rpill" + (type === "warning" ? " on" : "")}
                    style={{ "--accent": "var(--amber)" }}
                    onClick={() => setType("warning")}
                  >
                    <Icon name="calendar" size={14} /> Avviso Medio
                  </button>
                  <button
                    type="button"
                    className={"s-rpill" + (type === "critical" ? " on" : "")}
                    style={{ "--accent": "var(--red)" }}
                    onClick={() => setType("critical")}
                  >
                    <Icon name="cone" size={14} /> Urgente
                  </button>
                </div>
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Titolo Notifica</label>
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder="Es. Sospensione temporanea servizio bus"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: 14 }}
                  required
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Contenuto Notifica</label>
                <textarea
                  className="revamp-textarea"
                  placeholder="Inserisci i dettagli ed eventuali istruzioni utili per gli utenti..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }}>
                Invia Notifica <Icon name="bell" size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
