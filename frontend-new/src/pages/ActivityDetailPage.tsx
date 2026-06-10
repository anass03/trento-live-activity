import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";

export function ActivityDetailPage({ page, setPage, theme, setTheme, user }: any) {
  // Mock detailed activity (equivalent to Sardagna trip)
  const a = {
    id: "a1",
    cat: "outdoor",
    subtype: "Vista panoramica",
    title: "Passeggiata panoramica a Sardagna",
    dur: 90,
    diff: "medium",
    priceLabel: "Gratis",
    loc: "Funivia Sardagna, Trento",
    dist: 1.2,
    rating: 4.7,
    reviews: 38,
    going: 3,
    cap: 10,
    desc: "Una camminata leggera lungo i sentieri collinari di Sardagna con vista panoramica sulla città di Trento e sulla Valle dell'Adige. Adatta a chi cerca un contatto immediato con la natura e scorci suggestivi senza allontanarsi troppo dal centro cittadino.",
    safety: 4.9,
    accuracy: 4.6,
    organization: 4.8,
  };

  const grads: Record<string, string> = {
    outdoor: "linear-gradient(140deg,#0d9488,#134e4a)",
    cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  };

  return (
    <div className="revamp-detail-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-detail-wrap">
        <div className="revamp-detail-card anim-in" style={{ "--accent": "var(--teal)" }}>
          <div className="revamp-detail-cover" style={{ "--dcg": grads[a.cat] || grads.outdoor }}>
            <button className="back-btn" onClick={() => setPage("attivita")}>
              <Icon name="chevronL" size={14} /> Torna alle Attività
            </button>
            <div className="cover-badge">
              <Icon name="bike" size={12} /> {a.cat} · {a.subtype}
            </div>
            <div className="ghost-ic">
              <Icon name="bike" size={180} />
            </div>
          </div>

          <div className="revamp-detail-body">
            <h1 className="revamp-detail-title">{a.title}</h1>
            <div className="revamp-detail-rating">
              <Icon name="star" size={14} /> {a.rating}{" "}
              <span>· {a.reviews} recensioni verificate</span>
            </div>
            
            <div className="revamp-detail-desc">
              {a.desc}
            </div>

            <div className="revamp-detail-attrs">
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="clock" size={12} /> Durata</div>
                <div className="val">{a.dur} min</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="gauge" size={12} /> Difficoltà</div>
                <div className="val">Media</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="euro" size={12} /> Costo</div>
                <div className="val" style={{ color: "var(--green)" }}>{a.priceLabel}</div>
              </div>
              <div className="revamp-detail-attr">
                <div className="lbl"><Icon name="pin" size={12} /> Distanza</div>
                <div className="val">{a.dist} km</div>
              </div>
            </div>

            <div className="revamp-detail-section-title">Prenotazioni & Affollamento</div>
            <div className="revamp-detail-box" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Stato Posti</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Partecipanti attivi: <b>{a.going}</b> su <b>{a.cap}</b> massimi.
                </div>
              </div>
              <button className="revamp-form-btn" style={{ width: "auto", padding: "0 20px", "--accent": "var(--teal)" }}>
                Prenota Attività
              </button>
            </div>

            <div className="revamp-detail-section-title">Valutazioni di Dettaglio</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="rev-line">
                <span className="rl-lbl">Accuratezza</span>
                <span className="rl-bar"><i style={{ width: (a.accuracy / 5 * 100) + "%", "--accent": "var(--teal)" }}></i></span>
                <span className="rl-val">{a.accuracy.toFixed(1)}</span>
              </div>
              <div className="rev-line">
                <span className="rl-lbl">Organizzazione</span>
                <span className="rl-bar"><i style={{ width: (a.organization / 5 * 100) + "%", "--accent": "var(--teal)" }}></i></span>
                <span className="rl-val">{a.organization.toFixed(1)}</span>
              </div>
              <div className="rev-line">
                <span className="rl-lbl">Sicurezza</span>
                <span className="rl-bar"><i style={{ width: (a.safety / 5 * 100) + "%", "--accent": "var(--teal)" }}></i></span>
                <span className="rl-val">{a.safety.toFixed(1)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
