/* ===========================================================
   Trento Live Activity — ATTIVITÀ page
   =========================================================== */
import React, { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Avatars } from "../components/redesign/Avatars";
import { Widget, useGlow } from "../components/redesign/widgets";
import { Icon, WxIcon } from "../components/ui/Icon";


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

const ACT_LIST = [
  { id: "a1", cat: "outdoor", subtype: "Vista panoramica", title: "Passeggiata panoramica a Sardagna",
    dur: 90, diff: "medium", price: "free", priceLabel: "Gratis", loc: "Funivia Sardagna", dist: 1.2,
    rating: 4.7, reviews: 38, author: "g", going: 3, cap: 10, avatars: [4, 2, 0],
    status: { recommended: true, suitableNow: true },
    desc: "Una camminata leggera lungo i sentieri di Sardagna con vista aperta sulla città e sulla Valle dell'Adige. Adatta a chi cerca natura e panorami senza allontanarsi dal centro.",
    rev: { accuracy: 4.6, organization: 4.8, safety: 4.9 } },
  { id: "a2", cat: "cultura", subtype: "Al coperto", title: "Visita al MUSE — Museo delle Scienze",
    dur: 90, diff: "easy", price: "paid", priceLabel: "€11", loc: "MUSE", dist: 0.8,
    rating: 4.9, reviews: 56, author: "o", going: 7, cap: 15, avatars: [5, 1, 3, 0],
    status: { recommended: true, verified: true },
    desc: "Percorso guidato tra le esposizioni del museo progettato da Renzo Piano: biodiversità alpina, sostenibilità e scienza interattiva. Ideale anche in caso di pioggia.",
    rev: { accuracy: 4.9, organization: 4.9, safety: 5.0 } },
  { id: "a3", cat: "social", subtype: "Rooftop", title: "Aperitivo panoramico a San Lorenzo",
    dur: 75, diff: "easy", price: "paid", priceLabel: "€15", loc: "San Lorenzo, Trento", dist: 0.5,
    rating: 4.6, reviews: 24, author: "g", going: 3, cap: 12, avatars: [0, 3],
    status: { recommended: true, suitableNow: true },
    desc: "Cocktail d'autore e piccola cucina di territorio su una terrazza con vista sui tetti di Trento, accompagnati da musica soul dal vivo al tramonto.",
    rev: { accuracy: 4.5, organization: 4.7, safety: 4.6 } },
  { id: "a4", cat: "relax", subtype: "Benessere", title: "Yoga al tramonto",
    dur: 60, diff: "easy", price: "free", priceLabel: "Gratis", loc: "Parco Gocciadoro", dist: 1.6,
    rating: 4.8, reviews: 31, author: "s", going: 5, cap: 18, avatars: [1, 5, 4],
    status: { rising: true },
    desc: "Sessione di hatha yoga all'aria aperta, dolce e accessibile a tutti i livelli, con rilassamento guidato finale mentre cala la sera sul parco.",
    rev: { accuracy: 4.8, organization: 4.7, safety: 4.9 } },
  { id: "a5", cat: "food", subtype: "Cantina", title: "Degustazione vini trentini",
    dur: 120, diff: "easy", price: "paid", priceLabel: "€28", loc: "Palazzo Roccabruna", dist: 0.6,
    rating: 4.7, reviews: 42, author: "l", going: 9, cap: 16, avatars: [3, 2, 0, 1],
    status: { verified: true },
    desc: "Viaggio guidato tra i vitigni del Trentino — Teroldego, Müller Thurgau, Trentodoc — con abbinamenti di prodotti tipici locali e un sommelier dedicato.",
    rev: { accuracy: 4.7, organization: 4.8, safety: 4.7 } },
  { id: "a6", cat: "sport", subtype: "Avventura", title: "Arrampicata in falesia",
    dur: 180, diff: "hard", price: "paid", priceLabel: "€45", loc: "Falesia di Trento", dist: 6.4,
    rating: 4.9, reviews: 19, author: "o", going: 4, cap: 8, avatars: [4, 5],
    status: { rising: true, verified: true },
    desc: "Uscita di arrampicata con guida alpina certificata: attrezzatura inclusa, vie adatte a chi ha già esperienza di base. Sicurezza e tecnica al centro dell'esperienza.",
    rev: { accuracy: 4.9, organization: 4.9, safety: 5.0 } },
  { id: "a7", cat: "outdoor", subtype: "Storia & natura", title: "Trekking al Doss Trento",
    dur: 150, diff: "medium", price: "free", priceLabel: "Gratis", loc: "Doss Trento", dist: 2.1,
    rating: 4.5, reviews: 27, author: "m", going: 6, cap: 14, avatars: [2, 0, 4],
    status: { recommended: true },
    desc: "Salita al colle che domina Trento, tra boschi e il Mausoleo di Cesare Battisti, con racconti sulla storia della città e panorami a 360 gradi.",
    rev: { accuracy: 4.5, organization: 4.4, safety: 4.7 } },
  { id: "a8", cat: "social", subtype: "Community", title: "Cena sociale multiculturale",
    dur: 120, diff: "easy", price: "paid", priceLabel: "€20", loc: "Centro Trento", dist: 0.4,
    rating: 4.4, reviews: 16, author: "s", going: 11, cap: 20, avatars: [1, 3, 5, 0],
    status: { rising: true },
    desc: "Una cena conviviale a più mani dove ogni partecipante porta un piatto della propria cultura: un modo caloroso per conoscere persone nuove in città.",
    rev: { accuracy: 4.3, organization: 4.5, safety: 4.5 } },
  { id: "a9", cat: "outdoor", subtype: "Ciclabile", title: "Bici lungo l'Adige",
    dur: 90, diff: "easy", price: "free", priceLabel: "Gratis", loc: "Lungadige Leopardi", dist: 1.0,
    rating: 4.6, reviews: 22, author: "m", going: 5, cap: 12, avatars: [0, 4, 2],
    status: { suitableNow: true },
    desc: "Pedalata rilassata sulla ciclabile del fiume Adige, pianeggiante e panoramica, perfetta per famiglie e per godersi la luce del tardo pomeriggio.",
    rev: { accuracy: 4.6, organization: 4.5, safety: 4.7 } },
];
const ACT_BY_ID = Object.fromEntries(ACT_LIST.map((a) => [a.id, a]));

const ACT_PERFECT = [
  { actId: "a1", reason: "weather", reasonLbl: "Consigliata ora", title: "Passeggiata breve in collina", meta: "Facile · 45min", cat: "outdoor", temp: 18 },
  { actId: "a2", reason: "indoor",  reasonLbl: "Al coperto",      title: "Museo delle Scienze",          meta: "1h 30min",      cat: "cultura", temp: 18 },
];
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

const durLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "min" : ""}` : `${m}min`);
const capColor = (r) => (r >= 1 ? "var(--red)" : r > 0.95 ? "var(--red)" : r > 0.7 ? "var(--amber)" : r > 0.3 ? "var(--green)" : "var(--teal)");
const capState = (r) => (r >= 1 ? "Al completo" : r > 0.95 ? "Quasi al completo" : r > 0.7 ? "Quasi al completo" : r > 0.3 ? "Attiva" : "Posti liberi");

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
function ActFilters({ s, set }: any) {
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
            <span className="qf-count">{ACT_LIST.length}</span>
          </button>
          {cats.map((c) => {
            const cfg = ACT_CAT[c];
            const n = ACT_LIST.filter((a) => a.cat === c).length;
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
  const cat = ACT_CAT[a.cat], diff = ACT_DIFF[a.diff], trust = ACT_TRUST[a.author ? ACT_AUTHORS[a.author].trust : "reliable"];
  const ratio = a.going / a.cap;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  let badge = null;
  if (a.status.verified) badge = { cls: "verified", icon: "shieldCheck", label: "Verificata" };
  else if (a.status.suitableNow) badge = { cls: "now", icon: "sun", label: "Adatta ora" };
  else if (a.status.rising) badge = { cls: "rising", icon: "trending", label: "In crescita" };
  return (
    <div className="act-card" style={{ "--ac": cat.color, "--aimg": ACT_GRAD[a.cat], "--mx": "50%", "--my": "0%" }}
      onMouseMove={onMove} onClick={() => onOpen(a.id)}>
      <div className="act-media">
        {badge && <span className={"act-badge " + badge.cls}><Icon name={badge.icon} size={11} />{badge.label}</span>}
        <button className={"act-save" + (saved ? " on" : "")} onClick={stop(() => onSave(a.id))} aria-label="Salva"><Icon name="bookmark" size={16} /></button>
        <span className="am-rating"><Icon name="star" size={13} />{a.rating}<span>({a.reviews})</span></span>
        <span className="am-ghost"><Icon name={cat.icon} size={92} /></span>
      </div>
      <div className="act-body">
        <div className="act-cat"><Icon name={cat.icon} size={12} />{cat.label}<span className="dotsep">·</span><span className="subtype">{a.subtype}</span></div>
        <div className="act-name">{a.title}</div>
        <div className="act-attrs">
          <span className="act-attr"><Icon name="clock" size={13} />{durLabel(a.dur)}</span>
          <span className="act-attr"><span className="diff-mini" style={{ "--dc": diff.color }}><span className="dot"></span>{diff.label}</span></span>
          <span className="act-attr"><Icon name="euro" size={13} />{a.price === "free" ? <span className="free">Gratis</span> : a.priceLabel}</span>
        </div>
        <div className="act-loc"><Icon name="pin" size={13} />{a.loc} · {a.dist} km</div>
        <div className="act-foot">
          <span className="act-trust" style={{ "--tc": trust.color }}><Icon name={trust.icon} size={12} />{trust.label}</span>
          <span className="act-part">
            <span className="cap-bar" style={{ "--capc": capColor(ratio) }}><i style={{ width: Math.max(8, ratio * 100) + "%" }}></i></span>
            <span className="pnum"><b>{a.going}</b>/{a.cap}</span>
          </span>
        </div>
        <button className="act-cta" onClick={stop(() => onOpen(a.id))}><Icon name="ticket" size={15} />Partecipa</button>
      </div>
    </div>
  );
}

/* ===================== RIGHT — NEXT ===================== */
function ActNextWidget({ saved, onSave, onOpen }: any) {
  const a = ACT_BY_ID.a3, author = ACT_AUTHORS[a.author], trust = ACT_TRUST[author.trust];
  const ratio = a.going / a.cap;
  return (
    <Widget title="Prossima attività" accent="var(--accent)" delay={120}>
      <div className="next-media" style={{ "--nimg": ACT_GRAD[a.cat] }}>
        <span className="nm-count"><span className="led live green"></span><span><span className="lbl">OGGI</span><br />19:30</span></span>
        <span className="nm-ghost"><Icon name={ACT_CAT[a.cat].icon} size={96} /></span>
      </div>
      <div className="next-title">{a.title}</div>
      <div className="next-fields">
        <div className="next-field"><span className="nf-ic"><Icon name="pin" size={14} /></span><div><div className="nf-lbl">Luogo</div><div className="nf-val">{a.loc}</div></div></div>
        <div className="next-field"><span className="nf-ic"><Icon name="users" size={14} /></span><div><div className="nf-lbl">Partecipanti</div><div className="nf-val">{a.going} / {a.cap}</div></div></div>
      </div>
      <div className="next-part" style={{ marginTop: 12 }}>
        <AuthorAv a={author} size={38} />
        <div className="np-l" style={{ marginLeft: 2 }}>
          <div className="nf-lbl">Affidabilità autore</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: trust.color, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name={trust.icon} size={13} />92% · {trust.label}
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
function TrustedAuthors({ authorFilter, onPick }: any) {
  const ids = ["g", "l", "o"];
  return (
    <Widget title="Autori affidabili" accent="var(--teal)" delay={200}>
      {ids.map((id) => {
        const a = ACT_AUTHORS[id], t = ACT_TRUST[a.trust];
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
function PerfectNow({ onOpen }: any) {
  return (
    <Widget title="Perfette adesso" accent="var(--green)" upd="18°C" delay={260}>
      {ACT_PERFECT.map((p, i) => {
        const r = ACT_REASON[p.reason];
        return (
          <button key={i} className="perfect-row" onClick={() => onOpen(p.actId)}>
            <span className="perfect-thumb" style={{ "--pimg": ACT_GRAD[p.cat] }}><span className="am-ghost" style={{ right: -6, bottom: -8 }}><Icon name={ACT_CAT[p.cat].icon} size={42} /></span></span>
            <span className="perfect-body">
              <span className="perfect-reason" style={{ "--rc": r.color }}><Icon name={r.icon} size={11} />{p.reasonLbl}</span>
              <span className="perfect-title">{p.title}</span>
              <span className="perfect-meta">{p.meta} <span style={{ opacity: 0.4 }}>·</span> <span className="temp"><Icon name="sun" size={11} />{p.temp}°</span></span>
            </span>
          </button>
        );
      })}
    </Widget>
  );
}

/* ===================== RIGHT — WEATHER ===================== */
function WeatherStrip() {
  return (
    <Widget title="Meteo attuale a Trento" accent="var(--amber)" delay={320}>
      <div className="wx-strip">
        <WxIcon className="wxs-ic" />
        <div className="wxs-body">
          <div className="wxs-cond">Parzialmente sereno</div>
          <div className="wxs-note"><span className="led green"></span>Ideale per attività all'aperto</div>
        </div>
        <div className="wxs-temp">18<sup>°C</sup></div>
      </div>
    </Widget>
  );
}

/* ===================== DETAIL DRAWER ===================== */
function ActDrawer({ id, saved, onSave, onClose }: any) {
  const open = !!id;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (id) { const t = setTimeout(() => setShown(true), 10); return () => clearTimeout(t); }
    setShown(false);
  }, [id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const a = id ? ACT_BY_ID[id] : null;
  if (!a) return null;
  const cat = ACT_CAT[a.cat], diff = ACT_DIFF[a.diff], author = ACT_AUTHORS[a.author], trust = ACT_TRUST[author.trust];
  const ratio = a.going / a.cap;
  const revs = [ { k: "Accuratezza", v: a.rev.accuracy }, { k: "Organizzazione", v: a.rev.organization }, { k: "Sicurezza", v: a.rev.safety } ];
  return (
    <React.Fragment>
      <div className={"drawer-scrim" + (shown ? " open" : "")} onClick={onClose}></div>
      <div className={"drawer" + (shown ? " open" : "")} style={{ "--dimg": ACT_GRAD[a.cat] }}>
        <div className="drawer-media">
          <button className="drawer-close" onClick={onClose} aria-label="Chiudi"><Icon name="x" size={16} /></button>
          <span className="dm-ghost"><Icon name={cat.icon} size={128} /></span>
          <span className="dm-badge"><span className="pc-ic" style={{ color: cat.color }}><Icon name={cat.icon} size={13} /></span>{cat.label} · {a.subtype}</span>
        </div>
        <div className="drawer-scroll">
          <div className="drawer-title">{a.title}</div>
          <div className="drawer-rating"><Icon name="star" size={15} />{a.rating} <span>· {a.reviews} recensioni</span></div>
          <div className="drawer-desc">{a.desc}</div>

          <div className="drawer-attrs">
            <div className="drawer-attr"><div className="da-lbl"><Icon name="clock" size={12} />Durata</div><div className="da-val">{durLabel(a.dur)}</div></div>
            <div className="drawer-attr"><div className="da-lbl"><Icon name="gauge" size={12} />Difficoltà</div><div className="da-val"><span className="dot" style={{ "--dc": diff.color }}></span>{diff.label}</div></div>
            <div className="drawer-attr"><div className="da-lbl"><Icon name="euro" size={12} />Costo</div><div className="da-val">{a.price === "free" ? "Gratis" : a.priceLabel}</div></div>
            <div className="drawer-attr"><div className="da-lbl"><Icon name="pin" size={12} />Luogo</div><div className="da-val" style={{ fontSize: 13 }}>{a.loc}</div></div>
          </div>

          <div className="drawer-section-lbl">Partecipanti</div>
          <div className="drawer-part">
            <Avatars ids={a.avatars} extra={Math.max(0, a.going - a.avatars.length)} />
            <div className="dp-l">
              <div className="da-lbl">{capState(ratio)}</div>
              <div className="dp-bar" style={{ "--capc": capColor(ratio), marginTop: 7 }}><i style={{ width: Math.max(8, ratio * 100) + "%" }}></i></div>
            </div>
            <div className="dp-n">{a.going} / {a.cap}</div>
          </div>

          <div className="drawer-section-lbl">Autore</div>
          <div className="drawer-author">
            <AuthorAv a={author} size={46} />
            <div style={{ flex: 1 }}>
              <div className="da-name">{author.name}</div>
              <div className="da-sub">{author.rating} rating · {author.count} attività completate</div>
            </div>
            <span className="act-trust" style={{ "--tc": trust.color }}><Icon name={trust.icon} size={12} />{trust.label}</span>
          </div>

          <div className="drawer-section-lbl">Recensioni</div>
          <div className="rev-overall">
            <b>{a.rating}</b>
            <span className="stars">{[0,1,2,3,4].map((i) => <Icon key={i} name="star" size={14} style={{ opacity: i < Math.round(a.rating) ? 1 : 0.25 }} />)}</span>
            <span className="cnt">{a.reviews} recensioni verificate</span>
          </div>
          {revs.map((r) => (
            <div className="rev-line" key={r.k}>
              <span className="rl-lbl">{r.k}</span>
              <span className="rl-bar"><i style={{ width: (r.v / 5 * 100) + "%" }}></i></span>
              <span className="rl-val">{r.v.toFixed(1)}</span>
            </div>
          ))}

          <div className="drawer-cta-row">
            <button className="act-cta"><Icon name="ticket" size={16} />Partecipa</button>
            <button className={"next-save" + (saved ? " on" : "")} onClick={() => onSave(a.id)} aria-label="Salva"><Icon name="bookmark" size={19} /></button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ===================== PAGE ===================== */
export function ActivityPage({ page, setPage, theme, setTheme, user }: any) {
  const [s, setS] = useState({
    search: "", category: "all", difficulty: null, duration: null, author: null,
    practical: { free: false, now: false, trust: false, verified: false },
  });
  const [tab, setTab] = useState("recommended");
  const [sort, setSort] = useState("relevance");
  const [saves, setSaves] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState(null);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const onSave = (id) => setSaves((m) => ({ ...m, [id]: !m[id] }));

  const list = useMemo(() => {
    let r = ACT_LIST.slice();
    // tab
    if (tab === "recommended") r = r.filter((a) => a.status.recommended);
    else if (tab === "verified") r = r.filter((a) => a.status.verified || ACT_AUTHORS[a.author].trust === "verified");
    else if (tab === "rising") r = r.filter((a) => a.status.rising);
    else if (tab === "saved") r = r.filter((a) => saves[a.id]);
    // filters
    if (s.category !== "all") r = r.filter((a) => a.cat === s.category);
    if (s.difficulty) r = r.filter((a) => a.diff === s.difficulty);
    if (s.duration === "short") r = r.filter((a) => a.dur < 60);
    if (s.duration === "mid") r = r.filter((a) => a.dur >= 60 && a.dur <= 120);
    if (s.duration === "long") r = r.filter((a) => a.dur > 120);
    if (s.author) r = r.filter((a) => a.author === s.author);
    if (s.practical.free) r = r.filter((a) => a.price === "free");
    if (s.practical.now) r = r.filter((a) => a.status.suitableNow);
    if (s.practical.verified) r = r.filter((a) => a.status.verified || ACT_AUTHORS[a.author].trust === "verified");
    if (s.practical.trust) r = r.filter((a) => ["reliable", "highlyReliable", "verified"].includes(ACT_AUTHORS[a.author].trust));
    if (s.search.trim()) {
      const q = s.search.toLowerCase();
      r = r.filter((a) => (a.title + " " + ACT_CAT[a.cat].label + " " + a.loc + " " + ACT_AUTHORS[a.author].name).toLowerCase().includes(q));
    }
    // sort
    const trank = (a) => ACT_TRUST[ACT_AUTHORS[a.author].trust].rank;
    if (sort === "rating" || tab === "recommended") r.sort((a, b) => b.rating - a.rating);
    if (tab === "nearby" || sort === "distance") r.sort((a, b) => a.dist - b.dist);
    if (sort === "duration") r.sort((a, b) => a.dur - b.dur);
    if (sort === "authorTrust") r.sort((a, b) => trank(b) - trank(a));
    if (sort === "participants") r.sort((a, b) => b.going - a.going);
    if (sort === "price") r.sort((a, b) => (a.price === b.price ? 0 : a.price === "free" ? -1 : 1));
    return r;
  }, [s, tab, sort, saves]);

  return (
    <div className="activity-scene">
      <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
      <div className="activity-layout">
        <div className="ev-col left"><ActFilters s={s} set={set} /></div>

        <div className="ev-col feed" style={{ paddingRight: 8 }}>
          <ActHero />
          <ActTabs tab={tab} setTab={setTab} />
          <ActSortBar count={list.length} sort={sort} setSort={setSort} />
          {list.length === 0
            ? <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 8px", textAlign: "center" }}>Nessuna attività con questi filtri. Prova a rimuoverne qualcuno.</div>
            : <div className="act-grid">
                {list.map((a) => <ActCard key={a.id} a={a} saved={!!saves[a.id]} onSave={onSave} onOpen={() => setPage("attivita-dettaglio")} />)}
              </div>}
        </div>

        <div className="ev-col right">
          <ActNextWidget saved={!!saves.a3} onSave={onSave} onOpen={() => setPage("attivita-dettaglio")} />
          <TrustedAuthors authorFilter={s.author} onPick={(id) => set({ author: id })} />
          <PerfectNow onOpen={() => setPage("attivita-dettaglio")} />
          <WeatherStrip />
        </div>
      </div>

      <ActDrawer id={detail} saved={detail ? !!saves[detail] : false} onSave={onSave} onClose={() => setDetail(null)} />
    </div>
  );
}
