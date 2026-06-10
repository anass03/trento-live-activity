import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function AdminModerationPage({ page, setPage, theme, setTheme }: any) {
  const [reports, setReports] = useState([
    { id: "1", type: "Attività", title: "Cena sociale multiculturale", author: "Sara V.", reason: "Contenuto inopportuno segnalato dagli utenti", status: "In attesa" },
    { id: "2", type: "Evento", title: "DJ Set al Muse — Night Vibes", author: "Muse", reason: "Superamento limiti acustici e affollamento", status: "In attesa" },
  ]);

  const handleAction = (id: string, deleteContent: boolean) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, status: deleteContent ? "Rimosso" : "Approvato" };
        }
        return r;
      })
    );
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-admin-layout">
        <h1>Moderazione Contenuti Segnalati</h1>
        <p>Prendi provvedimenti in merito a violazioni o segnalazioni inserite dalla community</p>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", marginTop: 20 }}>
          <h3>Coda Segnalazioni Attive</h3>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Titolo Contenuto</th>
                  <th>Autore</th>
                  <th>Motivazione Segnalazione</th>
                  <th>Stato Moderazione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="revamp-status-pill info">{r.type}</span>
                    </td>
                    <td><b>{r.title}</b></td>
                    <td>{r.author}</td>
                    <td>{r.reason}</td>
                    <td>
                      <span className={"revamp-status-pill " + (r.status === "Rimosso" ? "danger" : r.status === "Approvato" ? "success" : "warning")}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "In attesa" ? (
                        <div className="revamp-admin-row-actions">
                          <button className="revamp-action-btn danger" onClick={() => handleAction(r.id, true)}>
                            <Icon name="x" size={12} /> Rimuovi
                          </button>
                          <button className="revamp-action-btn success" onClick={() => handleAction(r.id, false)}>
                            <Icon name="check" size={12} /> Mantieni
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>Moderato</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
