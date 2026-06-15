import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { TermsContent } from "../components/legal/LegalContent";

export function TermsPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card">
          <h1>{t("legal.terms.title")}</h1>
          <TermsContent />
        </div>
      </div>
    </div>
  );
}
