import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function ComuneDashboardPage({ page, setPage, theme, setTheme, user }: any) {
  const kpis = [
    { label: "Attività Attive", val: "158", icon: "activity", color: "var(--cyan)" },
    { label: "Eventi Certificati", val: "42", icon: "calendar", color: "var(--violet)" },
    { label: "Punti di Interesse", val: "18", icon: "pin", color: "var(--teal)" },
    { label: "Richieste Ricevute", val: "9", icon: "bell", color: "var(--magenta)" },
  ];

  const recentLogs = [
    { id: "1", type: "POI", desc: "Aggiornamento affollamento Piazza Duomo a 'Medio'", time: "10 minuti fa" },
    { id: "2", type: "Ente", desc: "Richiesta validazione Ente 'Associazione Outdoor'", time: "30 minuti fa" },
    { id: "3", type: "Evento", desc: "Inserito nuovo evento 'Visita guidata al Castello'", time: "1 ora fa" },
    { id: "4", type: "Segnalazione", desc: "Segnalato post 'DJ Set al Muse' per disturbo", time: "2 ore fa" },
  ];

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-comune-layout">
        <div className="revamp-comune-head">
          <div>
            <h1>Dashboard Comunale</h1>
            <p>Pannello di controllo per la gestione amministrativa del territorio e dei flussi cittadini</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-statistiche")}>
              <Icon name="trending" size={15} /> Vedi Statistiche
            </button>
            <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-export")}>
              <Icon name="share" size={15} /> Esporta Report
            </button>
          </div>
        </div>

        <div className="revamp-kpi-grid">
          {kpis.map((k, i) => (
            <div key={i} className="revamp-kpi-card anim-in" style={{ "--accent": k.color, animationDelay: `${i * 60}ms` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="revamp-kpi-lbl">{k.label}</span>
                <Icon name={k.icon} size={16} style={{ color: k.color }} />
              </div>
              <strong className="revamp-kpi-val">{k.val}</strong>
            </div>
          ))}
        </div>

        <div className="revamp-charts-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* Main Logs Table */}
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "240ms" }}>
            <h3>
              Registri e Segnalazioni Recenti <span>Live</span>
            </h3>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrizione Log</th>
                    <th>Orario</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className={"revamp-status-pill " + (log.type === "Segnalazione" ? "danger" : log.type === "Ente" ? "warning" : "info")}>
                          {log.type}
                        </span>
                      </td>
                      <td>{log.desc}</td>
                      <td>{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "300ms" }}>
            <h3>Azioni Rapide</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
              <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }} onClick={() => setPage("admin-poi")}>
                <Icon name="pin" size={16} /> Gestione POI
              </button>
              <button className="revamp-form-btn" style={{ "--accent": "var(--violet)" }} onClick={() => setPage("admin-enti-richieste")}>
                <Icon name="shieldCheck" size={16} /> Richieste Enti
              </button>
              <button className="revamp-form-btn" style={{ "--accent": "var(--magenta)" }} onClick={() => setPage("admin-moderazione")}>
                <Icon name="warn" size={16} /> Moderazione Contenuti
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
