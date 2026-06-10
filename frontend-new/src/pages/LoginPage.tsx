import { useState } from "react";
import { Icon } from "../components/ui/Icon";

export function LoginPage({ page, setPage, user, setUser }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Inserisci sia l'email che la password.");
      return;
    }
    // Simulate successful login
    setUser({
      ...user,
      id: "u1",
      name: email.split("@")[0],
      email: email,
      role: "registered_user", // default role on normal login
      avatar: email[0].toUpperCase(),
    });
    setPage("home");
  };

  return (
    <div className="revamp-auth-scene">
      <div className="revamp-form-card anim-in" style={{ "--accent": "var(--cyan)" }}>
        <div className="revamp-form-head">
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" }}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 17l5-5-5-5" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H3" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2>Accedi</h2>
          <p>Inserisci le tue credenziali per accedere a Trento Live Activity</p>
        </div>

        {error && (
          <div className="revamp-status-pill danger" style={{ width: "100%", marginBottom: 16, justifyContent: "center" }}>
            <Icon name="warn" size={12} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="revamp-form-row">
            <label className="revamp-checkbox-label">
              <input type="checkbox" /> Ricordami
            </label>
            <button type="button" className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("password-reset")}>
              Password dimenticata?
            </button>
          </div>

          <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }}>
            Accedi <Icon name="arrow" size={16} style={{ transform: "rotate(-45deg)" }} />
          </button>
        </form>

        <div className="revamp-form-foot">
          Non hai un account?{" "}
          <button className="revamp-form-link" style={{ background: "none", border: "none", padding: 0 }} onClick={() => setPage("registrazione")}>
            Registrati ora
          </button>
        </div>
      </div>
    </div>
  );
}
