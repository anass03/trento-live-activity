import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getDashboardStats, getDashboardServiceRequests, getEvents, getActivities } from "../lib/api";

export function ComuneDashboardPage({ page, setPage, theme, setTheme, user }: any) {
  const [stats, setStats] = useState<any>(null);
  const [serviceStats, setServiceStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);
        const reqStats = await getDashboardServiceRequests();
        setServiceStats(reqStats);

        // Fetch recent items to generate a live log feed
        const [evs, acts] = await Promise.all([
          getEvents({ limit: 3 }),
          getActivities({ limit: 3 })
        ]);

        const logs: any[] = [];
        evs.forEach((e) => {
          logs.push({
            id: `ev-${e.id}`,
            type: "Evento",
            desc: `Inserito nuovo evento '${e.title}' presso ${e.location || 'Trento'}`,
            time: e.createdAt ? new Date(e.createdAt).toLocaleDateString("it-IT") : "Recent",
          });
        });

        acts.forEach((a) => {
          logs.push({
            id: `act-${a.id}`,
            type: "Attività",
            desc: `Creata attività spontanea '${a.title}' di tipo ${a.category}`,
            time: a.createdAt ? new Date(a.createdAt).toLocaleDateString("it-IT") : "Recent",
          });
        });

        // Add a stub POI update
        logs.push({
          id: "poi-1",
          type: "POI",
          desc: "Aggiornamento affollamento Piazza Duomo a 'giallo'",
          time: "Recent"
        });

        setRecentLogs(logs.slice(0, 5));
      } catch (err) {
        console.error("Failed to load Comune dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const kpis = [
    { label: "Attività Attive", val: stats?.totalActivities ?? 0, icon: "activity", color: "var(--cyan)" },
    { label: "Eventi Certificati", val: stats?.totalEvents ?? 0, icon: "calendar", color: "var(--violet)" },
    { label: "Punti di Interesse", val: stats?.totalPOIs ?? 0, icon: "pin", color: "var(--teal)" },
    { label: "Richieste Cittadini", val: serviceStats?.total ?? 0, icon: "bell", color: "var(--magenta)" },
  ];

  if (loading) {
    return (
      <div className="revamp-legal-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento dati dashboard comunale...
        </div>
      </div>
    );
  }

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
            <div key={i} className="revamp-kpi-card anim-in" style={{ "--accent": k.color, animationDelay: `${i * 60}ms` } as React.CSSProperties}>
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
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "240ms" } as React.CSSProperties}>
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
                        <span className={"revamp-status-pill " + (log.type === "Segnalazione" ? "danger" : log.type === "Attività" ? "success" : log.type === "Evento" ? "warning" : "info")}>
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
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "300ms" } as React.CSSProperties}>
            <h3>Azioni Rapide</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
              <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("admin-poi")}>
                <Icon name="pin" size={16} /> Gestione POI
              </button>
              <button className="revamp-form-btn" style={{ "--accent": "var(--violet)" } as React.CSSProperties} onClick={() => setPage("admin-enti-richieste")}>
                <Icon name="shieldCheck" size={16} /> Richieste Enti
              </button>
              <button className="revamp-form-btn" style={{ "--accent": "var(--magenta)" } as React.CSSProperties} onClick={() => setPage("admin-moderazione")}>
                <Icon name="warn" size={16} /> Moderazione Contenuti
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
