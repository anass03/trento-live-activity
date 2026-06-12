import { useState } from "react";
import { Icon } from "../ui/Icon";
import { createActivity, suggestActivityAi } from "../../lib/api";

/* Categorie attività spontanee (enum backend ACTIVITY_TYPES) */
const ACT_TYPES = [
  { id: "sport",       label: "Sport",       icon: "run",      color: "var(--green)" },
  { id: "cultura",     label: "Cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "musica",      label: "Musica",      icon: "music",    color: "var(--magenta)" },
  { id: "arte",        label: "Arte",        icon: "sparkle",  color: "var(--orange, var(--amber))" },
  { id: "gastronomia", label: "Gastronomia", icon: "food",     color: "var(--amber)" },
  { id: "studio",      label: "Studio",      icon: "bookmark", color: "var(--cyan)" },
];

function todayISO() {
  // data locale, non UTC: dopo mezzanotte toISOString() darebbe ieri
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Pannello di creazione attività per i cittadini.
   Il POI è già scelto (si arriva qui dal popup di un POI sulla mappa):
   qui si sceglie la categoria e i dettagli, con suggerimenti AI opzionali. */
export function CreateActivityPanel({ poi, onClose, onCreated }: {
  poi: { id: string; title: string };
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [tipo, setTipo] = useState("");
  const [data, setData] = useState(todayISO());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [cap, setCap] = useState("10");

  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiError, setAiError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAiSuggest = async () => {
    if (!aiDescription.trim()) return;
    setAiError("");
    setAiHint("");
    setAiLoading(true);
    try {
      const result = await suggestActivityAi({ description: aiDescription, location: poi.title });
      setTipo(result.tipo);
      setData(result.data);
      setStartTime(result.orarioInizio);
      setEndTime(result.orarioFine);
      setCap(String(result.maxPartecipanti));
      setAiHint(result.reasoning);
    } catch (err: any) {
      setAiError(err.message || "Suggerimento AI non disponibile al momento.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!tipo) {
      setError("Scegli la categoria dell'attività.");
      return;
    }
    setLoading(true);
    try {
      await createActivity({
        tipo,
        data,
        orarioInizio: startTime,
        orarioFine: endTime,
        maxPartecipanti: Number(cap),
        poiId: poi.id,
      });
      setSuccess(true);
      setTimeout(() => { onCreated && onCreated(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione dell'attività.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="detail-modal-scrim" onMouseDown={onClose}>
      <div
        className="detail-modal"
        style={{ "--dm-accent": "var(--teal)" } as any}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="detail-modal-head">
          <div>
            <div className="detail-modal-kicker">Punto di interesse</div>
            <h2>Crea attività — {poi.title}</h2>
          </div>
          <button className="detail-modal-close" onClick={onClose} aria-label="Chiudi">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="detail-modal-body">
          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "16px 0", justifyContent: "center" }}>
              <Icon name="check" size={14} /> Attività creata con successo!
            </div>
          ) : (
            <>
              {/* AI suggester: descrizione libera → categoria/orari proposti */}
              <div className="cap-ai-box">
                <label className="revamp-form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="sparkle" size={13} /> Descrivi cosa vuoi organizzare (AI)
                </label>
                <textarea
                  className="revamp-textarea"
                  style={{ minHeight: 56 }}
                  rows={2}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder='Es. "Partita di calcetto domani sera con gli amici"'
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="revamp-action-btn"
                    disabled={aiLoading || !aiDescription.trim()}
                    onClick={handleAiSuggest}
                  >
                    <Icon name="sparkle" size={12} /> {aiLoading ? "Suggerimento in corso…" : "Suggerisci con AI"}
                  </button>
                  {aiHint && <small style={{ color: "var(--green)", fontSize: 12 }}>{aiHint}</small>}
                  {aiError && <small style={{ color: "var(--red)", fontSize: 12 }}>{aiError}</small>}
                </div>
              </div>

              {error && (
                <div className="revamp-status-pill danger" style={{ width: "100%", padding: "10px 0", justifyContent: "center", margin: "14px 0 0" }}>
                  <Icon name="warn" size={12} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                <h3 className="revamp-detail-section-title">Categoria</h3>
                <div className="s-interests" style={{ marginBottom: 18 }}>
                  {ACT_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={"s-int-chip" + (tipo === item.id ? " on" : "")}
                      style={{ "--ic": item.color } as React.CSSProperties}
                      onClick={() => setTipo(item.id)}
                    >
                      <Icon name={item.icon} size={14} /> {item.label}
                    </button>
                  ))}
                </div>

                <h3 className="revamp-detail-section-title">Data & Orari</h3>
                <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">Data</label>
                    <input type="date" className="revamp-form-input" value={data}
                      onChange={(e) => setData(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">Max partecipanti</label>
                    <input type="number" min={2} max={50} className="revamp-form-input" value={cap}
                      onChange={(e) => setCap(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                </div>
                <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">Ora inizio</label>
                    <input type="time" className="revamp-form-input" value={startTime}
                      onChange={(e) => setStartTime(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">Ora fine</label>
                    <input type="time" className="revamp-form-input" value={endTime}
                      onChange={(e) => setEndTime(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                </div>

                <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} disabled={loading}>
                  {loading ? "Creazione…" : "Crea Attività"} {!loading && <Icon name="check" size={15} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
