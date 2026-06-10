import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getAdminUsers, deleteAdminUser } from "../lib/api";

export function AdminUsersPage({ page, setPage, theme, setTheme, user }: any) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile caricare la lista utenti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo utente? Questa operazione è irreversibile.")) {
      return;
    }
    setErrorMsg("");
    try {
      await deleteAdminUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Errore durante l'eliminazione dell'utente.");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "AmministratoreDiSistema":
        return "Admin Sistema";
      case "AmministratoreComunale":
        return "Admin Comunale";
      case "EnteCertificato":
        return "Ente Certificato";
      case "UtenteRegistrato":
        return "Cittadino";
      default:
        return role;
    }
  };

  const getRoleClass = (role: string) => {
    if (role === "AmministratoreDiSistema" || role === "AmministratoreComunale") return "danger";
    if (role === "EnteCertificato") return "warning";
    return "info";
  };

  const filteredUsers = users.filter((u) => {
    const nomeCompleto = `${u.nome || ""} ${u.cognome || ""} ${u.nomeEnte || ""}`;
    return (nomeCompleto + " " + (u.email || "")).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>Gestione Utenti del Sistema</h1>
        <p>Amministra gli account registrati ed assegna i privilegi amministrativi</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder="Cerca utenti per nome, email o ente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)" }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>Registro Account Utenti</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Nome Utente / Ente</th>
                  <th>Email</th>
                  <th>Ruolo Principale</th>
                  <th>Data Creazione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      Nessun utente trovato
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>
                          {u.ruolo === "EnteCertificato"
                            ? u.nomeEnte
                            : `${u.nome || ""} ${u.cognome || ""}`.trim() || "Senza Nome"}
                        </b>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`revamp-status-pill ${getRoleClass(u.ruolo)}`}>
                          {getRoleLabel(u.ruolo)}
                        </span>
                      </td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("it-IT") : "—"}</td>
                      <td>
                        {u.id !== user?.id ? (
                          <button className="revamp-action-btn danger" onClick={() => handleDelete(u.id)}>
                            <Icon name="x" size={12} /> Elimina
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Attuale</span>
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
