import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { GeocodedLocation } from "../components/ui/GeocodedLocation";
import { getEventById, joinEvent, leaveEvent, deleteEvent, ApiEvent } from "../lib/api";
import { getTimeFormat } from "../lib/i18n";
import { ContentActions } from "../components/ui/ContentActions";

const grads: Record<string, string> = {
  musica: "linear-gradient(140deg,#db2777,#831843)",
  cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  cibo: "linear-gradient(140deg,#d97706,#7c2d12)",
  outdoor: "linear-gradient(140deg,#0d9488,#134e4a)",
  sport: "linear-gradient(140deg,#059669,#064e3b)",
  famiglia: "linear-gradient(140deg,#0ea5e9,#075985)",
};

const formatWhen = (value: any, lang?: string) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const locale = lang?.startsWith("en") ? "en-GB" : "it-IT";
  const hour12 = getTimeFormat() === "12h";
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) +
    ", " + d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12 });
};

export function EventDetailPage({ page, setPage, theme, setTheme, user, selectedEventId }: any) {
  const { t, i18n } = useTranslation();
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchEventDetail = async () => {
    if (!selectedEventId) {
      setError(t("events.noneSelected"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getEventById(selectedEventId);
      setEvent(data);
      if (user?.id && data.participantIds) {
        setIsJoined(data.participantIds.includes(user.id));
      }
    } catch (err: any) {
      setError(err.message || t("events.detailLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
  }, [selectedEventId, user?.id]);

  const handleJoinToggle = async () => {
    if (!event || joinPending) return;
    setJoinPending(true);
    setJoinError("");
    try {
      if (isJoined) {
        await leaveEvent(event.id);
      } else {
        await joinEvent(event.id);
      }
      const updated = await getEventById(event.id);
      setEvent(updated);
      if (updated.participantIds) setIsJoined(updated.participantIds.includes(user.id));
    } catch (err: any) {
      console.error(err);
      setJoinError(err?.message || t("events.joinError"));
    } finally {
      setJoinPending(false);
    }
  };

  const handleDelete = async () => {
    if (!event || deletePending) return;
    if (!window.confirm(t("events.deleteConfirm"))) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      await deleteEvent(event.id);
      setPage("eventi");
    } catch (err: any) {
      setDeleteError(err?.message || t("events.deleteError"));
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("events.detailLoading")}
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
          <div className="revamp-status-pill danger" style={{ justifyContent: "center", marginBottom: 20 }}>
            <Icon name="warn" size={14} /> {error || t("events.notFound")}
          </div>
          <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("eventi")}>
            {t("events.backToEvents")}
          </button>
        </div>
      </div>
    );
  }

  const cat = event.category || "musica";
  const limit = event.maxPartecipanti || 100;
  const count = event.participantCount || 0;
  const pct = Math.min(100, Math.round((count / limit) * 100));
  const whenLabel = formatWhen(event.dateTime || event.createdAt, i18n.language);

  return (
    <div className="revamp-detail-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-detail-wrap">
        <div className="revamp-detail-card anim-in" style={{ "--accent": "var(--magenta)" } as React.CSSProperties}>
          <div className="revamp-detail-cover" style={{ "--dcg": grads[cat] || grads.musica } as React.CSSProperties}>
            <button className="back-btn" onClick={() => setPage("eventi")}>
              <Icon name="chevronL" size={14} /> {t("events.backToEvents")}
            </button>
            <div className="cover-badge">
              <Icon name="music" size={12} /> {cat}
            </div>
            <div className="ghost-ic">
              <Icon name="music" size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <h1 className="revamp-detail-title">{event.title}</h1>
            <div className="revamp-detail-rating" style={{ color: "var(--magenta)" }}>
              {event.isCertified ? (
                <>
                  <Icon name="shieldCheck" size={14} style={{ color: "var(--teal)", marginRight: 4 }} /> {t("events.certifiedEvent")}
                </>
              ) : (
                <>
                  <span className="led live green"></span> {t("events.inTrento")}
                </>
              )}
            </div>

            <div className="revamp-detail-desc" style={{ marginTop: 12 }}>
              {event.description}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="clock" size={12} /> {t("events.when")}</div>
                <div className="val" style={{ fontSize: 13 }}>
                  {whenLabel || t("events.today")}
                </div>
              </div>
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="pin" size={12} /> {t("events.place")}</div>
                <div className="val" style={{ fontSize: 13 }}>
                  <GeocodedLocation value={event.location} fallback="Trento" />
                </div>
              </div>
            </div>

            <div className="revamp-detail-section-title">{t("events.participation")}</div>
            <div className="revamp-detail-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t("events.seatsTaken")}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}
                    dangerouslySetInnerHTML={{ __html: t("events.seatsOf", { count, limit }) }} />
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--magenta)" }}>
                  {pct}%
                </div>
              </div>
              <div className="np-bar" style={{ height: 6, marginBottom: 16 }}>
                <i style={{ width: pct + "%", background: "var(--magenta)", boxShadow: "0 0 8px var(--magenta)" }}></i>
              </div>
              {isJoined && (
                <span className="revamp-status-pill success" style={{ marginBottom: 14 }}>
                  <Icon name="check" size={11} /> {t("events.youParticipate")}
                </span>
              )}
              {joinError && (
                <div className="revamp-status-pill danger" role="alert" style={{ marginBottom: 14 }}>
                  <Icon name="warn" size={11} /> {joinError}
                </div>
              )}
              {user?.role === "registered_user" && (
                <button
                  className={"revamp-form-btn" + (isJoined ? " joined" : "")}
                  style={{ "--accent": "var(--magenta)", opacity: joinPending ? 0.6 : 1 } as React.CSSProperties}
                  onClick={handleJoinToggle}
                  disabled={joinPending}
                >
                  {joinPending ? t("events.joining") : isJoined ? t("events.cancelJoin") : t("events.joinCta")}
                </button>
              )}
              <ContentActions
                kind="event"
                id={event.id}
                title={event.title}
                startIso={event.dateTime}
                location={event.location}
                accent="var(--magenta)"
                userRole={user?.role}
                onRequireLogin={() => setPage("login")}
              />
              {user?.role === "certified_entity" && user?.id && event.entity?.id === user.id && (
                <div style={{ marginTop: 12 }}>
                  {deleteError && (
                    <div className="revamp-status-pill danger" style={{ marginBottom: 8 }}>
                      <Icon name="warn" size={11} /> {deleteError}
                    </div>
                  )}
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
                    <Icon name="x" size={14} /> {deletePending ? t("events.deletingEvent") : t("events.deleteEvent")}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
