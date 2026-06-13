import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getDashboardStats, getDashboardServiceRequests } from "../lib/api";

type Tab = "overview" | "trends" | "supply";

const CROWDING_COLOR: Record<string, string> = {
  verde: "var(--green)",
  giallo: "var(--amber)",
  arancione: "var(--amber)",
  rosso: "var(--red)",
};
const CROWDING_LABEL: Record<string, string> = {
  verde: "Basso",
  giallo: "Medio",
  arancione: "Medio-alto",
  rosso: "Alto",
};

export function ComuneStatistichePage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [serviceStats, setServiceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getDashboardServiceRequests().catch(() => null),
    ])
      .then(([s, sr]) => { setStats(s); setServiceStats(sr); })
      .catch((err) => console.error("Failed to load stats:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── Sparkline ──────────────────────────────────────────────────────
  const sparklineData = stats?.activitiesByDay?.length > 0
    ? stats.activitiesByDay.map((d: any) => Number(d.count))
    : [12, 18, 15, 22, 28, 20, 24, 30, 35, 42, 38, 45, 55, 48];
  const sparklineLabels: string[] = stats?.activitiesByDay?.map((d: any) =>
    new Date(d.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
  ) ?? [];

  const W = 580; const H = 130; const PAD_X = 32; const PAD_Y = 20;
  const maxVal = Math.max(...sparklineData, 1);
  const pts = sparklineData.map((v: number, i: number) => {
    const fraction = sparklineData.length > 1 ? i / (sparklineData.length - 1) : 0.5;
    const x = PAD_X + fraction * (W - PAD_X - 10);
    const y = H - PAD_Y - (v / maxVal) * (H - PAD_Y * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPath = `M ${pts.split(" ")[0]} L ${pts} L ${(PAD_X + (W - PAD_X - 10)).toFixed(1)},${(H - PAD_Y).toFixed(1)} L ${PAD_X},${(H - PAD_Y).toFixed(1)} Z`;

  // ── Peak hours ─────────────────────────────────────────────────────
  const peakHours: Array<{ hour: string; count: number }> = stats?.activitiesByHour?.map((h: any) => ({
    hour: `${String(h.hour).padStart(2, "0")}:00`,
    count: Number(h.count),
  })) ?? [
    { hour: "08:00", count: 18 }, { hour: "12:00", count: 42 },
    { hour: "14:00", count: 33 }, { hour: "16:00", count: 28 },
    { hour: "18:00", count: 68 }, { hour: "20:00", count: 54 },
  ];
  const maxHourCount = Math.max(...peakHours.map((ph) => ph.count), 1);

  // ── Activity types (trends) ────────────────────────────────────────
  const actByType: Array<{ tipo: string; count: number }> = (stats?.activitiesByType ?? [])
    .map((r: any) => ({ tipo: r.tipo ?? "altro", count: Number(r.count) }))
    .sort((a: any, b: any) => b.count - a.count);
  const maxActCount = Math.max(...actByType.map((r) => r.count), 1);

  // ── Event categories ───────────────────────────────────────────────
  const evByCat: Array<{ categoria: string; count: number }> = (stats?.eventsByCategory ?? [])
    .map((r: any) => ({ categoria: r.categoria ?? "altro", count: Number(r.count) }))
    .sort((a: any, b: any) => b.count - a.count);
  const maxEvCount = Math.max(...evByCat.map((r) => r.count), 1);

  // ── POI crowding ───────────────────────────────────────────────────
  const poiCrowding: Array<{ stato: string; count: number }> = (stats?.poiCrowding ?? [])
    .map((r: any) => ({ stato: r.statoAffollamento ?? "verde", count: Number(r.count) }));
  const totalPoi = poiCrowding.reduce((s, r) => s + r.count, 0) || 1;
  const topPOIs: any[] = stats?.topCrowdedPOIs ?? [];

  // ── Supply/demand ──────────────────────────────────────────────────
  const supplyRows = (stats?.activitiesByType ?? []).map((act: any) => {
    const poi = (stats?.poiByType ?? []).find((p: any) => p.tipo === act.tipo);
    const supply = poi ? Number(poi.count) : 0;
    const demand = Number(act.count);
    const ratio = supply > 0 ? Number((demand / supply).toFixed(1)) : demand;
    const status = ratio > 2.5 ? "Critical" : ratio > 1.2 ? "Warning" : "Regular";
    const color = ratio > 2.5 ? "var(--red)" : ratio > 1.2 ? "var(--amber)" : "var(--green)";
    return { cat: act.tipo || t("comune.stats.otherCategory"), demand, supply, ratio, status, color };
  });
  const finalSupplyRows = supplyRows.length > 0 ? supplyRows : [
    { cat: "Cultura", demand: 45, supply: 12, ratio: 3.7, status: "Critical", color: "var(--red)" },
    { cat: "Musica", demand: 86, supply: 28, ratio: 3.1, status: "Critical", color: "var(--red)" },
    { cat: "Outdoor", demand: 24, supply: 15, ratio: 1.6, status: "Warning", color: "var(--amber)" },
    { cat: "Cibo", demand: 18, supply: 20, ratio: 0.9, status: "Regular", color: "var(--green)" },
  ];

  const criticalCount = finalSupplyRows.filter((r) => r.status === "Critical").length;
  const warningCount = finalSupplyRows.filter((r) => r.status === "Warning").length;

  // ── Trend: week-over-week ─────────────────────────────────────────
  const week1 = sparklineData.slice(0, 7).reduce((s: number, v: number) => s + v, 0);
  const week2 = sparklineData.slice(7, 14).reduce((s: number, v: number) => s + v, 0);
  const weekChange = week1 > 0 ? Math.round(((week2 - week1) / week1) * 100) : 0;
  const avgPerDay = sparklineData.length > 0
    ? (sparklineData.reduce((s: number, v: number) => s + v, 0) / sparklineData.length).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="revamp-legal-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("comune.stats.loading")}
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
            <h1>{t("comune.stats.title")}</h1>
            <p>{t("comune.stats.subtitle")}</p>
          </div>
          <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-dashboard")}>
            <Icon name="home" size={15} /> {t("comune.stats.back")}
          </button>
        </div>

        {/* Tab switcher */}
        <div className="revamp-profile-nav" style={{ marginBottom: 20 }}>
          {(["overview", "trends", "supply"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={"revamp-profile-tab" + (activeTab === tab ? " active" : "")}
              onClick={() => setActiveTab(tab)}
            >
              {t(`comune.stats.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            {/* Sparkline + Peak hours */}
            <div className="revamp-charts-grid">
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "60ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.dailyTitle")} <span>{t("comune.stats.dailyBadge")}</span></h3>
                <div className="revamp-chart-body">
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, overflow: "visible" }}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[0, Math.round(maxVal / 2), maxVal].map((gridVal, i) => {
                      const y = H - PAD_Y - (gridVal / maxVal) * (H - PAD_Y * 2);
                      return (
                        <g key={`grid-${i}`}>
                          <line x1={PAD_X} y1={y} x2={W - 10} y2={y} stroke="var(--border-soft-2)" strokeDasharray="4 4" />
                          <text x={PAD_X - 6} y={y + 4} fill="var(--text-secondary)" fontSize="10" textAnchor="end" fontWeight="500">{gridVal}</text>
                        </g>
                      );
                    })}
                    <path d={areaPath} fill="url(#sparkGrad)" />
                    <polyline points={pts} fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {sparklineData.map((v: number, i: number) => {
                      const fraction = sparklineData.length > 1 ? i / (sparklineData.length - 1) : 0.5;
                      const x = PAD_X + fraction * (W - PAD_X - 10);
                      const y = H - PAD_Y - (v / maxVal) * (H - PAD_Y * 2);
                      const label = sparklineLabels[i];
                      return (
                        <g key={`c-${i}`}>
                          <circle cx={x} cy={y} r="3.5" fill="var(--cyan)" />
                          {label && i % 2 === 0 && (
                            <text x={x} y={H - 2} fill="var(--text-faint)" fontSize="9" textAnchor="middle">{label}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "120ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.peakTitle")}</h3>
                <div className="revamp-chart-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {peakHours.map((ph, idx) => {
                    const pct = (ph.count / maxHourCount) * 100;
                    const isHot = pct > 70;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 48, color: isHot ? "var(--violet)" : "var(--text-secondary)" }}>{ph.hour}</span>
                        <div style={{ flex: 1, height: 7, background: "var(--chip-fill)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: isHot ? "var(--violet)" : "color-mix(in srgb, var(--violet) 45%, transparent)", borderRadius: 4, boxShadow: isHot ? "0 0 8px var(--violet)" : "none", transition: "width 0.5s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, width: 30, textAlign: "right", color: isHot ? "var(--violet)" : "var(--text-muted)" }}>{ph.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* POI crowding status */}
            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--amber)", animationDelay: "180ms" } as React.CSSProperties}>
              <h3>{t("comune.stats.poiCrowdingTitle")}</h3>
              <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
                {poiCrowding.map((r) => {
                  const pct = Math.round((r.count / totalPoi) * 100);
                  return (
                    <div key={r.stato} style={{ flex: "1 1 140px", background: "var(--chip-fill)", border: "1px solid var(--border-soft-2)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: CROWDING_COLOR[r.stato] ?? "var(--text-secondary)" }}>
                          {CROWDING_LABEL[r.stato] ?? r.stato}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: CROWDING_COLOR[r.stato] ?? "var(--text-primary)" }}>{r.count}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--border-soft)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: CROWDING_COLOR[r.stato] ?? "var(--text-faint)", transition: "width 0.5s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{pct}% dei POI</div>
                    </div>
                  );
                })}
                {poiCrowding.length === 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("comune.stats.noData")}</span>
                )}
              </div>

              {topPOIs.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {t("comune.stats.topCrowdedLabel")}
                  </div>
                  <div className="revamp-table-wrap">
                    <table className="revamp-table">
                      <thead>
                        <tr>
                          <th>{t("comune.stats.colPoiName")}</th>
                          <th>{t("comune.stats.colPoiType")}</th>
                          <th>{t("comune.stats.colPoiCrowding")}</th>
                          <th>{t("comune.stats.colPoiCapacity")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPOIs.slice(0, 6).map((poi: any) => (
                          <tr key={poi.id}>
                            <td><b>{poi.nome}</b></td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{poi.tipo ?? "—"}</td>
                            <td>
                              <span style={{ color: CROWDING_COLOR[poi.statoAffollamento] ?? "var(--text-primary)", fontWeight: 700, fontSize: 12 }}>
                                {CROWDING_LABEL[poi.statoAffollamento] ?? poi.statoAffollamento}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{poi.capacitaMax ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Event categories breakdown */}
            {evByCat.length > 0 && (
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "240ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.eventsDistTitle")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evByCat.map((row) => {
                    const pct = Math.round((row.count / maxEvCount) * 100);
                    return (
                      <div key={row.categoria} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, width: 80, textTransform: "capitalize", color: "var(--text-secondary)" }}>{row.categoria}</span>
                        <div style={{ flex: 1, height: 7, background: "var(--chip-fill)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--violet)", borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 24, textAlign: "right" }}>{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TRENDS ────────────────────────────────────────────────── */}
        {activeTab === "trends" && (
          <>
            {/* KPI summary row */}
            <div className="revamp-kpi-grid" style={{ marginBottom: 0 }}>
              {[
                { label: t("comune.stats.totalParticipations"), val: stats?.totalParticipations ?? 0, color: "var(--cyan)" },
                { label: t("comune.stats.avgPerDay"), val: avgPerDay, color: "var(--violet)" },
                { label: t("comune.stats.weekChange"), val: `${weekChange > 0 ? "+" : ""}${weekChange}%`, color: weekChange >= 0 ? "var(--green)" : "var(--red)" },
                { label: t("comune.stats.activityTypes"), val: actByType.length, color: "var(--teal)" },
              ].map((k, i) => (
                <div key={i} className="revamp-kpi-card anim-in" style={{ "--accent": k.color, animationDelay: `${i * 50}ms` } as React.CSSProperties}>
                  <span className="revamp-kpi-lbl">{k.label}</span>
                  <strong className="revamp-kpi-val" style={{ color: k.color }}>{k.val}</strong>
                </div>
              ))}
            </div>

            {/* Activity types breakdown */}
            {actByType.length > 0 && (
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "80ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.actByTypeTitle")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {actByType.map((row) => {
                    const pct = Math.round((row.count / maxActCount) * 100);
                    return (
                      <div key={row.tipo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, width: 100, textTransform: "capitalize", color: "var(--text-secondary)" }}>{row.tipo}</span>
                        <div style={{ flex: 1, height: 7, background: "var(--chip-fill)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--cyan)", borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: "right" }}>{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Week-over-week */}
            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", animationDelay: "120ms" } as React.CSSProperties}>
              <h3>{t("comune.stats.wowTitle")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "var(--chip-fill)", border: "1px solid var(--border-soft-2)", borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>{t("comune.stats.prevWeek")}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{week1}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("comune.stats.activitiesLabel")}</div>
                </div>
                <div style={{ background: "var(--chip-fill)", border: "1px solid var(--border-soft-2)", borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>{t("comune.stats.currWeek")}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: weekChange >= 0 ? "var(--green)" : "var(--red)" }}>{week2}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {weekChange > 0 ? "▲" : weekChange < 0 ? "▼" : "="} {Math.abs(weekChange)}% {t("comune.stats.vsLastWeek")}
                  </div>
                </div>
              </div>
            </div>

            {/* Citizen needs trend */}
            {serviceStats && serviceStats.total > 0 && (
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "160ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.citizenNeedsTitle")}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                  {t("comune.stats.citizenNeedsDesc", { total: serviceStats.total })}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {serviceStats.byCategory.map((row: any) => {
                    const pct = Math.round((Number(row.count) / serviceStats.total) * 100);
                    return (
                      <div key={row.categoria} style={{
                        flex: "1 1 160px",
                        background: "color-mix(in srgb, var(--magenta) 10%, var(--chip-fill))",
                        border: "1px solid color-mix(in srgb, var(--magenta) 22%, transparent)",
                        borderRadius: 10, padding: "10px 14px",
                      }}>
                        <div style={{ fontSize: 11, textTransform: "capitalize", color: "var(--text-secondary)", marginBottom: 4 }}>
                          {row.categoria.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--magenta)" }}>{row.count}</div>
                        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{pct}% del totale</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SUPPLY / DEMAND ───────────────────────────────────────── */}
        {activeTab === "supply" && (
          <>
            {/* Alert summary */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {criticalCount > 0 && (
                <div style={{ flex: "1 1 200px", background: "color-mix(in srgb, var(--red) 10%, var(--chip-fill))", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>🚨 {t("comune.stats.statusCritical")}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--red)" }}>{criticalCount}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("comune.stats.criticalDesc")}</div>
                </div>
              )}
              {warningCount > 0 && (
                <div style={{ flex: "1 1 200px", background: "color-mix(in srgb, var(--amber) 10%, var(--chip-fill))", border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--amber)", marginBottom: 4 }}>⚠️ {t("comune.stats.statusWarning")}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--amber)" }}>{warningCount}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("comune.stats.warningDesc")}</div>
                </div>
              )}
              <div style={{ flex: "1 1 200px", background: "var(--chip-fill)", border: "1px solid var(--border-soft-2)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{t("comune.stats.supplyRatioExplain")}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{t("comune.stats.supplyRatioDesc")}</div>
              </div>
            </div>

            {/* Supply / demand table */}
            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "60ms" } as React.CSSProperties}>
              <h3>{t("comune.stats.supplyTitle")}</h3>
              <div className="revamp-table-wrap" style={{ marginTop: 12 }}>
                <table className="revamp-table">
                  <thead>
                    <tr>
                      <th>{t("comune.stats.colCategory")}</th>
                      <th>{t("comune.stats.colDemand")}</th>
                      <th>{t("comune.stats.colSupply")}</th>
                      <th>{t("comune.stats.colRatio")}</th>
                      <th>{t("comune.stats.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalSupplyRows.map((row: any, idx: number) => (
                      <tr key={idx}>
                        <td><b style={{ textTransform: "capitalize" }}>{row.cat}</b></td>
                        <td>{row.demand}</td>
                        <td>{row.supply > 0 ? row.supply : <em style={{ color: "var(--text-faint)" }}>0</em>}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: row.color }}>{row.ratio}x</span>
                        </td>
                        <td>
                          <span style={{ color: row.color, fontWeight: 600, fontSize: 12 }}>
                            {row.status === "Critical" ? t("comune.stats.statusCritical") : row.status === "Warning" ? t("comune.stats.statusWarning") : t("comune.stats.statusRegular")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* POI inventory by type */}
            {(stats?.poiByType ?? []).length > 0 && (
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", animationDelay: "120ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.poiInventoryTitle")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(stats.poiByType as any[]).map((row: any) => {
                    const maxPoiCount = Math.max(...(stats.poiByType as any[]).map((r: any) => Number(r.count)), 1);
                    const pct = Math.round((Number(row.count) / maxPoiCount) * 100);
                    return (
                      <div key={row.tipo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, width: 120, textTransform: "capitalize", color: "var(--text-secondary)" }}>{row.tipo ?? "—"}</span>
                        <div style={{ flex: 1, height: 7, background: "var(--chip-fill)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--teal)", borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, width: 24, textAlign: "right" }}>{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top crowded POIs in supply context */}
            {topPOIs.filter((p) => p.statoAffollamento === "rosso" || p.statoAffollamento === "giallo").length > 0 && (
              <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--red)", animationDelay: "180ms" } as React.CSSProperties}>
                <h3>{t("comune.stats.criticalPoisTitle")}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                  {t("comune.stats.criticalPoisDesc")}
                </p>
                <div className="revamp-table-wrap">
                  <table className="revamp-table">
                    <thead>
                      <tr>
                        <th>{t("comune.stats.colPoiName")}</th>
                        <th>{t("comune.stats.colPoiType")}</th>
                        <th>{t("comune.stats.colPoiCrowding")}</th>
                        <th>{t("comune.stats.colPoiCapacity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPOIs
                        .filter((p) => p.statoAffollamento === "rosso" || p.statoAffollamento === "giallo")
                        .map((poi: any) => (
                          <tr key={poi.id}>
                            <td><b>{poi.nome}</b></td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{poi.tipo ?? "—"}</td>
                            <td>
                              <span style={{ color: CROWDING_COLOR[poi.statoAffollamento], fontWeight: 700, fontSize: 12 }}>
                                {CROWDING_LABEL[poi.statoAffollamento] ?? poi.statoAffollamento}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{poi.capacitaMax ?? "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
