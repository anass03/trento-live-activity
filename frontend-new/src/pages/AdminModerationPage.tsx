import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getReports, resolveReport, Report } from "../lib/api";

/* Stati del backend: 'aperta' → 'in lavorazione' → 'risolta'.
   La coda è organizzata a tab per stato; "rimuovi" chiude tutte le
   segnalazioni dello stesso contenuto, quindi ricarichiamo la lista. */
const STATES = [
  { id: "aperta", labelKey: "admin.moderation.tabAperta", color: "var(--red)", icon: "warn" },
  { id: "in lavorazione", labelKey: "admin.moderation.tabLavorazione", color: "var(--amber)", icon: "clock" },
  { id: "risolta", labelKey: "admin.moderation.tabRisolta", color: "var(--green)", icon: "check" },
];

export function AdminModerationPage({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  const [stato, setStato] = useState("aperta");
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadReports = async (which = stato) => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Una chiamata per tab attiva + conteggi per le altre due (sono liste corte).
      const all = await Promise.all(STATES.map((s) => getReports(s.id)));
      const next: Record<string, number> = {};
      STATES.forEach((s, i) => { next[s.id] = (all[i].reports || []).length; });
      setCounts(next);
      setReports(all[STATES.findIndex((s) => s.id === which)].reports || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.moderation.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(stato); }, [stato]);

  const act = async (id: string, azione: "rimuovi" | "archivia" | "in_lavorazione") => {
    if (azione === "rimuovi" && !window.confirm(t("admin.moderation.confirmRemove"))) return;
    setErrorMsg("");
    setPendingId(id);
    try {
      await resolveReport(id, azione);
      await loadReports();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.moderation.resolveError"));
    } finally {
      setPendingId(null);
    }
  };

  const contentTitle = (r: Report) =>
    r.event?.titolo || r.activity?.title ||
    (r.activity?.tipo ? `${t("comune.dashboard.typeActivity")} di ${r.activity.tipo}` : t("admin.moderation.deletedEvent"));

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>{t("admin.moderation.title")}</h1>
        <p>{t("admin.moderation.subtitle")}</p>

        {errorMsg && (
          <div className="revamp-status-pill error" style={{ margin: "0 0 20px 0", padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        {/* Tab per stato della coda */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {STATES.map((s) => (
            <button
              key={s.id}
              className={"revamp-action-btn" + (stato === s.id ? " success" : "")}
              style={{ padding: "9px 16px", fontSize: 13 }}
              onClick={() => setStato(s.id)}
            >
              <Icon name={s.icon} size={13} style={{ color: s.color }} /> {t(s.labelKey)}
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, opacity: 0.75 }}>({counts[s.id] ?? "…"})</span>
            </button>
          ))}
          <button className="revamp-action-btn" style={{ marginLeft: "auto" }} onClick={() => loadReports()}>
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} /> {t("admin.moderation.refresh")}
          </button>
        </div>

        <div className="revamp-chart-card anim-in" style={{ "--accent": "var(--magenta)", marginTop: 16 }}>
          <div className="revamp-table-wrap">
            <table className="revamp-table">
              <thead>
                <tr>
                  <th>{t("admin.moderation.colType")}</th>
                  <th>{t("admin.moderation.colContent")}</th>
                  <th>{t("admin.moderation.colReason")}</th>
                  <th>{t("admin.moderation.colDate")}</th>
                  <th>{t("admin.moderation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      {t("admin.moderation.empty")}
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} style={pendingId === r.id ? { opacity: 0.5 } : undefined}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <span className="revamp-status-pill info">{r.tipo}</span>
                          <span className={"revamp-status-pill " + (r.activityId ? "success" : "warning")} style={{ width: "fit-content" }}>
                            {r.activityId ? t("comune.dashboard.typeActivity") : t("comune.dashboard.typeEvent")}
                          </span>
                        </div>
                      </td>
                      <td><b>{contentTitle(r)}</b></td>
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12.5 }}>
                          {r.descrizione || t("admin.moderation.noDetails")}
                        </div>
                      </td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString(dtLocale) : "—"}</td>
                      <td>
                        {stato === "risolta" ? (
                          <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>
                            {t("admin.moderation.stateClosed")}
                          </span>
                        ) : (
                          <div className="revamp-admin-row-actions" style={{ flexWrap: "wrap" }}>
                            {stato === "aperta" && (
                              <button className="revamp-action-btn" disabled={pendingId === r.id} onClick={() => act(r.id, "in_lavorazione")}>
                                <Icon name="clock" size={12} /> {t("admin.moderation.takeCharge")}
                              </button>
                            )}
                            <button className="revamp-action-btn danger" disabled={pendingId === r.id} onClick={() => act(r.id, "rimuovi")}>
                              <Icon name="x" size={12} /> {t("admin.moderation.remove")}
                            </button>
                            <button className="revamp-action-btn success" disabled={pendingId === r.id} onClick={() => act(r.id, "archivia")}>
                              <Icon name="check" size={12} /> {t("admin.moderation.keep")}
                            </button>
                          </div>
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
