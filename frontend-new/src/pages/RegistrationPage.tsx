import { useState } from "react";
import { Icon } from "../components/ui/Icon";

export function RegistrationPage({ page, setPage, user, setUser }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEntity, setIsEntity] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = (e: any) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Compila tutti i campi richiesti.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password inserite non coincidono.");
      return;
    }
    // Simulate signup success, redirecting to onboarding
    setUser({
      ...user,
      id: "u_new",
      name: name,
      email: email,
      role: isEntity ? "certified_entity" : "registered_user",
      avatar: name[0].toUpperCase(),
    });
    setPage("onboarding");
  };

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--violet)" }}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--violet)" }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8.5" cy="7" r="4" fill="none" stroke="var(--violet)" strokeWidth="2" />
              <line x1="20" y1="8" x2="20" y2="14" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
              <line x1="23" y1="11" x2="17" y2="11" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>Registrati</h2>
          <p>Crea un account per partecipare alle attività in città</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="revamp-form-group">
            <label className="revamp-form-label">Nome Completo</label>
            <div className="revamp-form-input-wrap">
              <Icon name="users" size={16} />
              <input
                type="text"
                className="revamp-form-input"
                placeholder="Mario Rossi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-group">
            <label className="revamp-form-label">Email</label>
            <div className="revamp-form-input-wrap">
              <Icon name="mail" size={16} />
              <input
                type="email"
                className="revamp-form-input"
                placeholder="nome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-group">
            <label className="revamp-form-label">Password</label>
            <div className="revamp-form-input-wrap">
              <Icon name="key" size={16} />
              <input
                type="password"
                className="revamp-form-input"
                placeholder="Minimo 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-group">
            <label className="revamp-form-label">Conferma Password</label>
            <div className="revamp-form-input-wrap">
              <Icon name="key" size={16} />
              <input
                type="password"
                className="revamp-form-input"
                placeholder="Ripeti password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-row">
            <label className="revamp-checkbox-label">
              <input
                type="checkbox"
                checked={isEntity}
                onChange={(e) => setIsEntity(e.target.checked)}
              />
              Registrati come Ente Certificato
            </label>
          </div>

          <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" }}>
            Crea account <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />
          </button>
        </form>

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
