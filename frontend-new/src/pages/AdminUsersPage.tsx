import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function AdminUsersPage({ page, setPage, theme, setTheme }: any) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([
    { id: "1", name: "Marco Rossi", email: "marco.rossi@example.com", role: "registered_user", roleLabel: "Utente Registrato" },
    { id: "2", name: "Giulia M.", email: "giulia.m@example.com", role: "certified_entity", roleLabel: "Ente Certificato" },
    { id: "3", name: "Luca R.", email: "luca.r@example.com", role: "municipal_admin", roleLabel: "Admin Comunale" },
    { id: "4", name: "Sara V.", email: "sara.v@example.com", role: "system_admin", roleLabel: "Admin Sistema" },
  ]);

  const changeRole = (id: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const lbl =
            newRole === "registered_user"
              ? "Utente Registrato"
              : newRole === "certified_entity"
              ? "Ente Certificato"
              : newRole === "municipal_admin"
              ? "Admin Comunale"
              : "Admin Sistema";
          return { ...u, role: newRole, roleLabel: lbl };
        }
        return u;
      })
    );
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const filteredUsers = users.filter((u) =>
    (u.name + " " + u.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-admin-layout">
        <h1>Gestione Utenti del Sistema</h1>
        <p>Amministra gli account registrati ed assegna i privilegi amministrativi</p>

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder="Cerca utenti per nome o indirizzo email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--violet)" }}>
          <h3>Registro Account Utenti</h3>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Nome Utente</th>
                  <th>Email</th>
                  <th>Ruolo Principale</th>
                  <th>Modifica Ruolo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name}</b></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={"revamp-status-pill " + (u.role.includes("admin") ? "danger" : u.role === "certified_entity" ? "warning" : "info")}>
                        {u.roleLabel}
                      </span>
                    </td>
                    <td>
                      <select
                        className="revamp-select"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                      >
                        <option value="registered_user">Utente Registrato</option>
                        <option value="certified_entity">Ente Certificato</option>
                        <option value="municipal_admin">Admin Comunale</option>
                        <option value="system_admin">Admin Sistema</option>
                      </select>
                    </td>
                    <td>
                      <button className="revamp-action-btn danger" onClick={() => handleDelete(u.id)}>
                        <Icon name="x" size={12} /> Elimina
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
  );
}
