import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/ui/Icon";
import { verifyEmail } from "../lib/api";
import { needsOnboardingAfterOauth } from "../components/auth/LoginModal";

export function VerifyEmailPage({ page, setPage }: any) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setLoading(true);
      verifyEmail(token)
        .then(() => {
          setSuccess(true);
          // Clean URL parameter
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err: any) => {
          setError(err.message || t("verifyEmail.invalidToken"));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
            <Icon name="mail" size={26} style={{ color: "var(--cyan)" }} />
          </div>
          <h2>{t("verifyEmail.title")}</h2>
          <p>{t("verifyEmail.subtitle")}</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("verifyEmail.verifying")}</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center" }}>
            <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
              <Icon name="warn" size={12} /> {error}
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>
              {t("verifyEmail.expiredHint")}
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("login")}>
              {t("verifyEmail.backToLogin")}
            </button>
          </div>
        )}

        {!loading && !error && success && (
          <div style={{ textAlign: "center" }}>
            <div className="revamp-status-pill success" style={{ marginBottom: 16, display: "inline-flex", justifyContent: "center", width: "100%" }}>
              <Icon name="check" size={12} /> {t("verifyEmail.success")}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              {t("verifyEmail.successBody")}
            </p>
            <button
              className="revamp-form-btn"
              style={{ "--accent": "var(--cyan)" } as React.CSSProperties}
              onClick={async () => {
                // La verifica fa auto-login: un cittadino nuovo passa prima
                // dalla scelta interessi, poi dalla home.
                window.dispatchEvent(new Event("tla:user-updated"));
                const needsOnboarding = await needsOnboardingAfterOauth();
                setPage(needsOnboarding ? "onboarding" : "home");
              }}
            >
              {t("verifyEmail.goDashboard")}
            </button>
          </div>
        )}

        {!loading && !error && !success && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
              {t("verifyEmail.pendingBody")}
            </p>
            <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("login")}>
              {t("verifyEmail.backToLogin")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
