import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function AdminEntitiesPage({ page, setPage, theme, setTheme, user }: any) {
  const [requests, setRequests] = useState([
    { id: "REQ-01", name: "Associazione Outdoor Trento", type: "Associazione Sportiva", doc: "Statuto_AO_Trento.pdf", status: "In attesa" },
    { id: "REQ-02", name: "Cantine Rotaliane Srl", type: "Ente Gastronomico", doc: "Visura_Camerale_Rotaliane.pdf", status: "In attesa" },
  ]);

  const handleAction = (id: string, approve: boolean) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, status: approve ? "Approvato" : "Rifiutato" };
        }
        return r;
      })
    );
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>Richieste Verifiche Enti</h1>
        <p>Valuta e approva le richieste per i privilegi di inserimento attività ed eventi certificati</p>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", marginTop: 20 }}>
          <h3>Coda Richieste di Abilitazione</h3>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>ID Richiesta</th>
                  <th>Nome Ente</th>
                  <th>Tipologia</th>
                  <th>Documento Allegato</th>
                  <th>Stato Richiesta</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.id}</b></td>
                    <td>{r.name}</td>
                    <td>{r.type}</td>
                    <td>
                      <button className="revamp-action-btn" style={{ textDecoration: "underline" }}>
                        <Icon name="landmark" size={12} /> {r.doc}
                      </button>
                    </td>
                    <td>
                      <span className={"revamp-status-pill " + (r.status === "Approvato" ? "success" : r.status === "Rifiutato" ? "danger" : "warning")}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "In attesa" ? (
                        <div className="revamp-admin-row-actions">
                          <button className="revamp-action-btn success" onClick={() => handleAction(r.id, true)}>
                            <Icon name="check" size={12} /> Approva
                          </button>
                          <button className="revamp-action-btn danger" onClick={() => handleAction(r.id, false)}>
                            <Icon name="x" size={12} /> Rifiuta
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>Nessuna azione richiesta</span>
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
