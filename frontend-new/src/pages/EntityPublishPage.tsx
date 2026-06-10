import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { createEvent, createActivity, getPOIs, POI } from "../lib/api";

const PUBLISH_CATEGORIES = [
  { id: "cultura",  label: "Cultura",      icon: "landmark", color: "var(--violet)" },
  { id: "musica",   label: "Musica",       icon: "music",    color: "var(--magenta)" },
  { id: "sport",    label: "Sport",        icon: "run",      color: "var(--green)" },
  { id: "cibo",     label: "Cibo & Drink", color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  label: "Outdoor",      color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", label: "Famiglia",     color: "var(--cyan)",    icon: "family" },
];

export function EntityPublishPage({ page, setPage, theme, setTheme, user }: any) {
  const [publishType, setPublishType] = useState<"event" | "activity">("event");
  const [cat, setCat] = useState("cultura");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [poiId, setPoiId] = useState("");
  const [pois, setPois] = useState<POI[]>([]);
  const [when, setWhen] = useState(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [cap, setCap] = useState("50");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPOIs()
      .then((data) => setPois(data))
      .catch((err) => console.error("Failed to load POIs:", err));
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!title || !desc || !poiId) {
      setError("Compila tutti i campi richiesti (compreso il punto di interesse).");
      return;
    }
    
    setLoading(true);
    try {
      const selectedPoi = pois.find(p => p.id === poiId);
      const lat = selectedPoi?.latitudine;
      const lng = selectedPoi?.longitudine;

      if (publishType === "event") {
        await createEvent({
          titolo: title,
          descrizione: desc,
          categoria: cat,
          data: when,
          orarioInizio: startTime,
          orarioFine: endTime,
          poiId,
          latitudine: lat,
          longitudine: lng,
          maxPartecipanti: Number(cap),
        });
      } else {
        await createActivity({
          tipo: cat,
          data: when,
          orarioInizio: startTime,
          orarioFine: endTime,
          poiId,
          latitudine: lat,
          longitudine: lng,
          maxPartecipanti: Number(cap),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPage(publishType === "event" ? "eventi" : "attivita");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore durante la pubblicazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card anim-in" style={{ "--accent": "var(--violet)", maxWidth: "680px" } as React.CSSProperties}>
          <h1>Pubblica Nuovo Contenuto</h1>
          <p>Seleziona la tipologia di pubblicazione e compila il modulo come Ente Certificato.</p>

          <div style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
            <button
              className={`s-rpill ${publishType === "event" ? "on" : ""}`}
              onClick={() => setPublishType("event")}
              style={{ flex: 1, padding: "10px 0", justifyContent: "center" }}
            >
              <Icon name="calendar" size={15} /> Evento Comunale
            </button>
            <button
              className={`s-rpill ${publishType === "activity" ? "on" : ""}`}
              onClick={() => setPublishType("activity")}
              style={{ flex: 1, padding: "10px 0", justifyContent: "center" }}
            >
              <Icon name="activity" size={15} /> Attività Spontanea
            </button>
          </div>

          {error && (
            <div className="revamp-status-pill danger" style={{ width: "100%", padding: "10px 0", justifyContent: "center", marginBottom: 20 }}>
              <Icon name="warn" size={12} /> {error}
            </div>
          )}

          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "16px 0", justifyContent: "center", marginBottom: 20 }}>
              <Icon name="check" size={14} /> Contenuto pubblicato con successo! Reindirizzamento...
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
                    style={{ "--ic": item.color } as React.CSSProperties}
                    onClick={() => setCat(item.id)}
                  >
                    <Icon name={item.icon} size={14} /> {item.label}
                  </button>
                ))}
              </div>

              <h3 className="revamp-detail-section-title">2. Informazioni Principali</h3>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Titolo</label>
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder="Es. Mostra fotografica all'aperto o Trekking collinare"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: 14 }}
                  required
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Descrizione</label>
                <textarea
                  className="revamp-textarea"
                  placeholder="Fornisci dettagli sul programma, requisiti di ingresso ed informazioni utili..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <h3 className="revamp-detail-section-title">3. Luogo & Orari</h3>
              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Punto di Interesse (Luogo)</label>
                  <select
                    className="revamp-select"
                    value={poiId}
                    onChange={(e) => setPoiId(e.target.value)}
                    style={{ height: "38px", width: "100%", background: "var(--chip-fill)", color: "white", padding: "0 10px" }}
                    required
                  >
                    <option value="">Seleziona un POI...</option>
                    {pois.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Data</label>
                  <input
                    type="date"
                    className="revamp-form-input"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
              </div>

              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Ora Inizio</label>
                  <input
                    type="time"
                    className="revamp-form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Ora Fine</label>
                  <input
                    type="time"
                    className="revamp-form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">Capacità Max Posti</label>
                  <input
                    type="number"
                    className="revamp-form-input"
                    placeholder="50"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" } as React.CSSProperties} disabled={loading}>
                {loading ? "Pubblicazione..." : "Pubblica Contenuto"}{" "}
                {!loading && <Icon name="sparkle" size={16} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
