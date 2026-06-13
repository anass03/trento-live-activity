import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../components/ui/Icon";
import { PasswordStrengthBar } from "../components/ui/PasswordStrengthBar";
import { register, registerEntity } from "../lib/api";

export function RegistrationPage({ page, setPage }: any) {
  const { t } = useTranslation();
  const [isEntity, setIsEntity] = useState(false);
  
  // standard user fields
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataNascita, setDataNascita] = useState("2000-01-01");
  const [codiceFiscale, setCodiceFiscale] = useState("");

  // entity fields
  const [nomeEnte, setNomeEnte] = useState("");
  const [pec, setPec] = useState("");

  // shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptConsents, setAcceptConsents] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !password || !confirmPassword) {
      setError(t("register.errors.missingRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("register.errors.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.errors.passwordLength"));
      return;
    }
    if (!acceptConsents) {
      setError(t("register.errors.consentsRequired"));
      return;
    }

    setLoading(true);
    try {
      if (isEntity) {
        if (!nomeEnte || !pec) {
          setError(t("register.errors.missingEntityFields"));
          setLoading(false);
          return;
        }
        await registerEntity({
          email,
          password,
          nomeEnte,
          pec,
          consents: {
            privacy_policy: true,
            terms_of_service: true,
            marketing: false,
            analytics: false,
          }
        });
        setSuccessMsg(t("register.entitySuccess"));
      } else {
        if (!nome || !cognome || !codiceFiscale) {
          setError(t("register.errors.missingCitizenFields"));
          setLoading(false);
          return;
        }
        const res = await register({
          email,
          password,
          nome,
          cognome,
          dataNascita,
          codiceFiscale,
          consents: {
            privacy_policy: true,
            terms_of_service: true,
            marketing: false,
            analytics: false,
          }
        });
        if ('emailVerificationRequired' in res && res.emailVerificationRequired) {
          setPage("verifica-email");
        } else {
          setPage("onboarding");
        }
      }
    } catch (err: any) {
      setError(err.message || t("register.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-auth-scene" style={{ overflowY: "auto", padding: "40px 0" }}>
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--violet)", maxWidth: "480px" } as React.CSSProperties}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--violet)" } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8.5" cy="7" r="4" fill="none" stroke="var(--violet)" strokeWidth="2" />
              <line x1="20" y1="8" x2="20" y2="14" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
              <line x1="23" y1="11" x2="17" y2="11" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>{t("register.title")}</h2>
          <p>{t("register.subtitle")}</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="revamp-status-pill success" style={{ width: "100%", marginBottom: 16, justifyContent: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Icon name="check" size={12} /> {successMsg}</div>
            <button className="revamp-form-link" style={{ background: "none", border: "none", color: "white", textDecoration: "underline" }} onClick={() => setPage("login")}>{t("register.backToLogin")}</button>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleRegister}>
            <div className="revamp-form-row" style={{ marginBottom: 18 }}>
              <label className="revamp-checkbox-label" style={{ fontSize: 13, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={isEntity}
                  onChange={(e) => {
                    setIsEntity(e.target.checked);
                    setError("");
                  }}
                />
                {t("register.asEntity")}
              </label>
            </div>

            {isEntity ? (
              <>
                <div className="revamp-form-group">
                  <label className="revamp-form-label">{t("register.entityName")}</label>
                  <div className="revamp-form-input-wrap">
                    <Icon name="users" size={16} />
                    <input
                      type="text"
                      className="revamp-form-input"
                      placeholder={t("register.entityNamePlaceholder")}
                      value={nomeEnte}
                      onChange={(e) => setNomeEnte(e.target.value)}
                    />
                  </div>
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">{t("register.pec")}</label>
                  <div className="revamp-form-input-wrap">
                    <Icon name="mail" size={16} />
                    <input
                      type="email"
                      className="revamp-form-input"
                      placeholder={t("register.pecPlaceholder")}
                      value={pec}
                      onChange={(e) => setPec(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div className="revamp-form-group" style={{ flex: 1 }}>
                    <label className="revamp-form-label">{t("register.firstName")}</label>
                    <div className="revamp-form-input-wrap">
                      <input
                        type="text"
                        className="revamp-form-input"
                        placeholder={t("register.firstNamePlaceholder")}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="revamp-form-group" style={{ flex: 1 }}>
                    <label className="revamp-form-label">{t("register.lastName")}</label>
                    <div className="revamp-form-input-wrap">
                      <input
                        type="text"
                        className="revamp-form-input"
                        placeholder={t("register.lastNamePlaceholder")}
                        value={cognome}
                        onChange={(e) => setCognome(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">{t("register.fiscalCode")}</label>
                  <div className="revamp-form-input-wrap">
                    <Icon name="shieldCheck" size={16} />
                    <input
                      type="text"
                      className="revamp-form-input"
                      placeholder="RSSMRA80A01L378H"
                      value={codiceFiscale}
                      onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">{t("register.birthDate")}</label>
                  <div className="revamp-form-input-wrap">
                    <input
                      type="date"
                      className="revamp-form-input"
                      value={dataNascita}
                      onChange={(e) => setDataNascita(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="revamp-form-group">
              <label className="revamp-form-label">{t("register.accountEmail")}</label>
              <div className="revamp-form-input-wrap">
                <Icon name="mail" size={16} />
                <input
                  type="email"
                  className="revamp-form-input"
                  placeholder={t("register.accountEmailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="revamp-form-group">
              <label className="revamp-form-label">{t("register.password")}</label>
              <div className="revamp-form-input-wrap">
                <Icon name="key" size={16} />
                <input
                  type="password"
                  className="revamp-form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <PasswordStrengthBar password={password} />
            </div>

            <div className="revamp-form-group">
              <label className="revamp-form-label">{t("register.confirmPassword")}</label>
              <div className="revamp-form-input-wrap">
                <input
                  type="password"
                  className="revamp-form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="revamp-form-row" style={{ marginTop: 14, marginBottom: 18 }}>
              <label className="revamp-checkbox-label" style={{ fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={acceptConsents}
                  onChange={(e) => setAcceptConsents(e.target.checked)}
                />
                {t("register.acceptThe")} <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("privacy")}>{t("register.privacyPolicy")}</button> {t("register.andThe")} <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("termini")}>{t("register.terms")}</button>
              </label>
            </div>

            <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" } as React.CSSProperties} disabled={loading}>
              {loading ? t("register.submitting") : t("register.submit")}{" "}
              {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
            </button>
          </form>
        )}

        <div className="revamp-form-foot">
          {t("register.haveAccount")}{" "}
          <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("login")}>
            {t("register.login")}
          </button>
        </div>
      </div>
    </div>
  );
}
