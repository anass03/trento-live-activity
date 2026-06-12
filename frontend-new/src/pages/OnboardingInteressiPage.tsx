import { useState } from "react";
import { Icon } from "../components/ui/Icon";
import { completeOnboarding } from "../lib/api";

const INTERESTS_ONBOARDING = [
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)", desc: "Concerti live, DJ set, festival ed eventi musicali all'aperto." },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)",  desc: "Musei, mostre, gallerie d'arte, cinema, e visite guidate." },
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)",    desc: "Trekking, escursioni guidate, giri in bici e percorsi panoramici." },
  { id: "food",     label: "Food & Drink",icon: "food",     color: "var(--amber)",   desc: "Degustazioni in cantina, sagre tipiche, food truck e aperitivi." },
  { id: "sport",    label: "Sport",       icon: "run",      color: "var(--green)",   desc: "Corsi, partite, allenamenti di gruppo all'aperto, e jogging." },
  { id: "famiglia", label: "Famiglia",    icon: "family",   color: "var(--cyan)",    desc: "Laboratori didattici, picnic guidati ed attività adatte ai più piccoli." },
];

export function OnboardingInteressiPage({ page, setPage }: any) {
  const [selected, setSelected] = useState<string[]>(["outdoor", "cultura"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    setError("");
    try {
      await completeOnboarding({ interessi: selected });
      setPage("home");
    } catch (err: any) {
      setError(err.message || "Errore durante il salvataggio degli interessi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-auth-scene" style={{ padding: "60px 20px" }}>
      <div className="revamp-form-card anim-in" style={{ maxWidth: 620, "--accent": "var(--teal)" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--teal)" } as React.CSSProperties}>
            <Icon name="sparkle" size={26} style={{ color: "var(--teal)" }} />
          </div>
          <h2>I tuoi Interessi</h2>
          <p>Seleziona i temi che preferisci per ricevere suggerimenti su misura</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        <div className="revamp-interests-grid">
          {INTERESTS_ONBOARDING.map((item) => {
            const active = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={"revamp-interest-card" + (active ? " on" : "")}
                style={{ "--ic": item.color } as React.CSSProperties}
                onClick={() => toggleInterest(item.id)}
              >
                <div className="ic-wrap">
                  <Icon name={item.icon} size={20} />
                </div>
                <div className="lbl">{item.label}</div>
                <div className="desc">{item.desc}</div>
              </button>
            );
          })}
        </div>

        <button className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} onClick={handleFinish} disabled={loading}>
          {loading ? "Salvataggio..." : "Salva e continua"}{" "}
          {!loading && <Icon name="check" size={16} />}
        </button>
      </div>
    </div>
  );
}
