import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getDashboardStats } from "../lib/api";

type Tab = "overview" | "trends" | "supply";

export function ComuneStatistichePage({ page, setPage, theme, setTheme, user }: any) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const sparklineData = stats?.activitiesByDay?.map((d: any) => Number(d.count)) || [12, 18, 15, 22, 28, 20, 24, 30, 35, 42, 38, 45, 55, 48];
  const W = 600;
  const H = 90;
  const PAD = 10;
  const maxVal = Math.max(...sparklineData, 1);
  const pts = sparklineData.map((v, i) => {
    const x = PAD + (i / (sparklineData.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const peakHours = stats?.activitiesByHour?.map((h: any) => ({
    hour: `${h.hour}:00`,
    count: Number(h.count)
  })) || [
    { hour: "08:00", count: 18 },
    { hour: "12:00", count: 42 },
    { hour: "16:00", count: 28 },
    { hour: "18:00", count: 68 },
    { hour: "21:00", count: 54 },
  ];
  const maxHourCount = Math.max(...peakHours.map(ph => ph.count), 70);

  const supplyRows = (stats?.activitiesByType || []).map((act: any) => {
    const poi = (stats?.poiByType || []).find((p: any) => p.tipo === act.tipo);
    const supply = poi ? Number(poi.count) : 0;
    const demand = Number(act.count);
    const ratio = supply > 0 ? Number((demand / supply).toFixed(1)) : demand;
    const status = ratio > 2.5 ? "Critical" : ratio > 1.2 ? "Warning" : "Regular";
    const color = ratio > 2.5 ? "var(--red)" : ratio > 1.2 ? "var(--amber)" : "var(--green)";
    return {
      cat: act.tipo || "Altro",
      demand,
      supply,
      ratio,
      status,
      color
    };
  });

  const finalSupplyRows = supplyRows.length > 0 ? supplyRows : [
    { cat: "Cultura", demand: 45, supply: 12, ratio: 3.7, status: "Critical", color: "var(--red)" },
    { cat: "Musica", demand: 86, supply: 28, ratio: 3.1, status: "Critical", color: "var(--red)" },
    { cat: "Outdoor", demand: 24, supply: 15, ratio: 1.6, status: "Warning", color: "var(--amber)" },
    { cat: "Cibo", demand: 18, supply: 20, ratio: 0.9, status: "Regular", color: "var(--green)" },
  ];

  if (loading) {
    return (
      <div className="revamp-legal-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento statistiche territoriali...
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
            <h1>Statistiche Territoriali</h1>
            <p>Monitoraggio dell'offerta e dei picchi di domanda della community cittadina</p>
          </div>
          <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-dashboard")}>
            <Icon name="home" size={15} /> Torna al Comune
          </button>
        </div>

        {/* Tab switcher */}
        <div className="revamp-profile-nav" style={{ marginBottom: 20 }}>
          <button
            className={"revamp-profile-tab" + (activeTab === "overview" ? " active" : "")}
            onClick={() => setActiveTab("overview")}
          >
            Panoramica Attività
          </button>
          <button
            className={"revamp-profile-tab" + (activeTab === "trends" ? " active" : "")}
            onClick={() => setActiveTab("trends")}
          >
            Analisi Trend & Orari Picco
          </button>
          <button
            className={"revamp-profile-tab" + (activeTab === "supply" ? " active" : "")}
            onClick={() => setActiveTab("supply")}
          >
            Rapporto Offerta / Domanda
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="revamp-charts-grid">
            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "60ms" } as React.CSSProperties}>
              <h3>Attività Create per Giorno (Ultimi 14 giorni) <span>Attive</span></h3>
              <div className="revamp-chart-body">
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
                  <polyline points={pts} fill="none" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {sparklineData.map((v, i) => {
                    const x = PAD + (i / (sparklineData.length - 1)) * (W - PAD * 2);
                    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
                    return <circle key={i} cx={x} cy={y} r="4" fill="var(--cyan)" />;
                  })}
                </svg>
              </div>
            </div>

            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "120ms" } as React.CSSProperties}>
              <h3>Orari di Maggiore Affluenza (Attività Spontanee)</h3>
              <div className="revamp-chart-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {peakHours.map((ph: any, idx: number) => {
                  const pct = (ph.count / maxHourCount) * 100;
                  return (
                    <div key={idx} className="area-row" style={{ padding: "8px 12px", background: "var(--chip-fill)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border-soft-2)" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, width: 60 }}>{ph.hour}</span>
                      <div className="np-bar" style={{ flex: 1, margin: "0 14px", height: 6 }}>
                        <i style={{ width: pct + "%", background: "var(--violet)", boxShadow: "0 0 6px var(--violet)" }}></i>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ph.count} attività</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", animationDelay: "60ms" } as React.CSSProperties}>
            <h3>Analisi di Trend Mensili</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              I flussi aggregati sul territorio di Trento indicano una partecipazione attiva elevata alle attività e una distribuzione dei punti di interesse che supportano la mobilità sostenibile (es. parcheggi gestiti).
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div className="revamp-detail-attr">
                <div className="lbl">Totale Partecipazioni Registrate</div>
                <div className="val" style={{ color: "var(--green)" }}>{stats?.totalParticipations ?? 0}</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl">Punti di Interesse Monitorati</div>
                <div className="val">{stats?.totalPOIs ?? 0}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "supply" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "60ms" } as React.CSSProperties}>
            <h3>Rapporto Domanda / Offerta Categorie</h3>
            <div className="revamp-table-wrap" style={{ marginTop: 12 }}>
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>Categoria Cella</th>
                    <th>Domanda (Attività create)</th>
                    <th>Offerta (POI mappati)</th>
                    <th>Rapporto Gap (Demand/Supply)</th>
                    <th>Stato Allerta</th>
                  </tr>
                </thead>
                <tbody>
                  {finalSupplyRows.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td><b>{row.cat}</b></td>
                      <td>{row.demand}</td>
                      <td>{row.supply}</td>
                      <td>{row.ratio}x</td>
                      <td>
                        <span style={{ color: row.color, fontWeight: 700 }}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
