import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { GeocodedLocation } from "../components/ui/GeocodedLocation";
import { getActivityById, joinActivity, leaveActivity, cancelActivity, ApiActivity } from "../lib/api";
import { ContentActions } from "../components/ui/ContentActions";

const grads: Record<string, string> = {
  outdoor: "linear-gradient(140deg,#0d9488,#134e4a)",
  cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  food: "linear-gradient(140deg,#d97706,#7c2d12)",
  sport: "linear-gradient(140deg,#059669,#064e3b)",
  relax: "linear-gradient(140deg,#0891b2,#0c4a6e)",
  social: "linear-gradient(140deg,#db2777,#831843)",
  famiglia: "linear-gradient(140deg,#0ea5e9,#075985)",
  nightlife: "linear-gradient(140deg,#6d28d9,#312e81)",
};
const catIcons: Record<string, string> = {
  outdoor: "bike",
  cultura: "landmark",
  food: "food",
  sport: "run",
  relax: "leaf",
  social: "users",
  famiglia: "family",
  nightlife: "moon",
};
const catAliases: Record<string, string> = {
  culture: "cultura",
  cultural: "cultura",
  gastronomia: "food",
  cucina: "food",
  wine: "food",
  sports: "sport",
  benessere: "relax",
  wellness: "relax",
  family: "famiglia",
  night: "nightlife",
  natura: "outdoor",
  trekking: "outdoor",
};
const normalizeCat = (value?: string | null) => {
  const key = String(value || "").trim().toLowerCase();
  return grads[key] ? key : (catAliases[key] || "outdoor");
};

const durLabel = (m: any) => {
  const n = Number.isFinite(Number(m)) ? Number(m) : null;
  if (n == null || n <= 0) return null;
  return n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? " " + (n % 60) + "min" : ""}` : `${n}min`;
};

const formatWhen = (value: any, locale = "it-IT") => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) +
    ", " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
};

export function ActivityDetailPage({ page, setPage, theme, setTheme, user, selectedActivityId }: any) {
  const { t } = useTranslation();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchActivityDetail = async () => {
    if (!selectedActivityId) {
      setError("Nessuna attività selezionata.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getActivityById(selectedActivityId);
      setActivity(data);
      if (user?.id && data.participantIds) {
        setIsJoined(data.participantIds.includes(user.id));
      }
    } catch (err: any) {
      setError(err.message || "Errore durante il caricamento dell'attività.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityDetail();
  }, [selectedActivityId, user?.id]);

  const handleJoinToggle = async () => {
    if (!activity || joinPending) return;
    setJoinPending(true);
    setJoinError("");
    try {
      if (isJoined) {
        await leaveActivity(activity.id);
      } else {
        await joinActivity(activity.id);
      }
      const updated = await getActivityById(activity.id);
      setActivity(updated);
      if (updated.participantIds) setIsJoined(updated.participantIds.includes(user.id));
    } catch (err: any) {
      console.error(err);
      setJoinError(err?.message || t("activities.joinError"));
    } finally {
      setJoinPending(false);
    }
  };

  const handleDelete = async () => {
    if (!activity || deletePending) return;
    if (!window.confirm(t("activities.deleteConfirm"))) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await cancelActivity(activity.id);
      setPage("attivita");
    } catch (err: any) {
      setDeleteError(err?.message || t("activities.deleteError"));
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento dettagli attività...
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
          <div className="revamp-status-pill danger" style={{ justifyContent: "center", marginBottom: 20 }}>
            <Icon name="warn" size={14} /> {error || "Attività non trovata."}
          </div>
          <button className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} onClick={() => setPage("attivita")}>
            Torna alle Attività
          </button>
        </div>
      </div>
    );
  }

  const isOwner = !!(user?.id && (activity as any).creator?.id === user.id);
  const cat = normalizeCat(activity.category);
  const limit = Number.isFinite(Number(activity.maxParticipants)) ? Number(activity.maxParticipants) : null;
  const count = Number(activity.participantCount || 0);
  const pct = limit ? Math.min(100, Math.round((count / limit) * 100)) : null;
  const details: any = activity;
  const duration = details.durationMinutes ?? details.duration ?? null;
  const location = details.location || details.address || null;
  const startsAt = details.startsAt || details.startAt || details.dateTime || details.scheduledAt || null;
  const whenLabel = formatWhen(startsAt);

  return (
    <div className="revamp-detail-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-detail-wrap">
        <div className="revamp-detail-card anim-in" style={{ "--accent": "var(--teal)" } as React.CSSProperties}>
          <div className="revamp-detail-cover" style={{ "--dcg": grads[cat] || grads.outdoor } as React.CSSProperties}>
            <button className="back-btn" onClick={() => setPage("attivita")}>
              <Icon name="chevronL" size={14} /> Torna alle Attività
            </button>
            <div className="cover-badge">
              <Icon name={catIcons[cat] || "activity"} size={12} /> {cat}
            </div>
            <div className="ghost-ic">
              <Icon name={catIcons[cat] || "activity"} size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <h1 className="revamp-detail-title">{activity.title}</h1>

            <div className="revamp-detail-desc">
              {activity.description || "Informazioni dettagliate non ancora disponibili."}
            </div>

            <div className="revamp-detail-attrs">
              {whenLabel && (
                <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                  <div className="lbl"><Icon name="clock" size={12} /> Quando</div>
                  <div className="val" style={{ fontSize: 13 }}>{whenLabel}</div>
                </div>
              )}
              {location && (
                <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                  <div className="lbl"><Icon name="pin" size={12} /> Luogo</div>
                  <div className="val" style={{ fontSize: 13 }}>
                    <GeocodedLocation value={location} fallback="Trento" />
                  </div>
                </div>
              )}
              {durLabel(duration) && (
                <div className="revamp-detail-attr">
                  <div className="lbl"><Icon name="clock" size={12} /> Durata</div>
                  <div className="val">{durLabel(duration)}</div>
                </div>
              )}
            </div>

            <div className="revamp-detail-section-title">Partecipazione</div>
            <div className="revamp-detail-box" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Posti</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                  {limit
                    ? <><b>{count}</b> di <b>{limit}</b> posti occupati{pct != null ? ` · ${pct}%` : ""}</>
                    : <><b>{count}</b> {count === 1 ? "partecipante" : "partecipanti"}</>}
                </div>
                {joinError && (
                  <div className="revamp-status-pill danger" role="alert" style={{ marginTop: 10 }}>
                    <Icon name="warn" size={11} /> {joinError}
                  </div>
                )}
                {deleteError && (
                  <div className="revamp-status-pill danger" role="alert" style={{ marginTop: 10 }}>
                    <Icon name="warn" size={11} /> {deleteError}
                  </div>
                )}
              </div>
              {isOwner ? (
                <button
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "9px 14px", borderRadius: 10,
                    background: "transparent",
                    border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
                    color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    opacity: deletePending ? 0.6 : 1,
                  }}
                  onClick={handleDelete}
                  disabled={deletePending}
                >
                  <Icon name="x" size={14} /> {deletePending ? t("activities.deletingActivity") : t("activities.deleteActivity")}
                </button>
              ) : user?.role === "registered_user" && (
                <button
                  className={"revamp-form-btn" + (isJoined ? " joined" : "")}
                  style={{ width: "auto", padding: "0 20px", "--accent": "var(--teal)", opacity: joinPending ? 0.6 : 1 } as React.CSSProperties}
                  onClick={handleJoinToggle}
                  disabled={joinPending}
                >
                  {joinPending ? t("activities.joinPending") : isJoined ? t("activities.leaveCta") : t("activities.joinCta")}
                </button>
              )}
              <div style={{ flexBasis: "100%" }}>
                <ContentActions
                  kind="activity"
                  id={activity.id}
                  title={activity.title || "Attività a Trento"}
                  startIso={startsAt}
                  location={location}
                  accent="var(--teal)"
                  userRole={user?.role}
                  onRequireLogin={() => setPage("login")}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
