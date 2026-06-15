import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { getMe, login, oauthGoogleLogin } from "../../lib/api";
import { Icon } from "../ui/Icon";

const GOOGLE_CLIENT_ID: string =
  (import.meta as ImportMeta & { env: { VITE_GOOGLE_CLIENT_ID?: string } }).env.VITE_GOOGLE_CLIENT_ID || "";

/* Stili inline per i social button: revamp-pages.css è condiviso e non va
   modificato, quindi replichiamo qui il look di .revamp-form-input. */
const socialBtnStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 11,
  background: "var(--chip-fill)",
  border: "1px solid var(--border-soft-2)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  cursor: "pointer",
  marginBottom: 10,
  transition: "border-color 160ms ease, box-shadow 160ms ease",
};
const socialBtnDisabledStyle: React.CSSProperties = {
  ...socialBtnStyle,
  opacity: 0.55,
  cursor: "not-allowed",
};

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.954 4.45z" />
    </svg>
  );
}

function SpidIcon() {
  // Stilizzazione del logo SPID (omino con freccia) in monocromo.
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7" r="3.4" />
      <path d="M12 12.2c-4 0-7.2 2.6-7.2 5.8v1.4h9.4v-3.1l-1.6 1.6-1.3-1.3 3.9-3.9c-.97-.32-2.06-.5-3.2-.5zm4.6 1.5l3.9 3.9-1.3 1.3-1.6-1.6v2.1h-1.9v-2.1l-1.6 1.6-1.3-1.3 3.8-3.9z" />
    </svg>
  );
}

/* Bottone Google interno: useGoogleLogin richiede di stare dentro al provider,
   quindi lo separiamo per poter condizionare il render del provider solo
   quando GOOGLE_CLIENT_ID è configurato. Flusso "implicit" → access_token,
   solo scope non sensibili (come in frontend-old/SocialButtons). */
function GoogleLoginButton({ onError, onLoggedIn, disabled }: {
  onError: (msg: string) => void;
  onLoggedIn: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const doLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        onError(t("auth.social.googleNoToken"));
        return;
      }
      try {
        await oauthGoogleLogin(tokenResponse.access_token);
        await onLoggedIn();
      } catch (e: any) {
        onError(e?.message || t("auth.social.googleError"));
      }
    },
    onError: () => onError(t("auth.social.googleCancelled")),
    scope: "openid email profile",
  });

  return (
    <button type="button" style={socialBtnStyle} disabled={disabled} onClick={() => doLogin()}>
      <GoogleIcon /> {t("auth.social.google")}
    </button>
  );
}

/* Divisore "oppure" + Google + Apple (prossimamente). Riusato da LoginModal
   e LoginPage. `onLoggedIn` viene invocato DOPO che oauthGoogleLogin ha già
   salvato il token. */
export function SocialLoginButtons({ onError, onLoggedIn, busy }: {
  onError: (msg: string) => void;
  onLoggedIn: () => void | Promise<void>;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 14px", color: "var(--text-faint)", fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--border-soft-2)" }} />
        {t("auth.social.divider")}
        <span style={{ flex: 1, height: 1, background: "var(--border-soft-2)" }} />
      </div>

      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLoginButton onError={onError} onLoggedIn={onLoggedIn} disabled={busy} />
        </GoogleOAuthProvider>
      ) : (
        <button type="button" style={socialBtnDisabledStyle} disabled title={t("auth.social.googleDisabledHint")}>
          <GoogleIcon /> {t("auth.social.google")}
        </button>
      )}

      <button
        type="button"
        style={socialBtnDisabledStyle}
        disabled
        title={t("auth.social.appleComingSoon")}
      >
        <AppleIcon /> {t("auth.social.apple")}
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-faint)" }}>
          · {t("auth.social.appleComingSoon")}
        </span>
      </button>

      <button
        type="button"
        style={{ ...socialBtnDisabledStyle, marginBottom: 0 }}
        disabled
        title={t("auth.social.spidComingSoon")}
      >
        <SpidIcon /> {t("auth.social.spid")}
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-faint)" }}>
          · {t("auth.social.spidComingSoon")}
        </span>
      </button>
    </div>
  );
}

/* Dopo l'OAuth: se il profilo è un cittadino senza onboarding completato,
   serve il redirect all'onboarding interessi (stessa logica di frontend-old). */
export async function needsOnboardingAfterOauth(): Promise<boolean> {
  try {
    const me = await getMe();
    return me.profile?.kind === "cittadino" && !me.profile.onboardingComplete;
  } catch {
    return false;
  }
}

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (needs2faSetup?: boolean, needsOnboarding?: boolean) => void;
  onRegister: () => void;
  onPasswordReset: () => void;
};

export function LoginModal({ open, onClose, onSuccess, onRegister, onPasswordReset }: LoginModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setOtpToken("");
    setShowOtp(false);
    setShowPw(false);
    setError("");
  }, [open]);

  if (!open) return null;

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
      // Cittadino senza onboarding completato → prima gli interessi.
      const needsOnboarding = res.needs2faSetup ? false : await needsOnboardingAfterOauth();
      onSuccess(!!res.needs2faSetup, needsOnboarding);
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

  // Successo Google: il token è già salvato da oauthGoogleLogin; notifica
  // l'app e attiva lo stesso flusso di successo del login email.
  const handleSocialLoggedIn = async () => {
    window.dispatchEvent(new CustomEvent("tla:user-updated"));
    const needsOnboarding = await needsOnboardingAfterOauth();
    onSuccess(false, needsOnboarding);
  };

  return (
    <div className="login-modal-scrim" onMouseDown={onClose}>
      <div className="login-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <button className="detail-modal-close login-modal-x" onClick={onClose} aria-label={t("auth.close")}>
          <Icon name="x" size={17} />
        </button>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" } as any}>
            <Icon name="logIn" size={26} />
          </div>
          <h2 id="login-modal-title">{t("auth.title")}</h2>
          <p>{t("auth.modalSubtitle")}</p>
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
                type={showPw ? "text" : "password"}
                className="revamp-form-input has-reveal"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                disabled={loading || showOtp}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="pw-reveal-btn" onClick={() => setShowPw((v) => !v)} disabled={loading || showOtp} aria-label={showPw ? "Hide password" : "Show password"}>
                <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
          </div>

          {showOtp && (
            <div className="revamp-form-group anim-in">
              <label className="revamp-form-label">{t("auth.otpLabel")}</label>
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
            <span className="login-modal-guest">{t("auth.guestsHint")}</span>
            <button type="button" className="revamp-form-link bare-btn" onClick={onPasswordReset}>
              {t("auth.forgotPassword")}
            </button>
          </div>

          <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as any} disabled={loading}>
            {loading ? t("auth.loading") : t("auth.submit")}
            {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
          </button>
        </form>

        <SocialLoginButtons onError={setError} onLoggedIn={handleSocialLoggedIn} busy={loading} />

        <div className="revamp-form-foot">
          {t("auth.noAccount")}{" "}
          <button className="revamp-form-link bare-btn" onClick={onRegister}>
            {t("auth.registerNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
