import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getReports, resolveReport, Report } from "../lib/api";

export function AdminModerationPage({ page, setPage, theme, setTheme, user }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Stato backend: 'aperta' | 'in lavorazione' | 'risolta'
      const data = await getReports("aperta");
      setReports(data.reports || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile caricare le segnalazioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAction = async (id: string, removeContent: boolean) => {
    setErrorMsg("");
    try {
      const azione = removeContent ? "rimuovi" : "archivia";
      await resolveReport(id, azione);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Impossibile risolvere la segnalazione.`);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>Moderazione Contenuti Segnalati</h1>
        <p>Prendi provvedimenti in merito a violazioni o segnalazioni inserite dalla community</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>Coda Segnalazioni Attive</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Tipo Segnalazione</th>
                  <th>Contenuto</th>
                  <th>Titolo</th>
                  <th>Motivazione</th>
                  <th>Data Segnalazione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      Nessuna segnalazione in attesa
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="revamp-status-pill info">{r.tipo}</span>
                      </td>
                      <td>
                        <span className={"revamp-status-pill " + (r.activityId ? "success" : "warning")}>
                          {r.activityId ? "Attività" : "Evento"}
                        </span>
                      </td>
                      <td><b>{r.event?.titolo || r.activity?.title || (r.activity?.tipo ? `Attività di ${r.activity.tipo}` : "Contenuto eliminato")}</b></td>
                      <td>{r.descrizione || "Nessun dettaglio specificato"}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("it-IT") : "—"}</td>
                      <td>
                        {r.stato === "aperta" ? (
                          <div className="revamp-admin-row-actions">
                            <button className="revamp-action-btn danger" onClick={() => handleAction(r.id, true)}>
                              <Icon name="x" size={12} /> Rimuovi
                            </button>
                            <button className="revamp-action-btn success" onClick={() => handleAction(r.id, false)}>
                              <Icon name="check" size={12} /> Mantieni
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>
                            Risolto ({r.stato})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
