import { useState, useEffect } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getPOIs, createPOI, updatePOI, deletePOI, POI } from "../lib/api";

export function AdminPOIPage({ page, setPage, theme, setTheme, user }: any) {
  const [search, setSearch] = useState("");
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  // id del POI in modifica; null = il form crea un nuovo POI
  const [editingId, setEditingId] = useState<string | null>(null);

  const EMPTY_POI = {
    nome: "",
    tipo: "",
    latitudine: 46.067,
    longitudine: 11.121,
    capacitaMax: 100,
    statoAffollamento: "verde" as "verde" | "giallo" | "rosso",
    descrizione: "",
  };
  const [newPoi, setNewPoi] = useState(EMPTY_POI);

  const loadPois = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getPOIs();
      setPois(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile caricare i Punti di Interesse.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPois();
  }, []);

  const handleToggleDensity = async (id: string, currentDensity: string) => {
    setErrorMsg("");
    const nextDensity = currentDensity === "verde" ? "giallo" : currentDensity === "giallo" ? "rosso" : "verde";
    try {
      const updated = await updatePOI(id, { statoAffollamento: nextDensity });
      setPois((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile aggiornare lo stato di affollamento.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo Punto di Interesse?")) {
      return;
    }
    setErrorMsg("");
    try {
      await deletePOI(id);
      setPois((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Errore durante l'eliminazione del POI.");
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!newPoi.nome || !newPoi.tipo) {
      setErrorMsg("Nome e tipologia sono obbligatori.");
      return;
    }
    if (!Number.isFinite(newPoi.latitudine) || !Number.isFinite(newPoi.longitudine)) {
      setErrorMsg("Latitudine e longitudine devono essere numeri validi.");
      return;
    }
    if (!Number.isFinite(newPoi.capacitaMax) || newPoi.capacitaMax <= 0) {
      setErrorMsg("La capacità massima deve essere maggiore di zero.");
      return;
    }
    setErrorMsg("");
    try {
      if (editingId) {
        const updated = await updatePOI(editingId, newPoi);
        setPois((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createPOI(newPoi);
        setPois((prev) => [created, ...prev]);
      }
      setShowAddForm(false);
      setEditingId(null);
      setNewPoi(EMPTY_POI);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossibile salvare il Punto di Interesse.");
    }
  };

  const handleEdit = (p: POI) => {
    setEditingId(p.id);
    setNewPoi({
      nome: p.nome,
      tipo: p.tipo || "",
      latitudine: p.latitudine,
      longitudine: p.longitudine,
      capacitaMax: p.capacitaMax,
      statoAffollamento: (p.statoAffollamento as any) || "verde",
      descrizione: p.descrizione || "",
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredPois = pois.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.tipo || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <div className="revamp-comune-head" style={{ marginBottom: 20 }}>
          <div>
            <h1>Gestione Punti di Interesse (POI)</h1>
            <p>Aggiungi, modifica e imposta i flussi di affollamento per la mappa interattiva</p>
          </div>
          <button 
            className="revamp-action-btn" 
            style={{ height: 40, "--accent": "var(--teal)" } as any}
            onClick={() => {
              if (showAddForm) { setEditingId(null); setNewPoi(EMPTY_POI); }
              setShowAddForm(!showAddForm);
            }}
          >
            <Icon name={showAddForm ? "x" : "plus"} size={14} />
            {showAddForm ? "Annulla" : "Nuovo POI"}
          </button>
        </div>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        {showAddForm && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", marginBottom: 20 }}>
            <h3>{editingId ? "Modifica Punto di Interesse" : "Aggiungi Nuovo Punto di Interesse"}</h3>
            <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">Nome POI</label>
                <input
                  className="revamp-form-input"
                  placeholder="es. Piazza Dante"
                  value={newPoi.nome}
                  onChange={(e) => setNewPoi({ ...newPoi, nome: e.target.value })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Tipologia</label>
                <input
                  className="revamp-form-input"
                  placeholder="es. Parco, Monumento, Biblioteca"
                  value={newPoi.tipo}
                  onChange={(e) => setNewPoi({ ...newPoi, tipo: e.target.value })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Latitudine</label>
                <input
                  type="number"
                  step="0.000001"
                  className="revamp-form-input"
                  value={newPoi.latitudine}
                  onChange={(e) => setNewPoi({ ...newPoi, latitudine: parseFloat(e.target.value) })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Longitudine</label>
                <input
                  type="number"
                  step="0.000001"
                  className="revamp-form-input"
                  value={newPoi.longitudine}
                  onChange={(e) => setNewPoi({ ...newPoi, longitudine: parseFloat(e.target.value) })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Capacità Massima</label>
                <input
                  type="number"
                  className="revamp-form-input"
                  value={newPoi.capacitaMax}
                  onChange={(e) => setNewPoi({ ...newPoi, capacitaMax: parseInt(e.target.value) })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">Affollamento Iniziale</label>
                <select
                  className="revamp-select"
                  value={newPoi.statoAffollamento}
                  onChange={(e) => setNewPoi({ ...newPoi, statoAffollamento: e.target.value as any })}
                >
                  <option value="verde">Basso (Verde)</option>
                  <option value="giallo">Medio (Giallo)</option>
                  <option value="rosso">Alto (Rosso)</option>
                </select>
              </div>

              <div className="revamp-form-group" style={{ gridColumn: "span 2" }}>
                <label className="revamp-form-label">Descrizione</label>
                <textarea
                  className="revamp-form-input"
                  placeholder="Breve descrizione del luogo..."
                  style={{ height: 60, padding: 10 }}
                  value={newPoi.descrizione}
                  onChange={(e) => setNewPoi({ ...newPoi, descrizione: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--teal)", width: "auto", padding: "0 20px" }}>
                  {editingId ? "Salva Modifiche" : "Salva POI"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder="Filtra punti di interesse per nome o tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>Database POI Monitorati</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>Nome POI</th>
                  <th>Tipologia</th>
                  <th>Affollamento Attuale</th>
                  <th>Posizione (Lat, Lng)</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredPois.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      Nessun Punto di Interesse trovato
                    </td>
                  </tr>
                ) : (
                  filteredPois.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.nome}</b></td>
                      <td>{p.tipo || "—"}</td>
                      <td>
                        <span className={"revamp-status-pill " + (p.statoAffollamento === "rosso" ? "danger" : p.statoAffollamento === "giallo" ? "warning" : "success")}>
                          {p.statoAffollamento === "rosso" ? "Alto affollamento" : p.statoAffollamento === "giallo" ? "Medio affollamento" : "Basso affollamento"}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.latitudine.toFixed(4)}, {p.longitudine.toFixed(4)}
                      </td>
                      <td style={{ display: "flex", gap: 8 }}>
                        <button className="revamp-action-btn" onClick={() => handleToggleDensity(p.id, p.statoAffollamento)}>
                          <Icon name="sparkle" size={12} /> Cambia Affollamento
                        </button>
                        <button className="revamp-action-btn" onClick={() => handleEdit(p)}>
                          <Icon name="edit" size={12} /> Modifica
                        </button>
                        <button className="revamp-action-btn danger" onClick={() => handleDelete(p.id)}>
                          <Icon name="x" size={12} /> Elimina
                        </button>
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
