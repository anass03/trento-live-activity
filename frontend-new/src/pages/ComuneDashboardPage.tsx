import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const dtLocale = (lang: string) => (lang.startsWith("en") ? "en-GB" : "it-IT");
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getDashboardStats, getDashboardServiceRequests, getEvents, getActivities } from "../lib/api";

export function ComuneDashboardPage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
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
            type: t("comune.dashboard.typeEvent"),
            desc: t("comune.dashboard.logEvent", { title: e.title, location: e.location || "Trento" }),
            time: e.createdAt ? new Date(e.createdAt).toLocaleDateString(dtLocale(i18n.language)) : t("comune.dashboard.recent"),
          });
        });

        acts.forEach((a) => {
          logs.push({
            id: `act-${a.id}`,
            type: t("comune.dashboard.typeActivity"),
            desc: t("comune.dashboard.logActivity", { title: a.title, category: a.category }),
            time: a.createdAt ? new Date(a.createdAt).toLocaleDateString(dtLocale(i18n.language)) : t("comune.dashboard.recent"),
          });
        });

        // Add a stub POI update
        logs.push({
          id: "poi-1",
          type: t("comune.dashboard.typePoi"),
          desc: t("comune.dashboard.logPoiStub"),
          time: t("comune.dashboard.recent")
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

  // Azioni rapide filtrate sui permessi reali del backend:
  // - POI CRUD (/api/map/poi)            → authorize('AmministratoreDiSistema')
  // - Richieste enti (/api/admin/entities) → authorize('AmministratoreDiSistema')
  // - Moderazione eventi (/api/moderation/reports) → authorize('AmministratoreDiSistema')
  // - Statistiche / export (/api/dashboard/*)      → authorize('AmministratoreComunale')
  const role = user?.role;
  const quickActions = [
    { id: "comune-statistiche", label: t("comune.stats.title"), icon: "trending", accent: "var(--cyan)", roles: ["municipal_admin"] },
    { id: "comune-export", label: t("comune.export.title"), icon: "share", accent: "var(--violet)", roles: ["municipal_admin"] },
    { id: "admin-poi", label: t("comune.dashboard.managePoi"), icon: "pin", accent: "var(--cyan)", roles: ["system_admin"] },
    { id: "admin-enti-richieste", label: t("comune.dashboard.entityRequests"), icon: "shieldCheck", accent: "var(--violet)", roles: ["system_admin"] },
    { id: "admin-moderazione", label: t("comune.dashboard.moderation"), icon: "warn", accent: "var(--magenta)", roles: ["system_admin"] },
  ].filter((a) => a.roles.includes(role));

  const kpis = [
    { label: t("comune.dashboard.kpiActivities"), val: stats?.totalActivities ?? 0, icon: "activity", color: "var(--cyan)" },
    { label: t("comune.dashboard.kpiEvents"), val: stats?.totalEvents ?? 0, icon: "calendar", color: "var(--violet)" },
    { label: t("comune.dashboard.kpiPois"), val: stats?.totalPOIs ?? 0, icon: "pin", color: "var(--teal)" },
    { label: t("comune.dashboard.kpiRequests"), val: serviceStats?.total ?? 0, icon: "bell", color: "var(--magenta)" },
  ];

  if (loading) {
    return (
      <div className="revamp-legal-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("comune.dashboard.loading")}
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
            <h1>{t("comune.dashboard.title")}</h1>
            <p>{t("comune.dashboard.subtitle")}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-statistiche")}>
              <Icon name="trending" size={15} /> {t("comune.dashboard.viewStats")}
            </button>
            <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-export")}>
              <Icon name="share" size={15} /> {t("comune.dashboard.exportReport")}
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
              {t("comune.dashboard.logsTitle")} <span>{t("comune.dashboard.live")}</span>
            </h3>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("comune.dashboard.colCategory")}</th>
                    <th>{t("comune.dashboard.colDescription")}</th>
                    <th>{t("comune.dashboard.colTime")}</th>
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
            <h3>{t("comune.dashboard.quickActions")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
              {quickActions.map((a) => (
                <button key={a.id} className="revamp-form-btn" style={{ "--accent": a.accent } as React.CSSProperties} onClick={() => setPage(a.id)}>
                  <Icon name={a.icon} size={16} /> {a.label}
                </button>
              ))}
              {quickActions.length === 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                  {t("comune.dashboard.noActions")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Citizen Needs Panel */}
        {serviceStats && serviceStats.total > 0 && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "360ms" } as React.CSSProperties}>
            <h3>
              📍 {t("comune.dashboard.kpiRequests")}
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                {serviceStats.total} {t("comune.dashboard.recent").toLowerCase()}
              </span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {serviceStats.byCategory.slice(0, 6).map((row: any) => {
                const pct = Math.round((Number(row.count) / serviceStats.total) * 100);
                return (
                  <div key={row.categoria} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{row.categoria.replace(/_/g, " ")}</span>
                        <span style={{ color: "var(--text-muted)" }}>{row.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "var(--border-soft, rgba(255,255,255,0.08))" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "var(--magenta)", transition: "width 0.5s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
