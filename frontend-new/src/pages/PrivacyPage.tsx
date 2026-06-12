import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { PrivacyContent } from "../components/legal/LegalContent";

export function PrivacyPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card">
          <h1>{t("legal.privacy.title")}</h1>
          <PrivacyContent />
        </div>
      </div>
    </div>
  );
}
