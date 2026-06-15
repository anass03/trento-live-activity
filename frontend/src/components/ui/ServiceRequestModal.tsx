import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import { POIMapPicker } from "../map/POIMapPicker";
import {
  submitServiceRequest,
  type ServiceRequestCategory,
  type ServiceRequestSubcategory,
  SUBCATEGORIES_BY_CATEGORY,
} from "../../lib/api";
import { showToast } from "./Toaster";

interface Props {
  theme?: string;
  initialCategory?: ServiceRequestCategory;
  onClose: () => void;
}

const ALL_CATS: ServiceRequestCategory[] = [
  "parcheggio_auto", "parcheggio_bici", "sport", "studio",
  "verde", "cultura", "ciclismo", "altro",
];

const CAT_ICON: Record<ServiceRequestCategory, string> = {
  parcheggio_auto: "car",
  parcheggio_bici: "bike",
  sport:           "activity",
  studio:          "bookmark",
  verde:           "leaf",
  cultura:         "ticket",
  ciclismo:        "bike",
  altro:           "settings",
};

type Step = "category" | "subcategory" | "location";

export function ServiceRequestModal({ theme, initialCategory, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(initialCategory ? (SUBCATEGORIES_BY_CATEGORY[initialCategory]?.length ? "subcategory" : "location") : "category");
  const [categoria, setCategoria] = useState<ServiceRequestCategory | null>(initialCategory ?? null);
  const [sottocategoria, setSottocategoria] = useState<ServiceRequestSubcategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const subcats: ServiceRequestSubcategory[] = categoria ? (SUBCATEGORIES_BY_CATEGORY[categoria] ?? []) : [];
  const steps: Step[] = subcats.length > 0 ? ["category", "subcategory", "location"] : ["category", "location"];
  const stepIdx = steps.indexOf(step);

  function selectCategory(cat: ServiceRequestCategory) {
    setCategoria(cat);
    setSottocategoria(null);
    const subs = SUBCATEGORIES_BY_CATEGORY[cat] ?? [];
    setStep(subs.length > 0 ? "subcategory" : "location");
  }

  function selectSubcat(sub: ServiceRequestSubcategory | null) {
    setSottocategoria(sub);
    setStep("location");
  }

  function goBack() {
    if (step === "location") setStep(subcats.length > 0 ? "subcategory" : "category");
    else if (step === "subcategory") setStep("category");
  }

  async function handleLocationConfirm({ latitudine, longitudine }: { latitudine: number; longitudine: number }) {
    if (!categoria) return;
    setSubmitting(true);
    try {
      await submitServiceRequest({ categoria, sottocategoria, latitudine, longitudine });
      showToast({ title: t("serviceRequest.success"), type: "success" });
      onClose();
    } catch {
      showToast({ title: t("serviceRequest.error"), type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (showPicker) {
    return (
      <POIMapPicker
        theme={theme}
        onConfirm={(coords) => { setShowPicker(false); handleLocationConfirm(coords); }}
        onCancel={() => setShowPicker(false)}
      />
    );
  }

  return (
    <div
      className="detail-modal-scrim"
      style={{ zIndex: 90 }}
      onClick={onClose}
    >
      <div
        className="detail-modal sr-modal"
        style={{ "--dm-accent": "var(--violet)" } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="detail-modal-head">
          <div>
            <div className="detail-modal-kicker">📍 {t("serviceRequest.kicker")}</div>
            <h2>{step === "category" ? t("serviceRequest.stepCategoryTitle") : step === "subcategory" ? t("serviceRequest.stepSubcategoryTitle") : t("serviceRequest.stepLocationTitle")}</h2>
          </div>
          <button className="detail-modal-close bare-btn" onClick={onClose} aria-label="Chiudi">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="detail-modal-body">
          {/* Progress bar */}
          <div className="sr-steps">
            {steps.map((s, i) => (
              <div key={s} className={"sr-step" + (i < stepIdx ? " done" : i === stepIdx ? " active" : "")} />
            ))}
          </div>

          {/* STEP 1: category */}
          {step === "category" && (
            <div className="sr-modal-cats">
              {ALL_CATS.map((cat) => (
                <button
                  key={cat}
                  className={"sr-modal-cat" + (categoria === cat ? " selected" : "")}
                  onClick={() => selectCategory(cat)}
                >
                  <Icon name={CAT_ICON[cat]} size={22} />
                  <span>{t(`serviceRequest.categories.${cat}`)}</span>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: subcategory */}
          {step === "subcategory" && categoria && (
            <>
              <button className="sr-back" onClick={goBack}>
                <Icon name="chevronL" size={14} /> {t("serviceRequest.back")}
              </button>
              <div className="sr-subcat-list">
                {subcats.map((sub) => (
                  <button key={sub} className="sr-subcat-btn" onClick={() => selectSubcat(sub)}>
                    {t(`serviceRequest.subcategories.${sub}`)}
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
                <button className="sr-subcat-btn skip" onClick={() => selectSubcat(null)}>
                  {t("serviceRequest.skipSubcategory")}
                </button>
              </div>
            </>
          )}

          {/* STEP 3: location */}
          {step === "location" && (
            <>
              <button className="sr-back" onClick={goBack}>
                <Icon name="chevronL" size={14} /> {t("serviceRequest.back")}
              </button>
              <div className="sr-location-body">
                <div className="sr-location-icon">📍</div>
                <p className="sr-location-desc">{t("serviceRequest.stepLocationLabel")}</p>
                {categoria && (
                  <div className="sr-location-tags">
                    <span className="sr-location-tag">{t(`serviceRequest.categories.${categoria}`)}</span>
                    {sottocategoria && (
                      <span className="sr-location-tag" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
                        {t(`serviceRequest.subcategories.${sottocategoria}`)}
                      </span>
                    )}
                  </div>
                )}
                <button
                  className="sr-cta"
                  disabled={submitting}
                  onClick={() => setShowPicker(true)}
                >
                  <Icon name="pin" size={17} />
                  {submitting ? t("serviceRequest.submitting") : t("serviceRequest.chooseLocation")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
