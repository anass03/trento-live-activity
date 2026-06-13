import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { GeocodedLocation } from "../components/ui/GeocodedLocation";
import { POIMapPicker } from "../components/map/POIMapPicker";
import { getPOIs, createPOI, updatePOI, deletePOI, reverseGeocode, POI } from "../lib/api";

export function AdminPOIPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  // id del POI in modifica; null = il form crea un nuovo POI
  const [editingId, setEditingId] = useState<string | null>(null);

  const EMPTY_POI = {
    nome: "",
    tipo: "",
    latitudine: null as number | null,
    longitudine: null as number | null,
    capacitaMax: 100,
    statoAffollamento: "verde" as "verde" | "giallo" | "rosso",
    descrizione: "",
    indirizzo: "",
  };
  const [newPoi, setNewPoi] = useState(EMPTY_POI);
  const [typeFilter, setTypeFilter] = useState("all");

  const loadPois = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getPOIs();
      setPois(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.poi.loadError"));
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
      setErrorMsg(err.message || t("admin.poi.updateError"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("admin.poi.deleteConfirm"))) {
      return;
    }
    setErrorMsg("");
    try {
      await deletePOI(id);
      setPois((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.poi.deleteError"));
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!newPoi.nome || !newPoi.tipo) {
      setErrorMsg(t("admin.poi.requiredError"));
      return;
    }
    if (newPoi.latitudine == null || newPoi.longitudine == null) {
      setErrorMsg(t("admin.poi.latlngError"));
      return;
    }
    if (!Number.isFinite(newPoi.capacitaMax) || newPoi.capacitaMax <= 0) {
      setErrorMsg(t("admin.poi.capacityError"));
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
      setErrorMsg(err.message || t("admin.poi.saveError"));
    }
  };

  const handleEdit = (p: POI) => {
    setEditingId(p.id);
    setNewPoi({
      nome: p.nome,
      tipo: p.tipo || "",
      latitudine: p.latitudine ?? null,
      longitudine: p.longitudine ?? null,
      capacitaMax: p.capacitaMax,
      statoAffollamento: (p.statoAffollamento as any) || "verde",
      descrizione: p.descrizione || "",
      indirizzo: p.indirizzo || "",
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Suddivisione per tipo: i chip sono derivati dai dati reali.
  const poiTypes = Array.from(new Set(pois.map((p) => (p.tipo || "").toLowerCase()).filter(Boolean))).sort();
  const typeCount = (tp: string) => pois.filter((p) => (p.tipo || "").toLowerCase() === tp).length;

  const filteredPois = pois.filter((p) =>
    (typeFilter === "all" || (p.tipo || "").toLowerCase() === typeFilter) &&
    (p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.tipo || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.indirizzo || "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleMapPickerConfirm = async ({ latitudine, longitudine }: { latitudine: number; longitudine: number }) => {
    setShowMapPicker(false);
    setNewPoi((p) => ({ ...p, latitudine, longitudine, indirizzo: p.indirizzo || "…" }));
    try {
      const { address } = await reverseGeocode(latitudine, longitudine);
      setNewPoi((p) => ({ ...p, indirizzo: address || p.indirizzo }));
    } catch {
      setNewPoi((p) => ({ ...p, indirizzo: p.indirizzo === "…" ? "" : p.indirizzo }));
    }
  };

  return (
    <div className="revamp-legal-scene">
      {showMapPicker && (
        <POIMapPicker
          theme={theme}
          initial={newPoi.latitudine != null ? { latitudine: newPoi.latitudine, longitudine: newPoi.longitudine! } : undefined}
          onConfirm={handleMapPickerConfirm}
          onCancel={() => setShowMapPicker(false)}
        />
      )}
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <div className="revamp-comune-head" style={{ marginBottom: 20 }}>
          <div>
            <h1>{t("admin.poi.title")}</h1>
            <p>{t("admin.poi.subtitle")}</p>
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
            {showAddForm ? t("admin.poi.cancel") : t("admin.poi.new")}
          </button>
        </div>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        {showAddForm && (
          <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)", marginBottom: 20 }}>
            <h3>{editingId ? t("admin.poi.editFormTitle") : t("admin.poi.formTitle")}</h3>
            <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.poi.name")}</label>
                <input
                  className="revamp-form-input"
                  placeholder={t("admin.poi.namePlaceholder")}
                  value={newPoi.nome}
                  onChange={(e) => setNewPoi({ ...newPoi, nome: e.target.value })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.poi.type")}</label>
                <input
                  className="revamp-form-input"
                  placeholder={t("admin.poi.typePlaceholder")}
                  value={newPoi.tipo}
                  onChange={(e) => setNewPoi({ ...newPoi, tipo: e.target.value })}
                />
              </div>

              <div className="revamp-form-group" style={{ gridColumn: "span 2" }}>
                <label className="revamp-form-label">{t("admin.poi.address")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="revamp-form-input"
                    style={{ flex: 1 }}
                    placeholder={t("admin.poi.addressPlaceholder")}
                    value={newPoi.indirizzo}
                    onChange={(e) => setNewPoi({ ...newPoi, indirizzo: e.target.value })}
                  />
                  <button
                    type="button"
                    className="revamp-action-btn"
                    onClick={() => setShowMapPicker(true)}
                  >
                    <Icon name="pin" size={13} /> {t("admin.poi.pickOnMap")}
                  </button>
                </div>
                {newPoi.latitudine == null && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                    {t("admin.poi.pickOnMapHint")}
                  </span>
                )}
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.poi.maxCapacity")}</label>
                <input
                  type="number"
                  className="revamp-form-input"
                  value={newPoi.capacitaMax}
                  onChange={(e) => setNewPoi({ ...newPoi, capacitaMax: parseInt(e.target.value) })}
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.poi.initialCrowding")}</label>
                <select
                  className="revamp-select"
                  value={newPoi.statoAffollamento}
                  onChange={(e) => setNewPoi({ ...newPoi, statoAffollamento: e.target.value as any })}
                >
                  <option value="verde">{t("admin.poi.crowdingLowOption")}</option>
                  <option value="giallo">{t("admin.poi.crowdingMediumOption")}</option>
                  <option value="rosso">{t("admin.poi.crowdingHighOption")}</option>
                </select>
              </div>

              <div className="revamp-form-group" style={{ gridColumn: "span 2" }}>
                <label className="revamp-form-label">{t("admin.poi.description")}</label>
                <textarea
                  className="revamp-form-input"
                  placeholder={t("admin.poi.descriptionPlaceholder")}
                  style={{ height: 60, padding: 10 }}
                  value={newPoi.descrizione}
                  onChange={(e) => setNewPoi({ ...newPoi, descrizione: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--teal)", width: "auto", padding: "0 20px" }}>
                  {editingId ? t("admin.poi.saveChanges") : t("admin.poi.save")}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Suddivisione per tipo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            className={"revamp-action-btn" + (typeFilter === "all" ? " success" : "")}
            onClick={() => setTypeFilter("all")}
          >
            <Icon name="grid" size={12} /> {t("admin.poi.allTypes")}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, opacity: 0.75 }}>({pois.length})</span>
          </button>
          {poiTypes.map((tp) => (
            <button
              key={tp}
              className={"revamp-action-btn" + (typeFilter === tp ? " success" : "")}
              onClick={() => setTypeFilter(tp)}
            >
              {t(`poiTypes.${tp}` as any, { defaultValue: tp })}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, opacity: 0.75 }}>({typeCount(tp)})</span>
            </button>
          ))}
        </div>

        <div className="revamp-filter-card" style={{ marginBottom: 20 }}>
          <div className="act-search" style={{ background: "var(--surface-1)" }}>
            <Icon name="search" size={16} />
            <input
              placeholder={t("admin.poi.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--teal)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>{t("admin.poi.tableTitle")}</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>{t("admin.poi.colName")}</th>
                  <th>{t("admin.poi.colType")}</th>
                  <th>{t("admin.poi.colCrowding")}</th>
                  <th>{t("admin.poi.colCapacity")}</th>
                  <th>{t("admin.poi.colAddress")}</th>
                  <th>{t("admin.poi.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPois.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      {t("admin.poi.empty")}
                    </td>
                  </tr>
                ) : (
                  filteredPois.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.nome}</b></td>
                      <td>{p.tipo ? t(`poiTypes.${p.tipo.toLowerCase()}` as any, { defaultValue: p.tipo }) : "—"}</td>
                      <td>
                        <span className={"revamp-status-pill " + (p.statoAffollamento === "rosso" ? "danger" : p.statoAffollamento === "giallo" ? "warning" : "success")}>
                          {p.statoAffollamento === "rosso" ? t("admin.poi.crowdingHigh") : p.statoAffollamento === "giallo" ? t("admin.poi.crowdingMedium") : t("admin.poi.crowdingLow")}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{p.capacitaMax ?? "—"}</td>
                      <td style={{ fontSize: 12, maxWidth: 220 }}>
                        <GeocodedLocation
                          value={p.indirizzo || (p.latitudine != null ? `${p.latitudine}, ${p.longitudine}` : null)}
                          fallback="—"
                        />
                      </td>
                      <td style={{ display: "flex", gap: 8 }}>
                        <button className="revamp-action-btn" onClick={() => handleToggleDensity(p.id, p.statoAffollamento)}>
                          <Icon name="sparkle" size={12} /> {t("admin.poi.toggleCrowding")}
                        </button>
                        <button className="revamp-action-btn" onClick={() => handleEdit(p)}>
                          <Icon name="edit" size={12} /> {t("admin.poi.edit")}
                        </button>
                        <button className="revamp-action-btn danger" onClick={() => handleDelete(p.id)}>
                          <Icon name="x" size={12} /> {t("admin.poi.delete")}
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
