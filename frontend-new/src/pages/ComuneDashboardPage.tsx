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

function srCatPill(cat: string): string {
  switch (cat) {
    case "parcheggio_auto": return "warning";
    case "parcheggio_bici": return "success";
    case "sport":           return "info";
    case "studio":          return "info";
    case "verde":           return "success";
    case "cultura":         return "warning";
    case "ciclismo":        return "success";
    default:                return "danger";
  }
}

export function ComuneDashboardPage({ page, setPage, theme, setTheme, user, onShowOnMap }: any) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [serviceStats, setServiceStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<DrillDown>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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
                    <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setSelectedRequest(r)} title={t("comune.dashboard.clickToView")}>
                      <td><span className={`revamp-status-pill ${srCatPill(r.categoria)}`}>{t(`serviceRequest.categories.${r.categoria}`, { defaultValue: r.categoria.replace(/_/g, " ") })}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {r.sottocategoria
                          ? <span className="revamp-status-pill info">{t(`serviceRequest.subcategories.${r.sottocategoria}`, { defaultValue: r.sottocategoria.replace(/_/g, " ") })}</span>
                          : <em style={{ color: "var(--text-faint)" }}>—</em>}
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
                {recentLogs.map((log) => {
                  const isReq = log.id.startsWith("sr-");
                  const reqData = isReq ? recentRequests.find((r: any) => `sr-${r.id}` === log.id) : null;
                  return (
                    <tr key={log.id}
                      style={isReq ? { cursor: "pointer" } : undefined}
                      onClick={isReq && reqData ? () => setSelectedRequest(reqData) : undefined}
                      title={isReq ? t("comune.dashboard.clickToView") : undefined}
                    >
                      <td>
                        <span className={`revamp-status-pill ${pill(log.type)}`}>{log.type}</span>
                      </td>
                      <td>{log.desc}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{log.time}</td>
                    </tr>
                  );
                })}
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
                          <span style={{ fontWeight: 600 }}>{t(`serviceRequest.categories.${row.categoria}`, { defaultValue: row.categoria.replace(/_/g, " ") })}</span>
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
                            {t(`serviceRequest.subcategories.${s.sottocategoria}`, { defaultValue: s.sottocategoria.replace(/_/g, " ") })} <b>({s.count})</b>
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

      {/* Request detail modal */}
      {selectedRequest && (
        <div className="login-modal-scrim" onMouseDown={() => setSelectedRequest(null)} style={{ zIndex: 200 }}>
          <div className="login-modal" style={{ width: "min(500px, 96%)", padding: "28px 30px" }}
            onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="detail-modal-close login-modal-x" onClick={() => setSelectedRequest(null)} aria-label={t("widgets.popup.close")}>
              <Icon name="x" size={17} />
            </button>

            {/* Header pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span className={`revamp-status-pill ${srCatPill(selectedRequest.categoria)}`} style={{ fontSize: 12 }}>
                {t(`serviceRequest.categories.${selectedRequest.categoria}`, { defaultValue: selectedRequest.categoria.replace(/_/g, " ") })}
              </span>
              {selectedRequest.sottocategoria && (
                <span className="revamp-status-pill info" style={{ fontSize: 12 }}>
                  {t(`serviceRequest.subcategories.${selectedRequest.sottocategoria}`, { defaultValue: selectedRequest.sottocategoria.replace(/_/g, " ") })}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Date */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5 }}>
                <Icon name="calendar" size={15} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 11.5, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("comune.dashboard.colDate")}</div>
                  <div>{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString(locale) : "—"}</div>
                </div>
              </div>

              {/* Location */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5 }}>
                <Icon name="pin" size={15} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("comune.dashboard.colPosition")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1 }}>
                      {selectedRequest.indirizzo ?? <em style={{ color: "var(--text-faint)" }}>{t("comune.dashboard.noPosition")}</em>}
                    </span>
                    {selectedRequest.latitudine != null && selectedRequest.longitudine != null && onShowOnMap && (
                      <button
                        className="revamp-action-btn"
                        style={{ flexShrink: 0, padding: "5px 10px", fontSize: 12, height: "auto" }}
                        onClick={() => {
                          setSelectedRequest(null);
                          onShowOnMap(selectedRequest.latitudine, selectedRequest.longitudine);
                        }}
                      >
                        <Icon name="map" size={13} /> {t("comune.dashboard.showOnMap")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
