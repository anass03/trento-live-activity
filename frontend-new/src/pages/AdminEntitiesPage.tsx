import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getPendingEntities, approveEntity, rejectEntity, PendingEntity } from "../lib/api";

export function AdminEntitiesPage({ page, setPage, theme, setTheme, user }: any) {
  const [requests, setRequests] = useState<PendingEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getPendingEntities();
      setRequests(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile caricare le richieste degli enti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, approve: boolean) => {
    setErrorMsg("");
    try {
      if (approve) {
        await approveEntity(id);
      } else {
        await rejectEntity(id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || `Impossibile ${approve ? "approvare" : "rifiutare"} l'ente.`);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>Richieste Verifiche Enti</h1>
        <p>Valuta e approva le richieste per i privilegi di inserimento attività ed eventi certificati</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>Coda Richieste di Abilitazione</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Email Ente</th>
                  <th>Nome Ente</th>
                  <th>Persona di Riferimento</th>
                  <th>Data Richiesta</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      Nessuna richiesta in attesa
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.email}</b></td>
                      <td>{r.nomeEnte}</td>
                      <td>{r.nome || "—"}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("it-IT") : "—"}</td>
                      <td>
                        <div className="revamp-admin-row-actions">
                          <button className="revamp-action-btn success" onClick={() => handleAction(r.id, true)}>
                            <Icon name="check" size={12} /> Approva
                          </button>
                          <button className="revamp-action-btn danger" onClick={() => handleAction(r.id, false)}>
                            <Icon name="x" size={12} /> Rifiuta
                          </button>
                        </div>
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
