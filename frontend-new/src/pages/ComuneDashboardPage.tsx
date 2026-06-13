import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const dtLocale = (lang: string) => (lang.startsWith("en") ? "en-GB" : "it-IT");
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import {
  getDashboardStats,
  getDashboardServiceRequests,
  getDashboardRecentServiceRequests,
  getEvents,
  getActivities,
} from "../lib/api";

type DrillDown = null | "activities" | "events" | "requests";

function pill(type: string) {
  if (type === "Richiesta" || type === "Report") return "danger";
  if (type === "Evento" || type === "Event") return "warning";
  if (type === "Attività" || type === "Activity") return "success";
  return "info";
}

export function ComuneDashboardPage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [serviceStats, setServiceStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardStats, reqStats, evs, acts, reqs] = await Promise.all([
          getDashboardStats(),
          getDashboardServiceRequests(),
          getEvents({ limit: 12 }),
          getActivities({ limit: 12 }),
          getDashboardRecentServiceRequests(12).catch(() => [] as any[]),
        ]);

        setStats(dashboardStats);
        setServiceStats(reqStats);
        setAllEvents(evs);
        setAllActivities(acts);
        setRecentRequests(reqs);

        const locale = dtLocale(i18n.language);
        const logs: any[] = [];

        reqs.slice(0, 4).forEach((r: any) => {
          const cat = r.categoria.replace(/_/g, " ");
          const sub = r.sottocategoria ? ` › ${r.sottocategoria.replace(/_/g, " ")}` : "";
          logs.push({
            id: `sr-${r.id}`,
            type: t("comune.dashboard.typeReport"),
            desc: t("comune.dashboard.logRequest", { category: cat + sub }),
            time: r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : "—",
          });
        });

        evs.slice(0, 3).forEach((e: any) => {
          logs.push({
            id: `ev-${e.id}`,
            type: t("comune.dashboard.typeEvent"),
            desc: t("comune.dashboard.logEvent", { title: e.title, location: e.location || "Trento" }),
            time: e.createdAt ? new Date(e.createdAt).toLocaleDateString(locale) : t("comune.dashboard.recent"),
          });
        });

        acts.slice(0, 3).forEach((a: any) => {
          logs.push({
            id: `act-${a.id}`,
            type: t("comune.dashboard.typeActivity"),
            desc: t("comune.dashboard.logActivity", { title: a.title, category: a.category }),
            time: a.createdAt ? new Date(a.createdAt).toLocaleDateString(locale) : t("comune.dashboard.recent"),
          });
        });

        setRecentLogs(logs.slice(0, 10));
      } catch (err) {
        console.error("Failed to load Comune dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const kpis = [
    { label: t("comune.dashboard.kpiActivities"), val: stats?.totalActivities ?? 0, icon: "activity", color: "var(--cyan)", drill: "activities" as DrillDown },
    { label: t("comune.dashboard.kpiEvents"), val: stats?.totalEvents ?? 0, icon: "calendar", color: "var(--violet)", drill: "events" as DrillDown },
    { label: t("comune.dashboard.kpiPois"), val: stats?.totalPOIs ?? 0, icon: "pin", color: "var(--teal)", drill: null, navPage: "admin-poi" },
    { label: t("comune.dashboard.kpiRequests"), val: serviceStats?.total ?? 0, icon: "bell", color: "var(--magenta)", drill: "requests" as DrillDown },
  ];

  const locale = dtLocale(i18n.language);

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

        {/* Header */}
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

        {/* KPI grid — cards are clickable */}
        <div className="revamp-kpi-grid">
          {kpis.map((k, i) => (
            <div
              key={i}
              className="revamp-kpi-card anim-in"
              style={{
                "--accent": k.color,
                animationDelay: `${i * 60}ms`,
                cursor: "pointer",
                transition: "transform 120ms, box-shadow 120ms",
              } as React.CSSProperties}
              onClick={() => {
                if ((k as any).navPage) { setPage((k as any).navPage); return; }
                setDrillDown(drillDown === k.drill ? null : k.drill);
              }}
              title={t("comune.dashboard.clickToExpand")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="revamp-kpi-lbl">{k.label}</span>
                <Icon name={k.icon} size={16} style={{ color: k.color }} />
              </div>
              <strong className="revamp-kpi-val">{k.val}</strong>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2 }}>
                {(k as any).navPage ? t("comune.dashboard.clickToManage") : t("comune.dashboard.clickToExpand")}
              </div>
            </div>
          ))}
        </div>

        {/* Drill-down panel */}
        {drillDown === "activities" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)" } as React.CSSProperties}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t("comune.dashboard.kpiActivities")}</h3>
              <button className="detail-modal-close bare-btn" onClick={() => setDrillDown(null)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("comune.dashboard.colTitle")}</th>
                    <th>{t("comune.dashboard.colCategory")}</th>
                    <th>{t("comune.dashboard.colParticipants")}</th>
                    <th>{t("comune.dashboard.colDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allActivities.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>—</td></tr>
                  )}
                  {allActivities.map((a: any) => (
                    <tr key={a.id}>
                      <td><b>{a.title}</b></td>
                      <td><span className="revamp-status-pill success">{a.category}</span></td>
                      <td>{a.participantCount ?? 0} / {a.maxParticipants ?? "∞"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString(locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {drillDown === "events" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)" } as React.CSSProperties}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t("comune.dashboard.kpiEvents")}</h3>
              <button className="detail-modal-close bare-btn" onClick={() => setDrillDown(null)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("comune.dashboard.colTitle")}</th>
                    <th>{t("comune.dashboard.colCategory")}</th>
                    <th>{t("comune.dashboard.colLocation")}</th>
                    <th>{t("comune.dashboard.colDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allEvents.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>—</td></tr>
                  )}
                  {allEvents.map((e: any) => (
                    <tr key={e.id}>
                      <td><b>{e.title}</b></td>
                      <td><span className="revamp-status-pill warning">{e.category}</span></td>
                      <td style={{ fontSize: 12 }}>{e.location || "Trento"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {e.dateTime ? new Date(e.dateTime).toLocaleDateString(locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {drillDown === "requests" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)" } as React.CSSProperties}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t("comune.dashboard.kpiRequests")}</h3>
              <button className="detail-modal-close bare-btn" onClick={() => setDrillDown(null)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>{t("comune.dashboard.colCategory")}</th>
                    <th>{t("comune.dashboard.colSubcategory")}</th>
                    <th>{t("comune.dashboard.colDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>—</td></tr>
                  )}
                  {recentRequests.map((r: any) => (
                    <tr key={r.id}>
                      <td><span className="revamp-status-pill danger">{r.categoria.replace(/_/g, " ")}</span></td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {r.sottocategoria ? r.sottocategoria.replace(/_/g, " ") : <em style={{ color: "var(--text-faint)" }}>—</em>}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs table — Registri e Segnalazioni */}
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
                  <th>{t("comune.dashboard.colDate")}</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>—</td></tr>
                )}
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`revamp-status-pill ${pill(log.type)}`}>{log.type}</span>
                    </td>
                    <td>{log.desc}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Citizen needs breakdown with subcategories */}
        {serviceStats && serviceStats.total > 0 && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "300ms" } as React.CSSProperties}>
            <h3>
              📍 {t("comune.dashboard.kpiRequests")}
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                {serviceStats.total} {t("comune.dashboard.totalLabel")}
              </span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
              {serviceStats.byCategory.map((row: any) => {
                const pct = Math.round((Number(row.count) / serviceStats.total) * 100);
                const subcats = (serviceStats.bySubcategory ?? []).filter((s: any) => s.categoria === row.categoria);
                return (
                  <div key={row.categoria}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                          <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{row.categoria.replace(/_/g, " ")}</span>
                          <span style={{ color: "var(--text-muted)" }}>{row.count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: "var(--border-soft)" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "var(--magenta)", transition: "width 0.6s cubic-bezier(.2,.8,.3,1)" }} />
                        </div>
                      </div>
                    </div>
                    {subcats.length > 0 && (
                      <div style={{ marginTop: 6, paddingLeft: 2, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {subcats.map((s: any) => (
                          <span key={s.sottocategoria} style={{
                            fontSize: 10.5,
                            background: "color-mix(in srgb, var(--magenta) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--magenta) 28%, transparent)",
                            borderRadius: 6,
                            padding: "2px 8px",
                            color: "color-mix(in srgb, var(--magenta) 85%, var(--text-primary))",
                            fontWeight: 500,
                          }}>
                            {s.sottocategoria.replace(/_/g, " ")} <b>({s.count})</b>
                          </span>
                        ))}
                      </div>
                    )}
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
