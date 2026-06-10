import { useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function AdminPOIPage({ page, setPage, theme, setTheme }: any) {
  const [search, setSearch] = useState("");
  const [pois, setPois] = useState([
    { id: "1", name: "Piazza Duomo", type: "Piazza Storica", density: "rosso", label: "Alto affollamento" },
    { id: "2", name: "MUSE - Museo Scienze", type: "Museo", density: "giallo", label: "Medio affollamento" },
    { id: "3", name: "Castello Buonconsiglio", type: "Monumento", density: "verde", label: "Basso affollamento" },
    { id: "4", name: "Parco delle Albere", type: "Parco Urbano", density: "verde", label: "Basso affollamento" },
  ]);

  const toggleDensity = (id: string) => {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextDensity = p.density === "verde" ? "giallo" : p.density === "giallo" ? "rosso" : "verde";
          const nextLabel = nextDensity === "verde" ? "Basso affollamento" : nextDensity === "giallo" ? "Medio affollamento" : "Alto affollamento";
          return { ...p, density: nextDensity, label: nextLabel };
        }
        return p;
      })
    );
  };

  const filteredPois = pois.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <div className="revamp-admin-layout">
        <h1>Gestione Punti di Interesse (POI)</h1>
        <p>Aggiungi, modifica e imposta i flussi di affollamento simulati per la mappa interattiva</p>

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder="Filtra punti di interesse per nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)" }}>
          <h3>Database POI Monitorati</h3>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Nome POI</th>
                  <th>Tipologia</th>
                  <th>Affollamento Attuale</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredPois.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td>{p.type}</td>
                    <td>
                      <span className={"revamp-status-pill " + (p.density === "rosso" ? "danger" : p.density === "giallo" ? "warning" : "success")}>
                        {p.label}
                      </span>
                    </td>
                    <td>
                      <button className="revamp-action-btn" onClick={() => toggleDensity(p.id)}>
                        <Icon name="sparkle" size={12} /> Modifica Stato
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
