/* ===========================================================
   Trento Live Activity — contenuto legale riusabile
   Corpo (senza Header/scene) di Privacy Policy e Termini di
   Servizio, condiviso tra le pagine standalone e LegalModal.
   Le stringhe vivono in locales/{it,en}/admin.json → "legal".
   =========================================================== */
import { useTranslation } from "react-i18next";

export function PrivacyContent() {
  const { t } = useTranslation();
  return (
    <>
      <p>{t("legal.privacy.updated")}</p>

      <h2>{t("legal.privacy.s1Title")}</h2>
      <p>{t("legal.privacy.s1Body")}</p>

      <h2>{t("legal.privacy.s2Title")}</h2>
      <p>{t("legal.privacy.s2Intro")}</p>
      <ul>
        <li>{t("legal.privacy.s2Item1")}</li>
        <li>{t("legal.privacy.s2Item2")}</li>
        <li>{t("legal.privacy.s2Item3")}</li>
      </ul>

      <h2>{t("legal.privacy.s3Title")}</h2>
      <p>{t("legal.privacy.s3Body")}</p>

      <h2>{t("legal.privacy.s4Title")}</h2>
      <p>{t("legal.privacy.s4Body")}</p>
    </>
  );
}

export function TermsContent() {
  const { t } = useTranslation();
  return (
    <>
      <p>{t("legal.terms.updated")}</p>

      <h2>{t("legal.terms.s1Title")}</h2>
      <p>{t("legal.terms.s1Body")}</p>

      <h2>{t("legal.terms.s2Title")}</h2>
      <p>{t("legal.terms.s2Body")}</p>

      <h2>{t("legal.terms.s3Title")}</h2>
      <p>{t("legal.terms.s3Body")}</p>

      <h2>{t("legal.terms.s4Title")}</h2>
      <p>{t("legal.terms.s4Body")}</p>
    </>
  );
}
