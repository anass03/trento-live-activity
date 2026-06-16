import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { getPushStats, sendAdminBroadcast, PushStats, PushAudience } from "../lib/api";

export function AdminNotificationsPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [audience, setAudience] = useState<PushAudience>("all");
  const [stats, setStats] = useState<PushStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadStats = async () => {
    try {
      const data = await getPushStats();
      setStats(data);
    } catch (err) {
      console.error("Errore nel caricamento delle statistiche notifiche:", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSend = async (e: any) => {
    e.preventDefault();
    if (!title || !desc) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await sendAdminBroadcast({
        title,
        body: desc,
        audience,
      });
      setSuccess(true);
      setTitle("");
      setDesc("");
      loadStats(); // reload stats
      setTimeout(() => {
        setSuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("admin.notifications.sendError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-admin-layout">
        <h1>{t("admin.notifications.title")}</h1>
        <p>{t("admin.notifications.subtitle")}</p>

        {errorMsg && (
          <div className="revamp-status-pill danger" style={{ margin: "20px auto 0", maxWidth: 640, padding: "12px", width: "100%", justifyContent: "center" }}>
            <Icon name="alert" size={14} /> {errorMsg}
          </div>
        )}

        {stats && (
          <div className="revamp-dashboard-grid" style={{ maxWidth: 640, margin: "20px auto 0" }}>
            <div className="revamp-stat-card" style={{ "--accent": "var(--cyan)" } as any}>
              <Icon name="bell" size={24} style={{ color: "var(--cyan)" }} />
              <div>
                <h2>{stats.totalTokens}</h2>
                <p>{t("admin.notifications.statTokens")}</p>
              </div>
            </div>
            <div className="revamp-stat-card" style={{ "--accent": "var(--emerald)" } as any}>
              <Icon name="spid" size={24} style={{ color: "var(--emerald)" }} />
              <div>
                <h2>{stats.usersReachable}</h2>
                <p>{t("admin.notifications.statReachable")}</p>
              </div>
            </div>
          </div>
        )}

        <div className="revamp-legal-card anim-in" style={{ "--accent": "var(--cyan)", maxWidth: 640, margin: "20px auto 0" }}>
          <h2>{t("admin.notifications.formTitle")}</h2>
          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "12px 0", justifyContent: "center", marginBottom: 14 }}>
              <Icon name="check" size={12} /> {t("admin.notifications.success")}
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.notifications.audienceLabel")}</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={"s-rpill" + (audience === "all" ? " on" : "")}
                    style={{ "--accent": "var(--cyan)" }}
                    onClick={() => setAudience("all")}
                  >
                    {t("admin.notifications.audienceAll")}
                  </button>
                  <button
                    type="button"
                    className={"s-rpill" + (audience === "cittadini" ? " on" : "")}
                    style={{ "--accent": "var(--cyan)" }}
                    onClick={() => setAudience("cittadini")}
                  >
                    {t("admin.notifications.audienceCitizens")}
                  </button>
                  <button
                    type="button"
                    className={"s-rpill" + (audience === "enti" ? " on" : "")}
                    style={{ "--accent": "var(--cyan)" }}
                    onClick={() => setAudience("enti")}
                  >
                    {t("admin.notifications.audienceEntities")}
                  </button>
                  <button
                    type="button"
                    className={"s-rpill" + (audience === "comunali" ? " on" : "")}
                    style={{ "--accent": "var(--cyan)" }}
                    onClick={() => setAudience("comunali")}
                  >
                    {t("admin.notifications.audienceMunicipal")}
                  </button>
                </div>
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.notifications.titleLabel")}</label>
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder={t("admin.notifications.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: 14 }}
                  required
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("admin.notifications.bodyLabel")}</label>
                <textarea
                  className="revamp-textarea"
                  placeholder={t("admin.notifications.bodyPlaceholder")}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--cyan)" }} disabled={loading}>
                {loading ? t("admin.notifications.sending") : t("admin.notifications.send")}
                <Icon name={loading ? "refresh" : "bell"} size={16} className={loading ? "spin" : ""} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
