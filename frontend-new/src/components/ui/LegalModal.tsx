/* ===========================================================
   Trento Live Activity — LEGAL MODAL
   Grande popup scrollabile per Privacy Policy / Termini di
   Servizio. Riusa lo scrim/card delle modali condivise
   (detail-modal*) con varianti .legal-modal definite in
   styles/settings-redesign.css.
   =========================================================== */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import { PrivacyContent, TermsContent } from "../legal/LegalContent";

type LegalModalProps = {
  doc: "privacy" | "terms";
  onClose: () => void;
};

export function LegalModal({ doc, onClose }: LegalModalProps) {
  const { t } = useTranslation();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, doc]);

  const title = doc === "privacy" ? t("legal.privacy.title") : t("legal.terms.title");

  return (
    <div className="detail-modal-scrim" onMouseDown={onClose}>
      <div
        className="detail-modal legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="detail-modal-head">
          <div>
            <div className="detail-modal-kicker">{t("settings.legalModal.kicker")}</div>
            <h2 id="legal-modal-title">{title}</h2>
          </div>
          <button className="detail-modal-close" onClick={onClose} aria-label={t("settings.legalModal.close")}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div ref={bodyRef} className="detail-modal-body legal-modal-body">
          {doc === "privacy" ? <PrivacyContent /> : <TermsContent />}
        </div>
      </div>
    </div>
  );
}
