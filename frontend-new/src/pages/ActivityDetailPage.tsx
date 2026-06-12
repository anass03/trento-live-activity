import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { CommentsSection } from "../components/redesign/CommentsSection";
import { getActivityById, joinActivity, leaveActivity, ApiActivity } from "../lib/api";
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

export function ActivityDetailPage({ page, setPage, theme, setTheme, user, selectedActivityId }: any) {
  const { t } = useTranslation();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState("");

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
    if (!user?.id || user?.role === "anonymous") {
      setPage("login");
      return;
    }
    setJoinPending(true);
    setJoinError("");
    try {
      if (isJoined) {
        await leaveActivity(activity.id);
        setIsJoined(false);
      } else {
        await joinActivity(activity.id);
        setIsJoined(true);
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

  const cat = normalizeCat(activity.category);
  const limit = Number.isFinite(Number(activity.maxParticipants)) ? Number(activity.maxParticipants) : null;
  const count = Number(activity.participantCount || 0);
  const pct = limit ? Math.min(100, Math.round((count / limit) * 100)) : null;
  const details: any = activity;
  const rating = details.averageRating ?? details.rating ?? null;
  const reviewCount = details.reviewCount ?? details.reviewsCount ?? 0;
  const duration = details.durationMinutes ?? details.duration ?? null;
  const difficulty = details.difficulty ?? null;
  const price = details.priceLabel || (details.priceType === "PAID" ? "A pagamento" : details.priceType === "FREE" ? "Gratis" : null);
  const distance = details.distance != null ? `${details.distance} km` : null;

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
            <div className="revamp-detail-rating">
              <Icon name="star" size={14} /> {rating != null ? rating.toFixed ? rating.toFixed(1) : rating : "N/D"}{" "}
              <span>- {reviewCount} recensioni</span>
            </div>
            
            <div className="revamp-detail-desc">
              {activity.description || "Informazioni dettagliate non ancora disponibili."}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="clock" size={12} /> Durata</div>
                <div className="val">{duration ? `${duration} min` : "N/D"}</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="gauge" size={12} /> Difficoltà</div>
                <div className="val">{difficulty || "N/D"}</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="euro" size={12} /> Costo</div>
                <div className="val" style={{ color: price === "Gratis" ? "var(--green)" : undefined }}>{price || "N/D"}</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="pin" size={12} /> Distanza</div>
                <div className="val">{distance || "N/D"}</div>
              </div>
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
                {isJoined && (
                  <span className="revamp-status-pill success" style={{ marginTop: 10 }}>
                    <Icon name="check" size={11} /> {t("activities.joinedPill")}
                  </span>
                )}
                {joinError && (
                  <div className="revamp-status-pill danger" role="alert" style={{ marginTop: 10 }}>
                    <Icon name="warn" size={11} /> {joinError}
                  </div>
                )}
              </div>
              {/* Solo i cittadini partecipano (il backend nega agli altri ruoli) */}
              {(user?.role === "registered_user" || user?.role === "anonymous") && (
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
                  startIso={(activity as any).dateTime || null}
                  location={(activity as any).location || (activity as any).indirizzo || null}
                  accent="var(--teal)"
                  userRole={user?.role}
                  onRequireLogin={() => setPage("login")}
                />
              </div>
            </div>

            <div className="revamp-detail-section-title">Valutazioni di Dettaglio</div>
            {reviewCount > 0 ? (
              <div className="revamp-detail-box">Valutazioni aggregate disponibili nella sezione recensioni.</div>
            ) : (
              <div className="widget-empty big">Nessuna valutazione disponibile.</div>
            )}

            <div className="revamp-detail-section-title" style={{ marginTop: 28 }}>Discussione & Commenti</div>
            <div className="revamp-detail-box">
              <CommentsSection accent="var(--teal)" user={user} activityId={activity.id} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
