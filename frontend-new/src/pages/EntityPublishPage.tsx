import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

const PUBLISH_CATEGORIES = [
  { id: "cultura",  label: "Cultura",      icon: "landmark", color: "var(--violet)" },
  { id: "musica",   label: "Musica",       icon: "music",    color: "var(--magenta)" },
  { id: "sport",    label: "Sport",        icon: "run",      color: "var(--green)" },
  { id: "cibo",     label: "Cibo & Drink", color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  label: "Outdoor",      color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", label: "Famiglia",     color: "var(--cyan)",    icon: "family" },
];

export function EntityPublishPage({ page, setPage, theme, setTheme }: any) {
  const [cat, setCat] = useState("cultura");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [place, setPlace] = useState("");
  const [when, setWhen] = useState("");
  const [cap, setCap] = useState("50");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!title || !desc || !place || !when) return;
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setPage("eventi");
    }, 1500);
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card anim-in" style={{ "--accent": "var(--violet)" }}>
          <h1>Pubblica un Nuovo Evento / Attività</h1>
          <p>Compila il modulo sottostante come Ente Certificato per proporre la tua attività alla cittadinanza di Trento.</p>

          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "16px 0", justifyContent: "center", marginBottom: 20 }}>
              <Icon name="check" size={14} /> Attività pubblicata con successo! Reindirizzamento...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 className="revamp-detail-section-title">1. Seleziona una Categoria</h3>
              <div className="s-interests" style={{ marginBottom: 24 }}>
                {PUBLISH_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={"s-int-chip" + (cat === item.id ? " on" : "")}
                    style={{ "--ic": item.color }}
                    onClick={() => setCat(item.id)}
                  >
                    <Icon name={item.icon} size={14} /> {item.label}
                  </button>
                ))}
              </div>

              <h3 className="revamp-detail-section-title">2. Informazioni Principali</h3>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Titolo dell'Attività</label>
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder="Es. Mostra fotografica all'aperto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: 14 }}
                  required
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Descrizione dell'Attività</label>
                <textarea
                  className="revamp-textarea"
                  placeholder="Fornisci dettagli sul programma dell'evento, requisiti di ingresso ed informazioni utili per i partecipanti..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <h3 className="revamp-detail-section-title">3. Luogo & Orari</h3>
              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Luogo dell'Evento</label>
                  <input
                    type="text"
                    className="revamp-form-input"
                    placeholder="Es. Piazza Fiera, Trento"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Orario / Data</label>
                  <input
                    type="text"
                    className="revamp-form-input"
                    placeholder="Es. Oggi, ore 18:30"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
              </div>

              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Capacità Massima Posti</label>
                  <input
                    type="number"
                    className="revamp-form-input"
                    placeholder="Es. 50"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Costo Ingresso (opzionale)</label>
                  <input
                    type="text"
                    className="revamp-form-input"
                    placeholder="Es. Gratis o 10€"
                    style={{ paddingLeft: 14 }}
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" }}>
                Pubblica Attività <Icon name="sparkle" size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
