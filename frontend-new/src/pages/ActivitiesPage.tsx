/* ===========================================================
   Trento Live Activity — ATTIVITÀ page
   =========================================================== */
import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Widget, useGlow } from "../components/redesign/widgets";
import { Icon, WxIcon } from "../components/ui/Icon";
import { getActivities, addFavorite, removeFavorite, getFavorites, getMyActivities, getTrentoWeather } from "../lib/api";


const ACT_CAT = {
  outdoor:  { label: "Outdoor",      icon: "bike",     color: "var(--teal)" },
  cultura:  { label: "Cultura",      icon: "landmark", color: "var(--violet)" },
  food:     { label: "Food & Drink", icon: "food",     color: "var(--amber)" },
  sport:    { label: "Sport",        icon: "run",      color: "var(--green)" },
  relax:    { label: "Relax",        icon: "leaf",     color: "var(--cyan)" },
  social:   { label: "Social",       icon: "users",    color: "var(--magenta)" },
  famiglia: { label: "Famiglia",     icon: "family",   color: "var(--cyan)" },
  nightlife:{ label: "Nightlife",    icon: "moon",     color: "var(--violet)" },
};
const ACT_GRAD = {
  outdoor: "linear-gradient(140deg,#0d9488,#134e4a)",
  cultura: "linear-gradient(140deg,#7c3aed,#4c1d95)",
  food:    "linear-gradient(140deg,#d97706,#7c2d12)",
  sport:   "linear-gradient(140deg,#059669,#064e3b)",
  relax:   "linear-gradient(140deg,#0891b2,#0c4a6e)",
  social:  "linear-gradient(140deg,#db2777,#831843)",
  famiglia:"linear-gradient(140deg,#0ea5e9,#075985)",
  nightlife:"linear-gradient(140deg,#6d28d9,#312e81)",
};
const ACT_TRUST = {
  new:            { label: "Nuovo autore",    color: "var(--cyan)",  icon: "sparkle",     rank: 1 },
  growing:        { label: "In crescita",     color: "var(--amber)", icon: "trending",    rank: 2 },
  reliable:       { label: "Affidabile",      color: "var(--green)", icon: "check",       rank: 3 },
  highlyReliable: { label: "Molto affidabile",color: "var(--teal)",  icon: "shield",      rank: 4 },
  verified:       { label: "Verificata",      color: "var(--cyan)",  icon: "shieldCheck", rank: 5 },
};
const ACT_DIFF = {
  easy:   { label: "Facile",    color: "var(--green)" },
  medium: { label: "Media",     color: "var(--amber)" },
  hard:   { label: "Difficile", color: "var(--red)" },
};

const ACT_AUTHORS = {
  g: { name: "Giulia M.",          av: "GM", grad: "linear-gradient(150deg,#0d9488,#0e7490)", trust: "highlyReliable", rating: 4.8, count: 14, verified: false },
  l: { name: "Luca R.",            av: "LR", grad: "linear-gradient(150deg,#d97706,#b45309)", trust: "reliable",       rating: 4.6, count: 9,  verified: false },
  o: { name: "Ass. Outdoor Trento",av: "AO", grad: "linear-gradient(150deg,#2563eb,#7c3aed)", trust: "verified",       rating: 4.9, count: 7,  verified: true },
  m: { name: "Marco B.",           av: "MB", grad: "linear-gradient(150deg,#059669,#047857)", trust: "reliable",       rating: 4.6, count: 11, verified: false },
  s: { name: "Sara V.",            av: "SV", grad: "linear-gradient(150deg,#db2777,#9d174d)", trust: "growing",        rating: 4.4, count: 6,  verified: false },
};

const ACT_REASON = {
  weather: { color: "var(--teal)",  icon: "sun" },
  indoor:  { color: "var(--violet)",icon: "landmark" },
  nearby:  { color: "var(--cyan)",  icon: "pin" },
};

const ACT_TABS = [
  { id: "recommended", label: "Consigliate", icon: "sparkle" },
  { id: "nearby",      label: "Vicino a te", icon: "pin" },
  { id: "verified",    label: "Verificate",  icon: "shieldCheck" },
  { id: "rising",      label: "In crescita", icon: "trending" },
  { id: "saved",       label: "Salvate",     icon: "bookmark" },
];
const ACT_SORTS = [
  { id: "relevance",   label: "Rilevanza" },
  { id: "rating",      label: "Valutazione" },
  { id: "distance",    label: "Vicinanza" },
  { id: "duration",    label: "Durata" },
  { id: "authorTrust", label: "Affidabilità autore" },
  { id: "participants",label: "Partecipanti" },
  { id: "price",       label: "Costo" },
];

const ACT_CAT_ALIASES: Record<string, keyof typeof ACT_CAT> = {
  culture: "cultura",
  cultural: "cultura",
  cultura: "cultura",
  gastronomia: "food",
  cucina: "food",
  wine: "food",
  food: "food",
  sport: "sport",
  sports: "sport",
  benessere: "relax",
  wellness: "relax",
  relax: "relax",
  famiglia: "famiglia",
  family: "famiglia",
  nightlife: "nightlife",
  night: "nightlife",
  social: "social",
  outdoor: "outdoor",
  natura: "outdoor",
  trekking: "outdoor",
};

const normalizeActivityCat = (value?: string | null): keyof typeof ACT_CAT => {
  const key = String(value || "").trim().toLowerCase();
  return ACT_CAT_ALIASES[key] || (ACT_CAT[key] ? key as keyof typeof ACT_CAT : "outdoor");
};
const normalizeDifficulty = (value?: string | null) => {
  const key = String(value || "").trim().toLowerCase();
  return ACT_DIFF[key] ? key : "medium";
};
const numOrNull = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const activityCat = (cat: any) => ACT_CAT[normalizeActivityCat(cat)];
const activityGrad = (cat: any) => ACT_GRAD[normalizeActivityCat(cat)];
const authorCfg = (id: any) => ACT_AUTHORS[id] || ACT_AUTHORS.g;
const trustCfg = (id: any) => ACT_TRUST[authorCfg(id).trust] || ACT_TRUST.reliable;
const ratingLabel = (rating: any) => {
  const n = numOrNull(rating);
  return n == null ? "N/D" : n.toFixed(1);
};
const distanceLabel = (distance: any) => {
  const n = numOrNull(distance);
  return n == null ? "" : ` · ${n.toFixed(n >= 10 ? 0 : 1)} km`;
};
const formatActivityTime = (value: any) => {
  if (!value) return "Orario da definire";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Orario da definire";
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};
const durLabel = (m) => {
  const n = numOrNull(m);
  if (n == null || n <= 0) return "N/D";
  return n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? " " + (n % 60) + "min" : ""}` : `${n}min`;
};
const capColor = (r) => (r >= 1 ? "var(--red)" : r > 0.95 ? "var(--red)" : r > 0.7 ? "var(--amber)" : r > 0.3 ? "var(--green)" : "var(--teal)");
const normalizePrice = (value: any) => {
  const key = String(value || "").trim().toLowerCase();
  if (key.includes("free") || key.includes("gratis")) return "free";
  if (key.includes("paid") || key.includes("pagamento")) return "paid";
  return null;
};

/* ===================== AUTHOR AVATAR ===================== */
function AuthorAv({ a, size }: any) {
  return (
    <div className="author-av" style={{ background: a.grad, width: size, height: size }}>
      {a.av}
      {a.verified && <span className="vbadge"><Icon name="check" size={9} /></span>}
    </div>
  );
}

/* ===================== LEFT FILTERS ===================== */
function ActFilters({ s, set, activities = [] }: any) {
  const cats = Object.keys(ACT_CAT);
  const practical = [
    { id: "free",     label: "Gratis",            icon: "euro" },
    { id: "now",      label: "Adatta ora",        icon: "sun" },
    { id: "trust",    label: "Alta affidabilità", icon: "shield" },
    { id: "verified", label: "Verificate",        icon: "shieldCheck" },
  ];
  const durs = [ { id: "short", label: "< 1h" }, { id: "mid", label: "1–2h" }, { id: "long", label: "> 2h" } ];
  const anyFilter = s.category !== "all" || s.difficulty || s.duration || s.author || Object.values(s.practical).some(Boolean) || s.search;
  return (
    <Widget title="Filtri attività" accent="var(--accent)" delay={60}>
      <div className="act-search">
        <Icon name="search" size={16} />
        <input placeholder="Cerca attività…" value={s.search} onChange={(e) => set({ search: e.target.value })} />
      </div>

      <div className="filter-block">
        <div className="filter-block-label">
          Categorie
          {anyFilter && <button className="filter-reset" onClick={() => set({ category: "all", difficulty: null, duration: null, author: null, search: "", practical: { free: false, now: false, trust: false, verified: false } })}>Reset</button>}
        </div>
        <div className="qf-list">
          <button className={"qf-item" + (s.category === "all" ? " active" : "")} style={{ "--qc": "var(--accent)" }} onClick={() => set({ category: "all" })}>
            <span className="qf-ic"><Icon name="grid" size={16} /></span>
            <span className="qf-label">Tutte</span>
            <span className="qf-count">{activities.length}</span>
          </button>
          {cats.map((c) => {
            const cfg = ACT_CAT[c];
            const n = activities.filter((a) => a.cat === c).length;
            if (!n) return null;
            return (
              <button key={c} className={"qf-item" + (s.category === c ? " active" : "")} style={{ "--qc": cfg.color }} onClick={() => set({ category: s.category === c ? "all" : c })}>
                <span className="qf-ic"><Icon name={cfg.icon} size={16} /></span>
                <span className="qf-label">{cfg.label}</span>
                <span className="qf-count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-block">
        <div className="filter-block-label">Filtri pratici</div>
        <div className="pf-grid">
          {practical.map((p) => (
            <button key={p.id} className={"pf-chip" + (s.practical[p.id] ? " on" : "")} onClick={() => set({ practical: { ...s.practical, [p.id]: !s.practical[p.id] } })}>
              <Icon name={p.icon} size={13} />{p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <div className="filter-block-label">Difficoltà</div>
        <div className="diff-row">
          {Object.keys(ACT_DIFF).map((d) => (
            <button key={d} className={"diff-pill" + (s.difficulty === d ? " on" : "")} style={{ "--dc": ACT_DIFF[d].color }} onClick={() => set({ difficulty: s.difficulty === d ? null : d })}>
              <span className="dot"></span>{ACT_DIFF[d].label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <div className="filter-block-label">Durata</div>
        <div className="pf-grid">
          {durs.map((d) => (
            <button key={d.id} className={"pf-chip" + (s.duration === d.id ? " on" : "")} onClick={() => set({ duration: s.duration === d.id ? null : d.id })}>
              <Icon name="clock" size={13} />{d.label}
            </button>
          ))}
        </div>
      </div>
    </Widget>
  );
}

/* ===================== HERO ===================== */
function ActHero() {
  return (
    <div className="act-hero">
      <div className="hero-bloom"></div>
      <div className="hero-art" aria-hidden="true">
        <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice">
          <path d="M380 220 L520 70 L600 130 L660 95 L800 220 Z" fill="rgba(45,212,191,0.10)" />
          <path d="M300 220 L470 50 L560 120 L640 80 L760 220 Z" fill="rgba(16,40,60,0.55)" />
          <path d="M470 50 l16 26 -32 0 z" fill="rgba(125,211,252,0.18)" />
          <circle cx="612" cy="62" r="3.5" fill="#5eead4" />
          <circle cx="612" cy="62" r="8" fill="none" stroke="rgba(94,234,212,0.5)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow"><Icon name="mountain" size={14} />Attività · Trento e dintorni</div>
        <h1>Cosa vuoi fare <em>oggi</em> a Trento?</h1>
        <p>Scopri le migliori attività selezionate dalla community, con autori affidabili e suggerimenti in base al meteo.</p>
      </div>
    </div>
  );
}

/* ===================== TABS + SORT ===================== */
function ActTabs({ tab, setTab }: any) {
  return (
    <div className="act-tabs">
      {ACT_TABS.map((t) => (
        <button key={t.id} className={"act-tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={15} />{t.label}
        </button>
      ))}
    </div>
  );
}
function ActSortBar({ count, sort, setSort }: any) {
  const [open, setOpen] = useState(false);
  const cur = ACT_SORTS.find((x) => x.id === sort);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="act-sortbar">
      <div className="act-count"><b>{count}</b> attività trovate</div>
      <div className="act-sort" onClick={(e) => e.stopPropagation()}>
        <button className="act-sort-btn" onClick={() => setOpen((v) => !v)}>
          <span className="lbl">Ordina per:</span> {cur.label} <Icon name="chevron" size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        {open && (
          <div className="act-sort-menu">
            {ACT_SORTS.map((o) => (
              <button key={o.id} className={"act-sort-opt" + (sort === o.id ? " on" : "")} onClick={() => { setSort(o.id); setOpen(false); }}>
                {o.label}{sort === o.id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== ACTIVITY CARD ===================== */
function ActCard({ a, saved, onSave, onOpen }: any) {
  const onMove = useGlow();
  const cat = activityCat(a.cat), diff = ACT_DIFF[a.diff] || ACT_DIFF.medium, trust = trustCfg(a.author);
  const ratio = a.cap > 0 ? a.going / a.cap : 0;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  let badge = null;
  if (a.status.verified) badge = { cls: "verified", icon: "shieldCheck", label: "Verificata" };
  else if (a.status.suitableNow) badge = { cls: "now", icon: "sun", label: "Adatta ora" };
  else if (a.status.rising) badge = { cls: "rising", icon: "trending", label: "In crescita" };
  return (
    <div className="act-card" style={{ "--ac": cat.color, "--aimg": activityGrad(a.cat), "--mx": "50%", "--my": "0%" }}
      onMouseMove={onMove} onClick={() => onOpen(a.id)}>
      <div className="act-media">
        {badge && <span className={"act-badge " + badge.cls}><Icon name={badge.icon} size={11} />{badge.label}</span>}
        <button className={"act-save" + (saved ? " on" : "")} onClick={stop(() => onSave(a.id))} aria-label="Salva"><Icon name="bookmark" size={16} /></button>
        <span className="am-rating"><Icon name="star" size={13} />{ratingLabel(a.rating)}<span>({a.reviews})</span></span>
        <span className="am-ghost"><Icon name={cat.icon} size={92} /></span>
      </div>
      <div className="act-body">
        <div className="act-cat"><Icon name={cat.icon} size={12} />{cat.label}<span className="dotsep">·</span><span className="subtype">{a.subtype}</span></div>
        <div className="act-name">{a.title}</div>
        <div className="act-attrs">
          <span className="act-attr"><Icon name="clock" size={13} />{durLabel(a.dur)}</span>
          <span className="act-attr"><span className="diff-mini" style={{ "--dc": diff.color }}><span className="dot"></span>{diff.label}</span></span>
          <span className="act-attr"><Icon name="euro" size={13} />{a.price === "free" ? <span className="free">Gratis</span> : (a.priceLabel || "N/D")}</span>
        </div>
        <div className="act-loc"><Icon name="pin" size={13} />{a.loc}{distanceLabel(a.dist)}</div>
        <div className="act-foot">
          <span className="act-trust" style={{ "--tc": trust.color }}><Icon name={trust.icon} size={12} />{trust.label}</span>
          <span className="act-part">
            <span className="cap-bar" style={{ "--capc": capColor(ratio) }}><i style={{ width: Math.max(8, ratio * 100) + "%" }}></i></span>
            <span className="pnum"><b>{a.going}</b>{a.cap > 0 ? `/${a.cap}` : ""}</span>
          </span>
        </div>
        <button className="act-cta" onClick={stop(() => onOpen(a.id))}><Icon name="ticket" size={15} />Partecipa</button>
      </div>
    </div>
  );
}

/* ===================== RIGHT — NEXT ===================== */
function ActNextWidget({ activity, saved, onSave, onOpen }: any) {
  if (!activity) {
    return (
      <Widget title="Prossima attività" accent="var(--accent)" delay={120}>
        <div className="widget-empty big">Nessuna attività disponibile al momento.</div>
      </Widget>
    );
  }
  const a = activity, author = authorCfg(a.author), trust = ACT_TRUST[author.trust];
  const cat = activityCat(a.cat);
  const ratio = a.cap > 0 ? a.going / a.cap : 0;
  return (
    <Widget title="Prossima attività" accent="var(--accent)" delay={120}>
      <div className="next-media" style={{ "--nimg": activityGrad(a.cat) }}>
        <span className="nm-count"><span className="led live green"></span><span><span className="lbl">PROSSIMA</span><br />{formatActivityTime(a.startsAt)}</span></span>
        <span className="nm-ghost"><Icon name={cat.icon} size={96} /></span>
      </div>
      <div className="next-title">{a.title}</div>
      <div className="next-fields">
        <div className="next-field"><span className="nf-ic"><Icon name="pin" size={14} /></span><div><div className="nf-lbl">Luogo</div><div className="nf-val">{a.loc}</div></div></div>
        <div className="next-field"><span className="nf-ic"><Icon name="users" size={14} /></span><div><div className="nf-lbl">Partecipanti</div><div className="nf-val">{a.going}{a.cap > 0 ? ` / ${a.cap}` : ""}</div></div></div>
      </div>
      <div className="next-part" style={{ marginTop: 12 }}>
        <AuthorAv a={author} size={38} />
        <div className="np-l" style={{ marginLeft: 2 }}>
          <div className="nf-lbl">Affidabilità autore</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: trust.color, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={trust.icon} size={13} />{trust.label}
          </div>
        </div>
      </div>
      <div className="next-cta-row">
        <button className="next-cta" onClick={() => onOpen(a.id)}><Icon name="arrow" size={17} />Vedi dettagli</button>
        <button className={"next-save" + (saved ? " on" : "")} onClick={() => onSave(a.id)} aria-label="Salva"><Icon name="bookmark" size={19} /></button>
      </div>
    </Widget>
  );
}

/* ===================== RIGHT — TRUSTED AUTHORS ===================== */
function TrustedAuthors({ authorFilter, onPick, activities = [] }: any) {
  const ids = Array.from(new Set<string>(activities.map((a: any) => String(a.author || "")).filter((id: string) => !!ACT_AUTHORS[id]))).slice(0, 3);
  return (
    <Widget title="Autori affidabili" accent="var(--teal)" delay={200}>
      {ids.length === 0 && <div className="widget-empty big">Nessun autore disponibile.</div>}
      {ids.map((id) => {
        const a = authorCfg(id), t = ACT_TRUST[a.trust];
        return (
          <button key={id} className={"author-row" + (authorFilter === id ? " on" : "")} onClick={() => onPick(authorFilter === id ? null : id)}>
            <AuthorAv a={a} size={40} />
            <div className="author-body">
              <div className="author-name">{a.name}</div>
              <div className="author-meta"><span className="star"><Icon name="star" size={11} />{a.rating}</span> · {a.count} attività</div>
              <div className="author-trust-lbl" style={{ "--tc": t.color }}><Icon name={t.icon} size={11} />{t.label}</div>
            </div>
          </button>
        );
      })}
    </Widget>
  );
}

/* ===================== RIGHT — PERFECT NOW ===================== */
function PerfectNow({ onOpen, activities = [] }: any) {
  const picks = activities.filter((a: any) => a.status?.suitableNow || a.status?.verified).slice(0, 2);
  return (
    <Widget title="Perfette adesso" accent="var(--green)" upd={picks.length ? "Live" : "Nessuna"} delay={260}>
      {picks.length === 0 && <div className="widget-empty big">Nessun suggerimento disponibile.</div>}
      {picks.map((a: any, i: number) => {
        const reason = a.status?.verified ? "indoor" : "weather";
        const r = ACT_REASON[reason];
        const cat = activityCat(a.cat);
        return (
          <button key={a.id || i} className="perfect-row" onClick={() => onOpen(a.id)}>
            <span className="perfect-thumb" style={{ "--pimg": activityGrad(a.cat) }}><span className="am-ghost" style={{ right: -6, bottom: -8 }}><Icon name={cat.icon} size={42} /></span></span>
            <span className="perfect-body">
              <span className="perfect-reason" style={{ "--rc": r.color }}><Icon name={r.icon} size={11} />{a.status?.verified ? "Verificata" : "Adatta ora"}</span>
              <span className="perfect-title">{a.title}</span>
              <span className="perfect-meta">{durLabel(a.dur)} <span style={{ opacity: 0.4 }}>·</span> {a.loc}</span>
            </span>
          </button>
        );
      })}
    </Widget>
  );
}

/* ===================== RIGHT — WEATHER ===================== */
function WeatherStrip() {
  const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
    let active = true;
    getTrentoWeather().then((data) => { if (active) setWeather(data); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const temp = weather?.current?.temperature;
  const cond = weather?.current?.condition || "Meteo non disponibile";
  return (
    <Widget title="Meteo attuale a Trento" accent="var(--amber)" delay={320}>
      <div className="wx-strip">
        <WxIcon className="wxs-ic" />
        <div className="wxs-body">
          <div className="wxs-cond">{cond}</div>
          <div className="wxs-note"><span className="led green"></span>{weather?.unavailable ? "Dati non disponibili" : "Aggiornato da Open-Meteo"}</div>
        </div>
        <div className="wxs-temp">{temp != null ? Math.round(temp) : "--"}<sup>°C</sup></div>
      </div>
    </Widget>
  );
}

function MyActivitiesWidget({ user, setPage, onOpen }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "anonymous") return;
    let active = true;
    setLoading(true);
    getMyActivities({ limit: 5 })
      .then((res) => { if (active) setItems(res.items || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, user?.role]);

  if (user?.role === "anonymous") return null;

  return (
    <Widget title="LE MIE ATTIVITÀ" accent="var(--cyan)" upd={loading ? "Carico" : `${items.length} attive`} delay={180}>
      {loading && <div className="widget-empty big">Caricamento attività...</div>}
      {!loading && items.length === 0 && (
        <div className="widget-empty big">
          <span>Nessuna attività pubblicata.</span>
          <button className="link-btn inline" onClick={() => setPage("attivita")}><Icon name="plus" size={14} />Crea la prima attività</button>
        </div>
      )}
      {!loading && items.map((item) => (
        <button key={item.id} className="my-act-row" onClick={() => onOpen(item.id)}>
          <span>
            <b>{item.title}</b>
            <small>{item.status} · {item.participantsCount}{item.capacity ? ` / ${item.capacity}` : ""} partecipanti · {item.averageRating || "N/D"} rating</small>
          </span>
          <span className="my-act-actions">
            <Icon name={item.verifiedActivity ? "shieldCheck" : "activity"} size={14} />
          </span>
        </button>
      ))}
    </Widget>
  );
}

export function ActivityPage({ page, setPage, theme, setTheme, user, setSelectedActivityId }: any) {
  const [backendActivities, setBackendActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [s, setS] = useState({
    search: "", category: "all", difficulty: null, duration: null, author: null,
    practical: { free: false, now: false, trust: false, verified: false },
  });
  const [tab, setTab] = useState("recommended");
  const [sort, setSort] = useState("relevance");
  const [saves, setSaves] = useState<Record<string, boolean>>({});
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  const loadActivities = async () => {
    try {
      const raw = await getActivities();
      const mapped = raw.map((a: any) => {
        const authorKey = a.creator?.ruolo === 'EnteCertificato' ? 'o' : 'g';
        const cat = normalizeActivityCat(a.category);
        const rating = numOrNull(a.averageRating ?? a.rating);
        const participants = numOrNull(a.participantCount ?? a.participantsCount) ?? 0;
        const capacity = numOrNull(a.maxParticipants ?? a.capacity) ?? 0;
        const verified = a.creator?.ruolo === 'EnteCertificato' || a.verifiedActivity === true;
        const price = normalizePrice(a.price ?? a.priceType);
        return {
          id: a.id,
          cat,
          subtype: a.subtype || activityCat(cat).label,
          title: a.title,
          dur: numOrNull(a.durationMinutes ?? a.duration),
          diff: normalizeDifficulty(a.difficulty),
          price,
          priceLabel: a.priceLabel || (price === "free" ? "Gratis" : price === "paid" ? "A pagamento" : null),
          loc: a.location || a.address || 'Luogo da confermare',
          dist: numOrNull(a.distance),
          rating,
          reviews: numOrNull(a.reviewCount ?? a.reviewsCount) ?? 0,
          author: authorKey,
          going: participants,
          cap: capacity,
          startsAt: a.startsAt || a.startAt || a.dateTime || a.scheduledAt || null,
          status: {
            recommended: a.recommended === true || a.isRecommended === true || verified || (rating != null && rating >= 4.5) || participants >= 5,
            suitableNow: a.suitableNow === true,
            verified,
            rising: participants >= 5
          },
          desc: a.description || 'Informazioni dettagliate non ancora disponibili.',
        };
      });
      setBackendActivities(mapped);

      if (user?.id) {
        const favs = await getFavorites();
        const savesMap: Record<string, boolean> = {};
        favs.forEach((f) => {
          if (f.markerType === "activity") savesMap[f.markerId] = true;
        });
        setSaves(savesMap);
      }
    } catch (err) {
      console.warn("Attività temporaneamente non disponibili:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [user?.id]);

  const requireAuth = () => {
    if (user?.role !== "anonymous" && user?.id) return true;
    setPage("login");
    return false;
  };

  const onSave = async (id: string) => {
    if (!requireAuth()) return;
    const isSaved = !!saves[id];
    setSaves((m) => ({ ...m, [id]: !isSaved }));
    try {
      if (isSaved) {
        await removeFavorite("activity", id);
      } else {
        await addFavorite("activity", id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedActivityId(id);
    setPage("attivita-dettaglio");
  };

  const list = useMemo(() => {
    let r = backendActivities.slice();
    // tab
    if (tab === "recommended") r = r.filter((a) => a.status.recommended);
    else if (tab === "verified") r = r.filter((a) => a.status.verified || authorCfg(a.author).trust === "verified");
    else if (tab === "rising") r = r.filter((a) => a.status.rising);
    else if (tab === "saved") r = r.filter((a) => saves[a.id]);
    // filters
    if (s.category !== "all") r = r.filter((a) => a.cat === s.category);
    if (s.difficulty) r = r.filter((a) => a.diff === s.difficulty);
    if (s.duration === "short") r = r.filter((a) => a.dur != null && a.dur < 60);
    if (s.duration === "mid") r = r.filter((a) => a.dur != null && a.dur >= 60 && a.dur <= 120);
    if (s.duration === "long") r = r.filter((a) => a.dur != null && a.dur > 120);
    if (s.author) r = r.filter((a) => a.author === s.author);
    if (s.practical.free) r = r.filter((a) => a.price === "free");
    if (s.practical.now) r = r.filter((a) => a.status.suitableNow);
    if (s.practical.verified) r = r.filter((a) => a.status.verified || authorCfg(a.author).trust === "verified");
    if (s.practical.trust) r = r.filter((a) => ["reliable", "highlyReliable", "verified"].includes(authorCfg(a.author).trust));
    if (s.search.trim()) {
      const q = s.search.toLowerCase();
      r = r.filter((a) => (a.title + " " + activityCat(a.cat).label + " " + a.loc + " " + authorCfg(a.author).name).toLowerCase().includes(q));
    }
    // sort
    const trank = (a) => ACT_TRUST[authorCfg(a.author).trust].rank;
    if (sort === "rating" || tab === "recommended") r.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    if (tab === "nearby" || sort === "distance") r.sort((a, b) => (a.dist ?? Number.POSITIVE_INFINITY) - (b.dist ?? Number.POSITIVE_INFINITY));
    if (sort === "duration") r.sort((a, b) => (a.dur ?? Number.POSITIVE_INFINITY) - (b.dur ?? Number.POSITIVE_INFINITY));
    if (sort === "authorTrust") r.sort((a, b) => trank(b) - trank(a));
    if (sort === "participants") r.sort((a, b) => b.going - a.going);
    if (sort === "price") r.sort((a, b) => (a.price === b.price ? 0 : a.price === "free" ? -1 : 1));
    return r;
  }, [backendActivities, s, tab, sort, saves]);

  if (loading) {
    return (
      <div className="activity-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-muted)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento attività...
        </div>
      </div>
    );
  }

  return (
    <div className="activity-scene">
      <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
      <div className="activity-layout">
        <div className="ev-col left"><ActFilters s={s} set={set} activities={backendActivities} /></div>

        <div className="ev-col feed" style={{ paddingRight: 8 }}>
          <ActHero />
          <ActTabs tab={tab} setTab={setTab} />
          <ActSortBar count={list.length} sort={sort} setSort={setSort} />
          {list.length === 0
            ? <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 8px", textAlign: "center" }}>Nessuna attività con questi filtri. Prova a rimuoverne qualcuno.</div>
            : <div className="act-grid">
                {list.map((a) => <ActCard key={a.id} a={a} saved={!!saves[a.id]} onSave={onSave} onOpen={() => handleOpenDetail(a.id)} />)}
              </div>}
        </div>

        <div className="ev-col right">
          <ActNextWidget activity={list[0]} saved={list[0] ? !!saves[list[0].id] : false} onSave={onSave} onOpen={() => list[0] && handleOpenDetail(list[0].id)} />
          <MyActivitiesWidget user={user} setPage={setPage} onOpen={handleOpenDetail} />
          <TrustedAuthors authorFilter={s.author} onPick={(id) => set({ author: id })} activities={backendActivities} />
          <PerfectNow onOpen={handleOpenDetail} activities={backendActivities} />
          <WeatherStrip />
        </div>
      </div>
    </div>
  );
}
