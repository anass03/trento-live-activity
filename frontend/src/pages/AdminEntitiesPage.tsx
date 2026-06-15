import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getPendingEntities, approveEntity, rejectEntity, PendingEntity } from "../lib/api";

export function AdminEntitiesPage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
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
      setErrorMsg(err.message || t("admin.entities.loadError"));
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
      setErrorMsg(err.message || (approve ? t("admin.entities.approveError") : t("admin.entities.rejectError")));
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>{t("admin.entities.title")}</h1>
        <p>{t("admin.entities.subtitle")}</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--cyan)", marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>{t("admin.entities.tableTitle")}</h3>
            {loading && <Icon name="refresh" size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
          </div>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>{t("admin.entities.colEmail")}</th>
                  <th>{t("admin.entities.colName")}</th>
                  <th>{t("admin.entities.colContact")}</th>
                  <th>{t("admin.entities.colDate")}</th>
                  <th>{t("admin.entities.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      {t("admin.entities.empty")}
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.email}</b></td>
                      <td>{r.nomeEnte}</td>
                      <td>{r.nome || "—"}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString(dtLocale) : "—"}</td>
                      <td>
                        <div className="revamp-admin-row-actions">
                          <button className="revamp-action-btn success" onClick={() => handleAction(r.id, true)}>
                            <Icon name="check" size={12} /> {t("admin.entities.approve")}
                          </button>
                          <button className="revamp-action-btn danger" onClick={() => handleAction(r.id, false)}>
                            <Icon name="x" size={12} /> {t("admin.entities.reject")}
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
