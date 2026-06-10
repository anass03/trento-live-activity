import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { CommentsSection } from "../components/redesign/CommentsSection";

export function EventDetailPage({ page, setPage, theme, setTheme, user }: any) {
  // Mock event detail
  const e = {
    id: "e1",
    cat: "musica",
    title: "Live Music in Piazza",
    desc: "Una splendida serata di musica live nel cuore di Trento. Le migliori band locali ed ospiti d'eccezione si alterneranno sul palco allestito in Piazza Duomo, circondati dalla splendida cornice storica della cattedrale e delle fontane.",
    place: "Piazza Duomo, Trento",
    when: "Oggi, 16 Maggio · 19:00 – 23:00",
    going: 312,
    cap: 400,
  };

  const grads: Record<string, string> = {
    musica: "linear-gradient(140deg,#db2777,#831843)",
    cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  };

  return (
    <div className="revamp-detail-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-detail-wrap">
        <div className="revamp-detail-card anim-in" style={{ "--accent": "var(--magenta)" }}>
          <div className="revamp-detail-cover" style={{ "--dcg": grads[e.cat] || grads.musica }}>
            <button className="back-btn" onClick={() => setPage("eventi")}>
              <Icon name="chevronL" size={14} /> Torna agli Eventi
            </button>
            <div className="cover-badge">
              <Icon name="music" size={12} /> {e.cat}
            </div>
            <div className="ghost-ic">
              <Icon name="music" size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <h1 className="revamp-detail-title">{e.title}</h1>
            <div className="revamp-detail-rating" style={{ color: "var(--magenta)" }}>
              <span className="led live green"></span> Live ora a Trento
            </div>

            <div className="revamp-detail-desc" style={{ marginTop: 12 }}>
              {e.desc}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="clock" size={12} /> Quando</div>
                <div className="val" style={{ fontSize: 13 }}>{e.when}</div>
              </div>
              <div className="revamp-detail-attr" style={{ gridColumn: "span 2" }}>
                <div className="lbl"><Icon name="pin" size={12} /> Luogo</div>
                <div className="val" style={{ fontSize: 13 }}>{e.place}</div>
              </div>
            </div>

            <div className="revamp-detail-section-title">Partecipazione & Biglietti</div>
            <div className="revamp-detail-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Flusso di Affluenza</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>
                    Ci sono <b>{e.going}</b> persone registrate. Limite massimo: <b>{e.cap}</b>.
                  </div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--magenta)" }}>
                  {Math.round((e.going / e.cap) * 100)}%
                </div>
              </div>
              <div className="np-bar" style={{ height: 6, marginBottom: 20 }}>
                <i style={{ width: (e.going / e.cap * 100) + "%", background: "var(--magenta)", boxShadow: "0 0 8px var(--magenta)" }}></i>
              </div>
              <button className="revamp-form-btn" style={{ "--accent": "var(--magenta)" }}>
                Ottieni Biglietto Ingresso <Icon name="ticket" size={16} />
              </button>
            </div>

            <div className="revamp-detail-section-title" style={{ marginTop: 28 }}>Discussione & Commenti</div>
            <div className="revamp-detail-box">
              <CommentsSection accent="var(--magenta)" user={user} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
