import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../ui/Icon";
import { createActivity, suggestActivityAi } from "../../lib/api";

const ACT_TYPE_DEFS = [
  { id: "sport",       icon: "run",      color: "var(--green)" },
  { id: "cultura",     icon: "landmark", color: "var(--violet)" },
  { id: "musica",      icon: "music",    color: "var(--magenta)" },
  { id: "arte",        icon: "sparkle",  color: "var(--orange, var(--amber))" },
  { id: "gastronomia", icon: "food",     color: "var(--amber)" },
  { id: "studio",      icon: "bookmark", color: "var(--cyan)" },
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
  const { t } = useTranslation();
  const ACT_TYPES = ACT_TYPE_DEFS.map((d) => ({ ...d, label: t(`activities.cats.${d.id}`) }));
  const [tipo, setTipo] = useState("");
  const [data, setData] = useState(todayISO());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [cap, setCap] = useState("10");

  // Descrizione dell'attività (salvata sull'attività). È anche il testo che
  // alimenta il suggeritore AI: un solo campo, niente doppia digitazione.
  const [description, setDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiError, setAiError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAiSuggest = async () => {
    if (!description.trim()) return;
    setAiError("");
    setAiHint("");
    setAiLoading(true);
    try {
      const result = await suggestActivityAi({ description, location: poi.title });
      setTipo(result.tipo);
      setData(result.data);
      setStartTime(result.orarioInizio);
      setEndTime(result.orarioFine);
      setCap(String(result.maxPartecipanti));
      setAiHint(result.reasoning);
    } catch (err: any) {
      setAiError(err.message || t("createActivity.aiUnavailable"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!tipo) {
      setError(t("createActivity.categoryError"));
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
        description: description.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onCreated && onCreated(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.message || t("createActivity.createError"));
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
            <div className="detail-modal-kicker">{t("createActivity.kicker")}</div>
            <h2>{t("createActivity.title")} — {poi.title}</h2>
          </div>
          <button className="detail-modal-close" onClick={onClose} aria-label={t("widgets.popup.close")}>
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="detail-modal-body">
          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "16px 0", justifyContent: "center" }}>
              <Icon name="check" size={14} /> {t("createActivity.success")}
            </div>
          ) : (
            <>
              {/* Descrizione dell'attività (salvata). Lo stesso testo può
                  alimentare il suggeritore AI per categoria e orari. */}
              <div className="cap-ai-box">
                <label className="revamp-form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="edit" size={13} /> {t("createActivity.descriptionLabel")}
                </label>
                <textarea
                  className="revamp-textarea"
                  style={{ minHeight: 72 }}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("createActivity.descriptionPlaceholder")}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="revamp-action-btn"
                    disabled={aiLoading || !description.trim()}
                    onClick={handleAiSuggest}
                  >
                    <Icon name="sparkle" size={12} /> {aiLoading ? t("createActivity.aiLoading") : t("createActivity.aiSuggest")}
                  </button>
                  <small style={{ color: "var(--text-muted)", fontSize: 12 }}>{t("createActivity.descriptionAiHint")}</small>
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
                <h3 className="revamp-detail-section-title">{t("createActivity.sectionCategory")}</h3>
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

                <h3 className="revamp-detail-section-title">{t("createActivity.sectionDateTime")}</h3>
                <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">{t("createActivity.dateLabel")}</label>
                    <input type="date" className="revamp-form-input" value={data}
                      onChange={(e) => setData(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">{t("createActivity.maxParticipants")}</label>
                    <input type="number" min={2} max={50} className="revamp-form-input" value={cap}
                      onChange={(e) => setCap(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                </div>
                <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">{t("createActivity.startLabel")}</label>
                    <input type="time" className="revamp-form-input" value={startTime}
                      onChange={(e) => setStartTime(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                  <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                    <label className="revamp-form-label">{t("createActivity.endLabel")}</label>
                    <input type="time" className="revamp-form-input" value={endTime}
                      onChange={(e) => setEndTime(e.target.value)} style={{ paddingLeft: 12 }} required />
                  </div>
                </div>

                <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} disabled={loading}>
                  {loading ? t("createActivity.creating") : t("createActivity.submit")} {!loading && <Icon name="check" size={15} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
