import { Icon } from "../components/ui/Icon";
import { Header } from "../components/layout/Header";

export function PlaceholderPage({ page, setPage, theme, setTheme, user }: any) {
  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <div className="revamp-form-card" style={{ textAlign: "center" }}>
          <div className="revamp-form-logo" style={{ "--accent": "var(--cyan)" }}>
            <Icon name="sparkle" size={26} style={{ color: "var(--cyan)" }} />
          </div>
          <h2>Pagina in Arrivo</h2>
          <p style={{ marginTop: 8 }}>Questa sezione del portale Trento Live Activity è attualmente in fase di implementazione.</p>
          <button className="revamp-form-btn" style={{ marginTop: 20, "--accent": "var(--cyan)" }} onClick={() => setPage("home")}>
            Torna alla Home
          </button>
        </div>
      </div>
    </div>
  );
}
