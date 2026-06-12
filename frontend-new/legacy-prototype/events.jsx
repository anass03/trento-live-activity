/* ===========================================================
   Trento Live Activity — EVENTI page
   A social event-discovery feed. Shares Header, theme tokens,
   glass <Widget> shell, icons and category colours with home.
   window.EventsPage
   =========================================================== */

/* ---- gradient "media" per category (matches home thumbnails) ---- */
const EV_GRAD = {
  musica:   "linear-gradient(140deg,#db2777,#831843)",
  cultura:  "linear-gradient(140deg,#7c3aed,#4c1d95)",
  cibo:     "linear-gradient(140deg,#d97706,#7c2d12)",
  outdoor:  "linear-gradient(140deg,#0d9488,#134e4a)",
  sport:    "linear-gradient(140deg,#059669,#064e3b)",
  famiglia: "linear-gradient(140deg,#0ea5e9,#075985)",
};

/* ---- avatar pool (initials + gradient) ---- */
const AV = [
  { i: "GR", g: "linear-gradient(150deg,#2563eb,#7c3aed)" },
  { i: "SM", g: "linear-gradient(150deg,#db2777,#9d174d)" },
  { i: "LF", g: "linear-gradient(150deg,#0d9488,#0e7490)" },
  { i: "AB", g: "linear-gradient(150deg,#d97706,#b45309)" },
  { i: "MC", g: "linear-gradient(150deg,#059669,#047857)" },
  { i: "ET", g: "linear-gradient(150deg,#8b5cf6,#6d28d9)" },
];

/* ---- the event dataset for this page ---- */
const EV_FEED = [
  {
    id: "f1", cat: "musica", rail: "LIVE", live: true, featured: true,
    title: "Live Music in Piazza",
    desc: "Una serata di grande musica live nel cuore di Trento con le migliori band locali e ospiti speciali.",
    place: "Piazza Duomo, Trento", when: "Oggi, 16 Maggio · 19:00 – 23:00",
    going: 312, cap: 400, likes: 212, comments: 34, avatars: [0, 1, 4, 5],
  },
  {
    id: "f2", cat: "cibo", rail: "18:30",
    title: "Trento Food Festival",
    desc: "Street food, prodotti tipici e chef stellati per un viaggio di sapori indimenticabile lungo tre giorni.",
    place: "Piazza Fiera, Trento", when: "17 – 19 Maggio · 12:00 – 23:00",
    going: 189, cap: 300, likes: 156, comments: 28, avatars: [3, 2, 0],
  },
  {
    id: "f3", cat: "outdoor", rail: "17:45",
    title: "Tramonto in Valle dell'Adige",
    desc: "Escursione serale con guida naturalistica e aperitivo con vista mozzafiato sulla valle.",
    place: "Parco dell'Adige, Trento", when: "17 Maggio · 18:30 – 22:00",
    going: 24, cap: 40, likes: 89, comments: 11, avatars: [4, 2],
  },
  {
    id: "f4", cat: "cultura", rail: "15:20",
    title: "Cinema sotto le Stelle",
    desc: "Proiezione di film cult all'aperto nella magica atmosfera del Castello del Buonconsiglio.",
    place: "Castello del Buonconsiglio", when: "18 Maggio · 21:00",
    going: 57, cap: 120, likes: 73, comments: 9, avatars: [5, 1, 3],
  },
  {
    id: "f5", cat: "musica", rail: "Ieri",
    title: "DJ Set al Muse — Night Vibes",
    desc: "Ritmi elettronici e visual immersivi per una notte indimenticabile sul rooftop del Muse.",
    place: "Muse — Rooftop", when: "18 Maggio · 23:00 – 03:00",
    going: 142, cap: 220, likes: 118, comments: 16, avatars: [1, 5, 0, 4],
  },
];

const EV_NEXT = {
  id: "nx", cat: "cibo", title: "Aperitivo sotto le Stelle",
  desc: "Cocktail d'autore e musica soul al tramonto, nel salotto buono di Trento.",
  place: "Via Belenzani, Trento", when: "Oggi, 16 Maggio · 19:00",
  going: 1, cap: 22, avatars: [0, 3],
};

const EV_CITY = [
  { id: "c1", title: "Museo di Notte",      time: "18:00", cat: "cultura",  live: false },
  { id: "c2", title: "Yoga al Parco",       time: "07:30", cat: "outdoor",  live: false },
  { id: "c3", title: "Beer Tasting",        time: "20:00", cat: "cibo",     live: true  },
  { id: "c4", title: "Basket Night",        time: "21:00", cat: "sport",    live: true  },
  { id: "c5", title: "Art Live Painting",   time: "19:30", cat: "cultura",  live: true  },
  { id: "c6", title: "Concerto Classico",   time: "20:45", cat: "musica",   live: false },
  { id: "c7", title: "Mercatino Vintage",   time: "10:00", cat: "cultura",  live: false },
  { id: "c8", title: "Corsa al Castello",   time: "09:30", cat: "sport",    live: false },
  { id: "c9", title: "Serata Latina",       time: "22:30", cat: "musica",   live: true  },
];

const EV_TREND = [
  { id: "f1", title: "Live Music in Piazza",      loc: "Piazza Duomo",   n: 312 },
  { id: "nx", title: "Aperitivo sotto le Stelle", loc: "Via Belenzani",  n: 189 },
  { id: "f5", title: "DJ Set al Muse",            loc: "Muse — Rooftop", n: 156 },
];

const EV_FILTERS = [
  { id: "all",      label: "Tutti gli eventi", count: 128, color: "var(--cyan)",    icon: "grid" },
  { id: "musica",   label: "Musica",           count: 42,  color: "var(--magenta)", icon: "music" },
  { id: "cultura",  label: "Cultura",          count: 29,  color: "var(--violet)",  icon: "landmark" },
  { id: "cibo",     label: "Food & Drink",     count: 20,  color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  label: "Outdoor",          count: 18,  color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", label: "Famiglia",         count: 12,  color: "var(--cyan)",    icon: "family" },
  { id: "sport",    label: "Sport",            count: 7,   color: "var(--green)",   icon: "run" },
];

/* lookup map: id -> full event-ish object for the detail modal */
const EV_BY_ID = (() => {
  const m = {};
  EV_FEED.forEach((e) => (m[e.id] = e));
  m[EV_NEXT.id] = EV_NEXT;
  EV_CITY.forEach((e) => (m[e.id] = { ...e, place: "Trento", when: `Oggi · ${e.time}`, cap: 60, going: Math.round(20 + Math.random() * 30), desc: "Un appuntamento da vivere nel cuore della città." }));
  return m;
})();

const fmt = (n) => n.toLocaleString("it-IT");

/* ===================== AVATAR STACK ===================== */
function Avatars({ ids, extra }) {
  return (
    <div className="attendees">
      {ids.map((idx, k) => (
        <div className="av" key={k} style={{ background: AV[idx].g }}>{AV[idx].i}</div>
      ))}
      {extra > 0 && <div className="more">+{extra}</div>}
    </div>
  );
}

/* ===================== MINI CALENDAR ===================== */
function MiniCalendar() {
  const onMove = useGlow();
  const [sel, setSel] = useState(16);
  const days = [13, 14, 15, 16, 17, 18, 19];
  const dows = ["L", "M", "M", "G", "V", "S", "D"];
  const hasEvent = { 16: true, 17: true, 18: true };
  return (
    <div className="widget anim-in" style={{ "--accent": "var(--violet)", animationDelay: "60ms" }} onMouseMove={onMove}>
      <div className="widget-inner">
        <div className="cal-head">
          <div className="cal-month">Maggio 2024</div>
          <div className="cal-nav">
            <button aria-label="Settimana precedente" onClick={() => setSel((d) => Math.max(13, d - 1))}><Icon name="chevronL" size={14} /></button>
            <button aria-label="Settimana successiva" onClick={() => setSel((d) => Math.min(19, d + 1))}><Icon name="chevron" size={14} /></button>
          </div>
        </div>
        <div className="cal-grid">
          {dows.map((d, i) => <div className="cal-dow" key={"d" + i}>{d}</div>)}
          {days.map((d) => (
            <button key={d} className={"cal-day" + (d === sel ? " sel" : "")} onClick={() => setSel(d)}>
              {d}
              {hasEvent[d] && <span className="dot"></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== QUICK FILTERS ===================== */
function QuickFilters({ active, setActive }) {
  return (
    <Widget title="Filtri rapidi" accent="var(--cyan)" delay={140}>
      <div className="qf-list">
        {EV_FILTERS.map((f) => (
          <button key={f.id} className={"qf-item" + (active === f.id ? " active" : "")}
            style={{ "--qc": f.color }} onClick={() => setActive(f.id)}>
            <span className="qf-ic"><Icon name={f.icon} size={16} /></span>
            <span className="qf-label">{f.label}</span>
            <span className="qf-count">{f.count}</span>
          </button>
        ))}
      </div>
    </Widget>
  );
}

/* ===================== TRENDING TONIGHT ===================== */
function TrendingTonight({ onPick }) {
  return (
    <Widget title="Trending tonight" accent="var(--magenta)" upd="Live" delay={220}>
      {EV_TREND.map((t, i) => (
        <button className="trend-row" key={t.id} onClick={() => onPick(t.id)}>
          <span className="trend-rank">{i + 1}</span>
          <span className="trend-body">
            <span className="trend-title">{t.title}</span>
            <span className="trend-loc">{t.loc}</span>
          </span>
          <span className="trend-count"><Icon name="flame" size={13} />{fmt(t.n)}</span>
        </button>
      ))}
    </Widget>
  );
}

/* ===================== LIVE NOW ===================== */
function LiveNow() {
  const bars = [0.5, 0.85, 0.35, 1, 0.6, 0.9, 0.45];
  return (
    <Widget title="Live ora a Trento" accent="var(--green)" upd="In diretta" delay={300}>
      <div className="live-now">
        <div className="live-num">
          <b>23</b>
          <span>Eventi in corso</span>
        </div>
        <div className="eq" aria-hidden="true">
          {bars.map((b, i) => <i key={i} style={{ animationDelay: `${i * 0.13}s`, animationDuration: `${1.1 + b * 0.7}s` }}></i>)}
        </div>
      </div>
    </Widget>
  );
}

/* ===================== COMPOSER / DISCOVERY ===================== */
function Composer() {
  return (
    <div className="composer">
      <div className="avatar">MR</div>
      <div className="composer-field">
        <Icon name="search" size={17} />
        Cerca o scopri eventi per stasera…
      </div>
      <div className="composer-chips">
        <button className="composer-chip"><Icon name="flame" size={15} /><span>Stasera</span></button>
        <button className="composer-chip"><Icon name="calendar" size={15} /><span>Weekend</span></button>
        <button className="composer-chip"><Icon name="pin" size={15} /><span>Vicino a te</span></button>
      </div>
    </div>
  );
}

/* ===================== EVENT POST CARD ===================== */
function PostCard({ e, liked, saved, onLike, onSave, onOpen, flash }) {
  const onMove = useGlow();
  const color = window.TLA.catColor(e.cat);
  const catLabel = window.TLA.catLabel(e.cat);
  const likes = e.likes + (liked ? 1 : 0);
  const extra = Math.max(0, e.going - e.avatars.length);
  const stop = (fn) => (ev) => { ev.stopPropagation(); fn(); };
  return (
    <div className={"post" + (flash ? " flash" : "")} data-post={e.id}
      style={{ "--pc": color, "--pimg": EV_GRAD[e.cat], "--mx": "50%", "--my": "0%" }}
      onMouseMove={onMove} onClick={() => onOpen(e.id)}>
      <div className="post-media">
        {e.live
          ? <span className="pm-live"><span className="led live green"></span>Live ora</span>
          : <span className="pm-tag"><Icon name={CAT_ICON[e.cat]} size={12} />{catLabel}</span>}
        {e.featured && <span className="pm-feat"><Icon name="star" size={11} />In evidenza</span>}
        <span className="pm-ghost"><Icon name={CAT_ICON[e.cat]} size={116} /></span>
      </div>
      <div className="post-content">
        <div className="post-cat"><span className="pc-ic" style={{ color }}><Icon name={CAT_ICON[e.cat]} size={12} /></span>{catLabel}</div>
        <div className="post-title">{e.title}</div>
        <div className="post-desc">{e.desc}</div>
        <div className="post-meta">
          <span className="pm"><Icon name="pin" size={14} />{e.place}</span>
          <span className="pm"><Icon name="clock" size={14} />{e.when}</span>
        </div>
        <div className="post-foot">
          <Avatars ids={e.avatars} extra={extra} />
          <span className="attend-count"><b>{fmt(e.going)}</b> partecipanti</span>
          <div className="post-actions">
            <button className={"act-btn" + (liked ? " on" : "")} onClick={stop(() => onLike(e.id))} aria-label="Mi interessa">
              <Icon name="heart" size={17} />{fmt(likes)}
            </button>
            <button className="act-btn" onClick={stop(() => onOpen(e.id))} aria-label="Commenti">
              <Icon name="comment" size={17} />{e.comments}
            </button>
            <button className="act-btn icon-only" onClick={stop(() => {})} aria-label="Condividi"><Icon name="share" size={17} /></button>
            <button className={"act-btn save icon-only" + (saved ? " on" : "")} onClick={stop(() => onSave(e.id))} aria-label="Salva"><Icon name="bookmark" size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== FEED ===================== */
const Feed = React.forwardRef(function Feed({ filter, likes, saves, onLike, onSave, onOpen, flashId }, ref) {
  const list = filter === "all" ? EV_FEED : EV_FEED.filter((e) => e.cat === filter);
  return (
    <div className="ev-col feed" ref={ref}>
      <Composer />
      {list.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 8px", textAlign: "center" }}>
          Nessun evento in questa categoria stasera.
        </div>
      )}
      {list.map((e) => (
        <div className="feed-row" key={e.id}>
          <div className="tl">
            <span className={"tl-node" + (e.live ? " live" : "")} style={{ "--tc": window.TLA.catColor(e.cat) }}></span>
            <span className={"tl-label" + (e.live ? " live" : "")}>{e.rail}</span>
          </div>
          <div className="feed-body">
            <PostCard e={e} liked={!!likes[e.id]} saved={!!saves[e.id]}
              onLike={onLike} onSave={onSave} onOpen={onOpen} flash={flashId === e.id} />
          </div>
        </div>
      ))}
    </div>
  );
});

/* ===================== NEXT ACTIVITY ===================== */
function Countdown({ start }) {
  const [s, setS] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  if (s <= 0) return <span>Live ora</span>;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span>{mm}:{ss}</span>;
}

function NextActivity({ joined, saved, onJoin, onSave }) {
  const e = EV_NEXT;
  const pct = Math.round((e.going / e.cap) * 100);
  return (
    <Widget title="Prossima attività" accent="var(--accent)" upd="In arrivo" delay={120}>
      <div className="next-media" style={{ "--nimg": EV_GRAD[e.cat] }}>
        <span className="nm-count">
          <span className="led live green"></span>
          <span><span className="lbl">LIVE TRA</span><br /><Countdown start={45 * 60} /></span>
        </span>
        <span className="nm-ghost"><Icon name={CAT_ICON[e.cat]} size={96} /></span>
      </div>
      <div className="next-title">{e.title}</div>
      <div className="next-fields">
        <div className="next-field">
          <span className="nf-ic"><Icon name="pin" size={14} /></span>
          <div><div className="nf-lbl">Luogo</div><div className="nf-val">{e.place}</div></div>
        </div>
        <div className="next-field">
          <span className="nf-ic"><Icon name="clock" size={14} /></span>
          <div><div className="nf-lbl">Quando</div><div className="nf-val">{e.when}</div></div>
        </div>
      </div>
      <div className="next-part">
        <div className="np-l">
          <div className="nf-lbl">Partecipanti</div>
          <div className="np-bar"><i style={{ width: Math.max(8, pct) + "%" }}></i></div>
        </div>
        <div className="np-n"><b>{joined ? e.going + 1 : e.going}</b> / {e.cap}</div>
      </div>
      <div className="next-cta-row">
        <button className={"next-cta" + (joined ? " joined" : "")} onClick={onJoin}>
          <Icon name={joined ? "ticket" : "ticket"} size={17} />{joined ? "Partecipi!" : "Partecipa all'evento"}
        </button>
        <button className={"next-save" + (saved ? " on" : "")} onClick={onSave} aria-label="Salva evento"><Icon name="bookmark" size={19} /></button>
      </div>
    </Widget>
  );
}

/* ===================== CITY EVENTS GRID ===================== */
function CityGrid({ onOpen }) {
  return (
    <Widget title="Tutti gli eventi in città" accent="var(--teal)" upd={EV_CITY.length + " oggi"} delay={220}
      style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" }}>
      <div className="city-grid">
        {EV_CITY.map((e) => {
          const color = window.TLA.catColor(e.cat);
          return (
            <button className="mini" key={e.id} style={{ "--mc": color, "--mimg": EV_GRAD[e.cat] }} onClick={() => onOpen(e.id)}>
              <div className="mini-media">
                <span className="mled" style={{ animation: e.live ? "ledPulse 2.6s ease-in-out infinite" : "none" }}></span>
                <span className="pm-ghost" style={{ right: -8, bottom: -10 }}><Icon name={CAT_ICON[e.cat]} size={52} /></span>
              </div>
              <div className="mini-body">
                <div className="mini-time">{e.time}</div>
                <div className="mini-title">{e.title}</div>
                <div className="mini-cat"><Icon name={CAT_ICON[e.cat]} size={11} />{window.TLA.catLabel(e.cat)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Widget>
  );
}

/* ===================== DETAIL MODAL ===================== */
function EventModal({ id, liked, saved, onLike, onSave, onClose }) {
  const e = EV_BY_ID[id];
  useEffect(() => {
    const onKey = (ev) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!e) return null;
  const color = window.TLA.catColor(e.cat);
  const pct = Math.min(100, Math.round((e.going / (e.cap || e.going)) * 100));
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ "--mc": color, "--mimg": EV_GRAD[e.cat] }} onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-media">
          <button className="modal-close" onClick={onClose} aria-label="Chiudi"><Icon name="x" size={15} /></button>
          <span className="mm-ghost"><Icon name={CAT_ICON[e.cat]} size={128} /></span>
          <span className="mm-tag"><span className="pc-ic" style={{ color }}><Icon name={CAT_ICON[e.cat]} size={13} /></span>{window.TLA.catLabel(e.cat)}</span>
        </div>
        <div className="modal-body">
          <div className="modal-title">{e.title}</div>
          {e.desc && <div className="modal-desc">{e.desc}</div>}
          <div className="modal-fields">
            <div className="modal-field"><div className="mf-lbl"><Icon name="pin" size={12} />Luogo</div><div className="mf-val">{e.place}</div></div>
            <div className="modal-field"><div className="mf-lbl"><Icon name="clock" size={12} />Quando</div><div className="mf-val">{e.when}</div></div>
            <div className="modal-field"><div className="mf-lbl"><Icon name="users" size={12} />Partecipanti</div><div className="mf-val">{fmt(e.going)}{e.cap ? ` / ${e.cap}` : ""}</div></div>
            <div className="modal-field"><div className="mf-lbl"><Icon name="trending" size={12} />Interesse</div><div className="mf-val">{pct}%</div></div>
          </div>
          <div className="modal-actions">
            <button className="next-cta" onClick={() => {}}><Icon name="ticket" size={17} />Partecipa</button>
            <button className={"next-save" + (saved ? " on" : "")} onClick={() => onSave(id)} aria-label="Salva"><Icon name="bookmark" size={19} /></button>
            <button className={"next-save" + (liked ? " on" : "")} onClick={() => onLike(id)} aria-label="Mi interessa"><Icon name="heart" size={19} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== PAGE ===================== */
function EventsPage({ page, setPage, theme, setTheme }) {
  const [filter, setFilter] = useState("all");
  const [likes, setLikes] = useState({});
  const [saves, setSaves] = useState({});
  const [detail, setDetail] = useState(null);
  const [nextJoined, setNextJoined] = useState(false);
  const [nextSaved, setNextSaved] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const feedRef = useRef(null);

  const toggle = (set) => (id) => set((m) => ({ ...m, [id]: !m[id] }));
  const onLike = toggle(setLikes);
  const onSave = toggle(setSaves);

  const pickTrending = (id) => {
    const inFeed = EV_FEED.some((e) => e.id === id);
    if (inFeed && (filter === "all" || EV_FEED.find((e) => e.id === id).cat === filter)) {
      const el = feedRef.current && feedRef.current.querySelector(`[data-post="${id}"]`);
      const cont = feedRef.current;
      if (el && cont) {
        const top = el.getBoundingClientRect().top - cont.getBoundingClientRect().top + cont.scrollTop - 12;
        cont.scrollTo({ top, behavior: "smooth" });
      }
      setFlashId(id);
      setTimeout(() => setFlashId(null), 1700);
    } else {
      setDetail(id);
    }
  };

  return (
    <div className="events-scene">
      <div className="events-header">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      </div>

      <div className="events-layout">
        {/* LEFT */}
        <div className="ev-col left">
          <MiniCalendar />
          <QuickFilters active={filter} setActive={setFilter} />
          <TrendingTonight onPick={pickTrending} />
          <LiveNow />
        </div>

        {/* CENTER */}
        <Feed ref={feedRef} filter={filter} likes={likes} saves={saves}
          onLike={onLike} onSave={onSave} onOpen={setDetail} flashId={flashId} />

        {/* RIGHT */}
        <div className="ev-col right">
          <NextActivity joined={nextJoined} saved={nextSaved}
            onJoin={() => setNextJoined((v) => !v)} onSave={() => setNextSaved((v) => !v)} />
          <CityGrid onOpen={setDetail} />
        </div>
      </div>

      {detail && (
        <EventModal id={detail} liked={!!likes[detail]} saved={!!saves[detail]}
          onLike={onLike} onSave={onSave} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

window.EventsPage = EventsPage;
