import { useState } from "react";
import { Icon } from "../components/ui/Icon";
import { register, registerEntity } from "../lib/api";

export function RegistrationPage({ page, setPage }: any) {
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
      setError("Inserisci i dati obbligatori (Email e Password).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password inserite non coincidono.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (!acceptConsents) {
      setError("Devi accettare la Privacy Policy e i Termini di Servizio.");
      return;
    }

    setLoading(true);
    try {
      if (isEntity) {
        if (!nomeEnte || !pec) {
          setError("Inserisci il nome dell'ente e la PEC.");
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
        setSuccessMsg("Richiesta di registrazione inviata! Il Comune deve approvare la tua richiesta.");
      } else {
        if (!nome || !cognome || !codiceFiscale) {
          setError("Inserisci nome, cognome e codice fiscale.");
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
      setError(err.message || "Errore durante la registrazione.");
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
          <h2>Registrati</h2>
          <p>Crea un account per accedere a Trento Live Activity</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="revamp-status-pill success" style={{ width: "100%", marginBottom: 16, justifyContent: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Icon name="check" size={12} /> {successMsg}</div>
            <button className="revamp-form-link" style={{ background: "none", border: "none", color: "white", textDecoration: "underline" }} onClick={() => setPage("login")}>Torna al Login</button>
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
                Registrati come Ente Certificato
              </label>
            </div>

            {isEntity ? (
              <>
                <div className="revamp-form-group">
                  <label className="revamp-form-label">Nome Ente</label>
                  <div className="revamp-form-input-wrap">
                    <Icon name="users" size={16} />
                    <input
                      type="text"
                      className="revamp-form-input"
                      placeholder="Associazione Outdoor Trento"
                      value={nomeEnte}
                      onChange={(e) => setNomeEnte(e.target.value)}
                    />
                  </div>
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">PEC (Posta Elettronica Certificata)</label>
                  <div className="revamp-form-input-wrap">
                    <Icon name="mail" size={16} />
                    <input
                      type="email"
                      className="revamp-form-input"
                      placeholder="ente@pec.it"
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
                    <label className="revamp-form-label">Nome</label>
                    <div className="revamp-form-input-wrap">
                      <input
                        type="text"
                        className="revamp-form-input"
                        placeholder="Mario"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="revamp-form-group" style={{ flex: 1 }}>
                    <label className="revamp-form-label">Cognome</label>
                    <div className="revamp-form-input-wrap">
                      <input
                        type="text"
                        className="revamp-form-input"
                        placeholder="Rossi"
                        value={cognome}
                        onChange={(e) => setCognome(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">Codice Fiscale</label>
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
                  <label className="revamp-form-label">Data di Nascita</label>
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
              <label className="revamp-form-label">Email dell'account</label>
              <div className="revamp-form-input-wrap">
                <Icon name="mail" size={16} />
                <input
                  type="email"
                  className="revamp-form-input"
                  placeholder="mario.rossi@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div className="revamp-form-group" style={{ flex: 1 }}>
                <label className="revamp-form-label">Password</label>
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
              </div>

              <div className="revamp-form-group" style={{ flex: 1 }}>
                <label className="revamp-form-label">Conferma</label>
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
            </div>

            <div className="revamp-form-row" style={{ marginTop: 14, marginBottom: 18 }}>
              <label className="revamp-checkbox-label" style={{ fontSize: 12.5 }}>
                <input
                  type="checkbox"
                  checked={acceptConsents}
                  onChange={(e) => setAcceptConsents(e.target.checked)}
                />
                Accetto la <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("privacy")}>Privacy Policy</button> e i <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("termini")}>Termini di Servizio</button>
              </label>
            </div>

            <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" } as React.CSSProperties} disabled={loading}>
              {loading ? "Registrazione in corso..." : "Crea account"}{" "}
              {!loading && <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />}
            </button>
          </form>
        )}

        <div className="revamp-form-foot">
          Hai già un account?{" "}
          <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("login")}>
            Accedi
          </button>
        </div>
      </div>
    </div>
  );
}
