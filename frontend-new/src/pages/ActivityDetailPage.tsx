import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { CommentsSection } from "../components/redesign/CommentsSection";
import { getActivityById, joinActivity, leaveActivity, ApiActivity } from "../lib/api";

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

export function ActivityDetailPage({ page, setPage, theme, setTheme, user, selectedActivityId }: any) {
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);

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
    if (!activity) return;
    if (user?.role === "anonymous") {
      setPage("login");
      return;
    }
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
    } catch (err: any) {
      console.error(err);
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

  const cat = activity.category || "outdoor";
  const limit = activity.maxParticipants || 15;
  const count = activity.participantCount || 0;
  const pct = Math.min(100, Math.round((count / limit) * 100));

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
              <Icon name="bike" size={12} /> {cat}
            </div>
            <div className="ghost-ic">
              <Icon name="bike" size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <h1 className="revamp-detail-title">{activity.title}</h1>
            <div className="revamp-detail-rating">
              <Icon name="star" size={14} /> 4.7{" "}
              <span>· recensioni verificate</span>
            </div>
            
            <div className="revamp-detail-desc">
              {activity.description || "Nessuna descrizione."}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="clock" size={12} /> Durata</div>
                <div className="val">90 min</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="gauge" size={12} /> Difficoltà</div>
                <div className="val">Media</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="euro" size={12} /> Costo</div>
                <div className="val" style={{ color: "var(--green)" }}>Gratis</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="pin" size={12} /> Distanza</div>
                <div className="val">1.2 km</div>
              </div>
            </div>

            <div className="revamp-detail-section-title">Prenotazioni & Affollamento</div>
            <div className="revamp-detail-box" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Stato Posti</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Partecipanti attivi: <b>{count}</b> su <b>{limit}</b> massimi ({pct}% occupato).
                </div>
              </div>
              <button
                className={"revamp-form-btn" + (isJoined ? " joined" : "")}
                style={{ width: "auto", padding: "0 20px", "--accent": "var(--teal)" } as React.CSSProperties}
                onClick={handleJoinToggle}
              >
                {isJoined ? "Annulla Prenotazione" : "Prenota Attività"}
              </button>
            </div>

            <div className="revamp-detail-section-title">Valutazioni di Dettaglio</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="rev-line">
                <span className="rl-lbl">Accuratezza</span>
                <span className="rl-bar"><i style={{ width: "90%", "--accent": "var(--teal)" } as React.CSSProperties}></i></span>
                <span className="rl-val">4.5</span>
              </div>
              <div className="rev-line">
                <span className="rl-lbl">Organizzazione</span>
                <span className="rl-bar"><i style={{ width: "94%", "--accent": "var(--teal)" } as React.CSSProperties}></i></span>
                <span className="rl-val">4.7</span>
              </div>
              <div className="rev-line">
                <span className="rl-lbl">Sicurezza</span>
                <span className="rl-bar"><i style={{ width: "98%", "--accent": "var(--teal)" } as React.CSSProperties}></i></span>
                <span className="rl-val">4.9</span>
              </div>
            </div>

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
