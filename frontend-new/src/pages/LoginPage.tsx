import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/ui/Icon";
import { SocialLoginButtons, needsOnboardingAfterOauth } from "../components/auth/LoginModal";
import { login } from "../lib/api";

export function LoginPage({ page, setPage }: any) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("auth.errors.missingCredentials"));
      return;
    }
    if (showOtp && !otpToken) {
      setError(t("auth.errors.missingOtp"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password, showOtp ? otpToken : undefined);
      if (res.needs2faSetup) {
        setPage("setup-2fa");
      } else {
        setPage("home");
      }
    } catch (err: any) {
      if (err.code === "2FA_REQUIRED") {
        setShowOtp(true);
        setError(t("auth.errors.otpRequired"));
      } else {
        setError(err.message || t("auth.errors.generic"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Successo Google: token già salvato da oauthGoogleLogin. Se il cittadino
  // non ha completato l'onboarding, manda all'onboarding interessi.
  const handleSocialLoggedIn = async () => {
    window.dispatchEvent(new CustomEvent("tla:user-updated"));
    const needsOnboarding = await needsOnboardingAfterOauth();
    setPage(needsOnboarding ? "onboarding" : "home");
  };

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 17l5-5-5-5" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H3" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>{t("auth.title")}</h2>
          <p>{t("auth.pageSubtitle")}</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="revamp-form-group">
            <label className="revamp-form-label">{t("auth.email")}</label>
            <div className="revamp-form-input-wrap">
              <Icon name="mail" size={16} />
              <input
                type="email"
                className="revamp-form-input"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                disabled={loading || showOtp}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-group">
            <label className="revamp-form-label">{t("auth.password")}</label>
            <div className="revamp-form-input-wrap">
              <Icon name="key" size={16} />
              <input
                type="password"
                className="revamp-form-input"
                placeholder="••••••••"
                value={password}
                disabled={loading || showOtp}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {showOtp && (
            <div className="revamp-form-group anim-in">
              <label className="revamp-form-label">{t("auth.otpLabelLong")}</label>
              <div className="revamp-form-input-wrap" style={{ borderColor: "var(--cyan)" }}>
                <Icon name="shieldCheck" size={16} />
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder="000000"
                  value={otpToken}
                  disabled={loading}
                  onChange={(e) => setOtpToken(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="revamp-form-row">
            <label className="revamp-checkbox-label">
              <input type="checkbox" /> {t("auth.rememberMe")}
            </label>
            <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("password-reset")}>
              {t("auth.forgotPassword")}
            </button>
          </div>

          <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} disabled={loading}>
            {loading ? t("auth.loading") : t("auth.submit")}{" "}
            {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
          </button>
        </form>

        <SocialLoginButtons onError={setError} onLoggedIn={handleSocialLoggedIn} busy={loading} />

        <div className="revamp-form-foot">
          {t("auth.noAccount")}{" "}
          <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("registrazione")}>
            {t("auth.registerNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
