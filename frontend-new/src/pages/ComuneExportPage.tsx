import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { downloadDashboardExport, getDashboardStats } from "../lib/api";

export function ComuneExportPage({ page, setPage, theme, setTheme, user }: any) {
  const [format, setFormat] = useState("pdf");
  const [startDate, setStartDate] = useState("2026-05-01");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const pastExports = [
    { id: "EXP-889", date: "15 Maggio 2026", format: "pdf", size: "2.4 MB", status: "Pronto" },
    { id: "EXP-884", date: "10 Maggio 2026", format: "csv", size: "840 KB", status: "Pronto" },
    { id: "EXP-879", date: "01 Maggio 2026", format: "json", size: "1.2 MB", status: "Pronto" },
  ];

  const triggerDownload = async (fmt: string, date: string) => {
    setErrorMsg("");
    try {
      if (fmt === "json") {
        const stats = await getDashboardStats({ da: date });
        const blob = new Blob([JSON.stringify(stats, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `trento-live-activity-export-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const datasets = "kpi,activities,poi_crowding,poi_inventory,supply_demand,citizen_needs";
        const blob = await downloadDashboardExport(fmt as "pdf" | "csv", {
          da: date,
          datasets,
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `trento-live-activity-export-${date}.${fmt}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      return true;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile scaricare l'esportazione.");
      return false;
    }
  };

  const handleExport = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const ok = await triggerDownload(format, startDate);
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-comune-layout">
        <div className="revamp-comune-head">
          <div>
            <h1>Esportazione Dati Territoriali</h1>
            <p>Genera e scarica report in formati compatibili per analisi esterne</p>
          </div>
          <button className="revamp-action-btn" style={{ height: 40 }} onClick={() => setPage("comune-dashboard")}>
            <Icon name="home" size={15} /> Torna al Comune
          </button>
        </div>

        {errorMsg && (
          <div className="revamp-status-pill danger" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="warn" size={14} /> {errorMsg}
          </div>
        )}

        <div className="revamp-charts-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
          {/* Export request form */}
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)", animationDelay: "60ms" }}>
            <h3>Nuova Esportazione</h3>
            {success ? (
              <div className="revamp-status-pill success" style={{ padding: "12px 0", justifyContent: "center", width: "100%" }}>
                <Icon name="check" size={12} /> Generazione completata!
              </div>
            ) : (
              <form onSubmit={handleExport} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="revamp-form-group">
                  <label className="revamp-form-label">Data Inizio</label>
                  <input
                    type="date"
                    className="revamp-form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ paddingLeft: 14 }}
                  />
                </div>

                <div className="revamp-form-group">
                  <label className="revamp-form-label">Formato</label>
                  <select
                    className="revamp-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="pdf">Documento PDF (.pdf)</option>
                    <option value="csv">Tabella CSV (.csv)</option>
                    <option value="json">Dati JSON (.json)</option>
                  </select>
                </div>

                <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" }} disabled={loading}>
                  <Icon name={loading ? "refresh" : "share"} size={16} className={loading ? "revamp-spin" : ""} />
                  {loading ? "Generazione..." : "Genera e Scarica"}
                </button>
              </form>
            )}
          </div>

          {/* Past exports list */}
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", animationDelay: "120ms" }}>
            <h3>Log Esportazioni Recenti</h3>
            <div className="revamp-table-wrap">
              <table className="revamp-table">
                <thead>
                  <tr>
                    <th>ID Report</th>
                    <th>Data Generazione</th>
                    <th>Formato</th>
                    <th>Dimensione</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {pastExports.map((exp, idx) => (
                    <tr key={idx}>
                      <td><b>{exp.id}</b></td>
                      <td>{exp.date}</td>
                      <td>
                        <span className="revamp-status-pill info">{exp.format.toUpperCase()}</span>
                      </td>
                      <td>{exp.size}</td>
                      <td>
                        <span className="revamp-status-pill success">{exp.status}</span>
                      </td>
                      <td>
                        <button
                          className="revamp-action-btn success"
                          onClick={() => triggerDownload(exp.format, startDate)}
                        >
                          <Icon name="arrow" size={12} style={{ transform: "rotate(135deg)" }} /> Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
