import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { GeocodedLocation } from "../components/ui/GeocodedLocation";
import { getActivityById, joinActivity, leaveActivity, cancelActivity, removeFavorite, addFavorite, getFavorites, markActivityDeleted, ApiActivity } from "../lib/api";
import { getTimeFormat } from "../lib/i18n";
import { shareOrCopy } from "../lib/share";
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
  const hour12 = getTimeFormat() === "12h";
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) +
    ", " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12 });
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
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [shared, setShared] = useState(false);

  const fetchActivityDetail = async () => {
    if (!selectedActivityId) {
      setError(t("activities.noneSelected"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [data, favs] = await Promise.all([
        getActivityById(selectedActivityId),
        user?.role === "registered_user" ? getFavorites().catch(() => []) : Promise.resolve([]),
      ]);
      setActivity(data);
      if (user?.id && data.participantIds) {
        setIsJoined(data.participantIds.includes(user.id));
      }
      setIsSaved(favs.some((f: any) => f.markerType === "activity" && f.markerId === selectedActivityId));
    } catch (err: any) {
      setError(err.message || t("activities.detailLoadError"));
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
      markActivityDeleted(activity.id);
      removeFavorite("activity", activity.id).catch(() => {});
      setPage("attivita");
    } catch (err: any) {
      setDeleteError(err?.message || t("activities.deleteError"));
    } finally {
      setDeletePending(false);
    }
  };

  const handleSave = async () => {
    if (savePending || !activity) return;
    const next = !isSaved;
    setIsSaved(next);
    setSavePending(true);
    try {
      if (next) await addFavorite("activity", activity.id);
      else await removeFavorite("activity", activity.id);
    } catch {
      setIsSaved(!next);
    } finally {
      setSavePending(false);
    }
  };

  const handleShare = async () => {
    if (!activity) return;
    const shareTitle = activity.title || t(`activities.cats.${normalizeCat(activity.category)}`, { defaultValue: t("activities.defaultTitle") });
    const text = `${shareTitle} — Trento`;
    try {
      await shareOrCopy({ title: shareTitle, text, url: window.location.href });
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch { /* share sheet dismissed */ }
  };

  if (loading) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("activities.detailLoading")}
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
            <Icon name="warn" size={14} /> {error || t("activities.notFound")}
          </div>
          <button className="revamp-form-btn" style={{ "--accent": "var(--teal)" } as React.CSSProperties} onClick={() => setPage("attivita")}>
            {t("activities.backToActivities")}
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
              <Icon name="chevronL" size={14} /> {t("activities.backToActivities")}
            </button>
            <div className="cover-badge">
              <Icon name={catIcons[cat] || "activity"} size={12} /> {cat}
            </div>
            <div className="ghost-ic">
              <Icon name={catIcons[cat] || "activity"} size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 2 }}>
              <h1 className="revamp-detail-title" style={{ flex: 1, margin: 0 }}>{activity.title || t(`activities.cats.${normalizeCat(activity.category)}`, { defaultValue: activity.category || t("activities.defaultTitle") })}</h1>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingTop: 2 }}>
                <button
                  onClick={handleShare}
                  title={shared ? t("events.shareCopied") : t("events.ariaShare")}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border-soft-2)",
                    background: shared ? "color-mix(in srgb, var(--teal) 14%, transparent)" : "var(--chip-fill)",
                    color: shared ? "var(--teal)" : "var(--text-muted)",
                    display: "grid", placeItems: "center", cursor: "pointer", transition: "all 180ms",
                  }}
                >
                  <Icon name={shared ? "check" : "share"} size={16} />
                </button>
                {(user?.role === "registered_user" || user?.role === "anonymous") && (
                  <button
                    onClick={user?.role === "anonymous" ? () => setPage("login") : handleSave}
                    disabled={savePending}
                    title={t("events.ariaSave")}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border-soft-2)",
                      background: isSaved ? "color-mix(in srgb, var(--teal) 14%, transparent)" : "var(--chip-fill)",
                      color: isSaved ? "var(--teal)" : "var(--text-muted)",
                      display: "grid", placeItems: "center", cursor: "pointer", transition: "all 180ms",
                    }}
                  >
                    <Icon name="bookmark" size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="revamp-detail-desc">
              {activity.description || t("activities.noDescription")}
            </div>

            <div className="revamp-detail-attrs">
              {whenLabel && (
                <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                  <div className="lbl"><Icon name="clock" size={12} /> {t("activities.when")}</div>
                  <div className="val" style={{ fontSize: 13 }}>{whenLabel}</div>
                </div>
              )}
              {location && (
                <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                  <div className="lbl"><Icon name="pin" size={12} /> {t("activities.place")}</div>
                  <div className="val" style={{ fontSize: 13 }}>
                    <GeocodedLocation value={location} fallback="Trento" />
                  </div>
                </div>
              )}
              {durLabel(duration) && (
                <div className="revamp-detail-attr">
                  <div className="lbl"><Icon name="clock" size={12} /> {t("activities.duration")}</div>
                  <div className="val">{durLabel(duration)}</div>
                </div>
              )}
            </div>

            <div className="revamp-detail-section-title">{t("activities.participation")}</div>
            <div className="revamp-detail-box">
              {pct != null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t("activities.seatsTaken")}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}
                      dangerouslySetInnerHTML={{ __html: t("activities.seatsOf", { count, limit }) }} />
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--teal)" }}>
                    {pct}%
                  </div>
                </div>
              )}
              {pct != null && (
                <div className="np-bar" style={{ height: 6, marginBottom: 16 }}>
                  <i style={{ width: pct + "%", background: "var(--teal)", boxShadow: "0 0 8px var(--teal)" }}></i>
                </div>
              )}
              {pct == null && (
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t("activities.participantsLabel")}</div>
              )}
              {joinError && (
                <div className="revamp-status-pill danger" role="alert" style={{ marginBottom: 14 }}>
                  <Icon name="warn" size={11} /> {joinError}
                </div>
              )}
              {deleteError && (
                <div className="revamp-status-pill danger" role="alert" style={{ marginBottom: 8 }}>
                  <Icon name="warn" size={11} /> {deleteError}
                </div>
              )}
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
              ) : user?.role === "registered_user" ? (
                <button
                  className={"revamp-form-btn" + (isJoined ? " joined" : "")}
                  style={{ "--accent": "var(--teal)", opacity: joinPending ? 0.6 : 1 } as React.CSSProperties}
                  onClick={handleJoinToggle}
                  disabled={joinPending}
                >
                  {joinPending ? t("activities.joinPending") : isJoined ? t("activities.leaveCta") : t("activities.joinCta")}
                </button>
              ) : user?.role === "anonymous" ? (
                <button
                  className="revamp-form-btn"
                  style={{ "--accent": "var(--teal)" } as React.CSSProperties}
                  onClick={() => setPage("login")}
                >
                  {t("activities.joinCta")}
                </button>
              ) : null}
              <ContentActions
                kind="activity"
                id={activity.id}
                title={activity.title || t("activities.defaultTitle")}
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
  );
}
