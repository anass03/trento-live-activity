import { useState } from "react";
import { Icon } from "../components/ui/Icon";

const INTERESTS_ONBOARDING = [
  { id: "musica",   label: "Musica",      icon: "music",    color: "var(--magenta)", desc: "Concerti live, DJ set, festival ed eventi musicali all'aperto." },
  { id: "cultura",  label: "Cultura",     icon: "landmark", color: "var(--violet)",  desc: "Musei, mostre, gallerie d'arte, cinema, e visite guidate." },
  { id: "outdoor",  label: "Outdoor",     icon: "bike",     color: "var(--teal)",    desc: "Trekking, escursioni guidate, giri in bici e percorsi panoramici." },
  { id: "cibo",     label: "Food & Drink",icon: "food",     color: "var(--amber)",   desc: "Degustazioni in cantina, sagre tipiche, food truck e aperitivi." },
  { id: "sport",    label: "Sport",       icon: "run",      color: "var(--green)",   desc: "Corsi, partite, allenamenti di gruppo all'aperto, e jogging." },
  { id: "famiglia", label: "Famiglia",    icon: "family",   color: "var(--cyan)",    desc: "Laboratori didattici, picnic guidati ed attività adatte ai più piccoli." },
];

export function OnboardingInteressiPage({ page, setPage }: any) {
  const [selected, setSelected] = useState<string[]>(["outdoor", "cultura"]);

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    setPage("home");
  };

  return (
    <div className="revamp-auth-scene" style={{ padding: "60px 20px" }}>
      <div className="revamp-form-card anim-in" style={{ maxWidth: 620, "--accent": "var(--teal)" }}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--teal)" }}>
            <Icon name="sparkle" size={26} style={{ color: "var(--teal)" }} />
          </div>
          <h2>I tuoi Interessi</h2>
          <p>Seleziona i temi che preferisci per ricevere suggerimenti su misura</p>
        </div>

        <div className="revamp-interests-grid">
          {INTERESTS_ONBOARDING.map((item) => {
            const active = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={"revamp-interest-card" + (active ? " on" : "")}
                style={{ "--ic": item.color }}
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

        <button className="revamp-form-btn" style={{ "--accent": "var(--teal)" }} onClick={handleFinish}>
          Salva e continua <Icon name="check" size={16} />
        </button>
      </div>
    </div>
  );
}
