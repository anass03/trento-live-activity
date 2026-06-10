import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

type Tab = "overview" | "trends" | "supply";

export function ComuneStatistichePage({ page, setPage, theme, setTheme }: any) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Simulated sparkline data (14 days)
  const sparklineData = [12, 18, 15, 22, 28, 20, 24, 30, 35, 42, 38, 45, 55, 48];
  const W = 600;
  const H = 90;
  const PAD = 10;
  const maxVal = Math.max(...sparklineData);
  const pts = sparklineData.map((v, i) => {
    const x = PAD + (i / (sparklineData.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (v / maxVal) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const peakHours = [
    { hour: "08:00", count: 18 },
    { hour: "12:00", count: 42 },
    { hour: "16:00", count: 28 },
    { hour: "18:00", count: 68 },
    { hour: "21:00", count: 54 },
  ];
  const maxHourCount = 70;

  const supplyRows = [
    { cat: "Cultura", demand: 45, supply: 12, ratio: 3.7, status: "Critical", color: "var(--red)" },
    { cat: "Musica", demand: 86, supply: 28, ratio: 3.1, status: "Critical", color: "var(--red)" },
    { cat: "Outdoor", demand: 24, supply: 15, ratio: 1.6, status: "Warning", color: "var(--amber)" },
    { cat: "Cibo", demand: 18, supply: 20, ratio: 0.9, status: "Regular", color: "var(--green)" },
  ];

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
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
            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "60ms" }}>
              <h3>Registrazioni Giornaliere (Ultimi 14 giorni) <span>Attive</span></h3>
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

            <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "120ms" }}>
              <h3>Orari di Maggiore Affluenza</h3>
              <div className="revamp-chart-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {peakHours.map((ph, idx) => {
                  const pct = (ph.count / maxHourCount) * 100;
                  return (
                    <div key={idx} className="area-row" style={{ padding: "8px 12px", background: "var(--chip-fill)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border-soft-2)" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, width: 60 }}>{ph.hour}</span>
                      <div className="np-bar" style={{ flex: 1, margin: "0 14px", height: 6 }}>
                        <i style={{ width: pct + "%", background: "var(--violet)", boxShadow: "0 0 6px var(--violet)" }}></i>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ph.count} partecipanti</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", animationDelay: "60ms" }}>
            <h3>Analisi di Trend Mensili</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              I flussi aggregati evidenziano un aumento della domanda del +14% negli orari serali del weekend, in particolare legati alla categoria Outdoor e Musica. Il tasso di saturazione medio dei parcheggi si attesta sul 62%.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div className="revamp-detail-attr">
                <div className="lbl">Tasso Medio Crescita</div>
                <div className="val" style={{ color: "var(--green)" }}>+14.2%</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl">Frequenza Media di Eventi</div>
                <div className="val">23 / giorno</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "supply" && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", animationDelay: "60ms" }}>
            <h3>Rapporto Domanda / Offerta Categorie</h3>
            <div className="revamp-table-wrap" style={{ marginTop: 12 }}>
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Domanda (Utenti)</th>
                    <th>Offerta (POI)</th>
                    <th>Rapporto Gap</th>
                    <th>Stato Allerta</th>
                  </tr>
                </thead>
                <tbody>
                  {supplyRows.map((row, idx) => (
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
