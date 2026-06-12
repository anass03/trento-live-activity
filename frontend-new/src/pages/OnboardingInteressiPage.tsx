import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/ui/Icon";
import { completeOnboarding } from "../lib/api";

const INTERESTS_ONBOARDING = [
  { id: "musica",   icon: "music",    color: "var(--magenta)" },
  { id: "cultura",  icon: "landmark", color: "var(--violet)" },
  { id: "outdoor",  icon: "bike",     color: "var(--teal)" },
  { id: "food",     icon: "food",     color: "var(--amber)" },
  { id: "sport",    icon: "run",      color: "var(--green)" },
  { id: "famiglia", icon: "family",   color: "var(--cyan)" },
];

export function OnboardingInteressiPage({ page, setPage }: any) {
  const { t } = useTranslation();
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
      setError(err.message || t("onboarding.saveError"));
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
          <h2>{t("onboarding.title")}</h2>
          <p>{t("onboarding.subtitle")}</p>
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
                <div className="lbl">{t(`onboarding.interests.${item.id}.label`)}</div>
                <div className="desc">{t(`onboarding.interests.${item.id}.desc`)}</div>
              </button>
            );
          })}
        </div>

        <button className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} onClick={handleFinish} disabled={loading}>
          {loading ? t("onboarding.saving") : t("onboarding.saveBtn")}{" "}
          {!loading && <Icon name="check" size={16} />}
        </button>
      </div>
    </div>
  );
}
