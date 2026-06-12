import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { CommentsSection } from "../components/redesign/CommentsSection";
import { getEventById, joinEvent, leaveEvent, ApiEvent } from "../lib/api";
import { ContentActions } from "../components/ui/ContentActions";

const grads: Record<string, string> = {
  musica: "linear-gradient(140deg,#db2777,#831843)",
  cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  cibo: "linear-gradient(140deg,#d97706,#7c2d12)",
  outdoor: "linear-gradient(140deg,#0d9488,#134e4a)",
  sport: "linear-gradient(140deg,#059669,#064e3b)",
  famiglia: "linear-gradient(140deg,#0ea5e9,#075985)",
};

export function EventDetailPage({ page, setPage, theme, setTheme, user, selectedEventId }: any) {
  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  const fetchEventDetail = async () => {
    if (!selectedEventId) {
      setError("Nessun evento selezionato.");
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
      setError(err.message || "Errore durante il caricamento dell'evento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetail();
  }, [selectedEventId, user?.id]);

  const handleJoinToggle = async () => {
    if (!event) return;
    if (user?.role === "anonymous") {
      setPage("login");
      return;
    }
    try {
      if (isJoined) {
        await leaveEvent(event.id);
        setIsJoined(false);
      } else {
        await joinEvent(event.id);
        setIsJoined(true);
      }
      // Reload details to get fresh participants count
      const updated = await getEventById(event.id);
      setEvent(updated);
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="revamp-detail-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento dettagli evento...
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
            <Icon name="warn" size={14} /> {error || "Evento non trovato."}
          </div>
          <button className="revamp-form-btn" style={{ "--accent": "var(--cyan)" } as React.CSSProperties} onClick={() => setPage("eventi")}>
            Torna agli Eventi
          </button>
        </div>
      </div>
    );
  }

  const cat = event.category || "musica";
  const limit = event.maxPartecipanti || 100;
  const count = event.participantCount || 0;
  const pct = Math.min(100, Math.round((count / limit) * 100));

  return (
    <div className="revamp-detail-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-detail-wrap">
        <div className="revamp-detail-card anim-in" style={{ "--accent": "var(--magenta)" } as React.CSSProperties}>
          <div className="revamp-detail-cover" style={{ "--dcg": grads[cat] || grads.musica } as React.CSSProperties}>
            <button className="back-btn" onClick={() => setPage("eventi")}>
              <Icon name="chevronL" size={14} /> Torna agli Eventi
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
                  <Icon name="shieldCheck" size={14} style={{ color: "var(--teal)", marginRight: 4 }} /> Evento Certificato
                </>
              ) : (
                <>
                  <span className="led live green"></span> Evento a Trento
                </>
              )}
            </div>

            <div className="revamp-detail-desc" style={{ marginTop: 12 }}>
              {event.description}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="clock" size={12} /> Quando</div>
                <div className="val" style={{ fontSize: 13 }}>{event.dateTime || event.createdAt || "Oggi"}</div>
              </div>
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="pin" size={12} /> Luogo</div>
                <div className="val" style={{ fontSize: 13 }}>{event.location || "Trento"}</div>
              </div>
            </div>

            <div className="revamp-detail-section-title">Partecipazione</div>
            <div className="revamp-detail-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Posti occupati</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3 }}>
                    <b>{count}</b> di <b>{limit}</b> posti occupati
                  </div>
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
                  <Icon name="check" size={11} /> Partecipi a questo evento
                </span>
              )}
              <button
                className={"revamp-form-btn" + (isJoined ? " joined" : "")}
                style={{ "--accent": "var(--magenta)" } as React.CSSProperties}
                onClick={handleJoinToggle}
              >
                {isJoined ? "Annulla partecipazione" : "Partecipa all'evento"}
              </button>
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
            </div>

            <div className="revamp-detail-section-title" style={{ marginTop: 28 }}>Discussione & Commenti</div>
            <div className="revamp-detail-box">
              <CommentsSection accent="var(--magenta)" user={user} eventId={event.id} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
