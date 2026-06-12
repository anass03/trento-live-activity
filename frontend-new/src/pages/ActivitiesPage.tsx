/* ===========================================================
   Trento Live Activity — ATTIVITÀ page
   Hardened: every value shown is backed by the API. Author
   identity comes from creator.name (real); attributes that the
   backend doesn't yet return are hidden rather than faked.
   =========================================================== */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { Widget, useGlow } from "../components/redesign/widgets";
import { Icon, WxIcon } from "../components/ui/Icon";
import { getActivities, addFavorite, removeFavorite, getFavorites, getMyActivities, getTrentoWeather, ApiError } from "../lib/api";


const ACT_CAT = {
  outdoor:  { labelKey: "activities.cats.outdoor",   icon: "bike",     color: "var(--teal)" },
  cultura:  { labelKey: "activities.cats.cultura",   icon: "landmark", color: "var(--violet)" },
  food:     { labelKey: "activities.cats.food",      icon: "food",     color: "var(--amber)" },
  sport:    { labelKey: "activities.cats.sport",     icon: "run",      color: "var(--green)" },
  relax:    { labelKey: "activities.cats.relax",     icon: "leaf",     color: "var(--cyan)" },
  social:   { labelKey: "activities.cats.social",    icon: "users",    color: "var(--magenta)" },
  famiglia: { labelKey: "activities.cats.famiglia",  icon: "family",   color: "var(--cyan)" },
  nightlife:{ labelKey: "activities.cats.nightlife", icon: "moon",     color: "var(--violet)" },
  musica:   { labelKey: "activities.cats.musica",    icon: "music",    color: "var(--magenta)" },
  arte:     { labelKey: "activities.cats.arte",      icon: "sparkle",  color: "var(--orange)" },
  studio:   { labelKey: "activities.cats.studio",    icon: "bookmark", color: "var(--cyan)" },
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
  musica:  "linear-gradient(140deg,#db2777,#6d28d9)",
  arte:    "linear-gradient(140deg,#ea580c,#9a3412)",
  studio:  "linear-gradient(140deg,#2563eb,#1e3a8a)",
};
const ACT_DIFF: Record<string, { labelKey: string; color: string }> = {
  easy:   { labelKey: "activities.diff.easy",   color: "var(--green)" },
  medium: { labelKey: "activities.diff.medium", color: "var(--amber)" },
  hard:   { labelKey: "activities.diff.hard",   color: "var(--red)" },
};

/* Real creators come from the API (creator.name). We derive a stable avatar
   (initials + deterministic gradient) instead of inventing author identities. */
const CREATOR_GRADS = [
  "linear-gradient(150deg,#0d9488,#0e7490)",
  "linear-gradient(150deg,#d97706,#b45309)",
  "linear-gradient(150deg,#2563eb,#7c3aed)",
  "linear-gradient(150deg,#059669,#047857)",
  "linear-gradient(150deg,#db2777,#9d174d)",
  "linear-gradient(150deg,#6d28d9,#312e81)",
];
const creatorInitials = (name?: string | null) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const creatorGradient = (name?: string | null) => {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CREATOR_GRADS[h % CREATOR_GRADS.length];
};

const ACT_TABS = [
  { id: "esplora", labelKey: "activities.tabs.esplora", icon: "grid" },
  { id: "saved",   labelKey: "activities.tabs.saved",   icon: "bookmark" },
];
const ACT_SORTS = [
  { id: "relevance",    labelKey: "activities.sorts.relevance" },
  { id: "participants", labelKey: "activities.sorts.participants" },
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
  musica: "musica",
  music: "musica",
  arte: "arte",
  art: "arte",
  studio: "studio",
  study: "studio",
};

const normalizeActivityCat = (value?: string | null): keyof typeof ACT_CAT => {
  const key = String(value || "").trim().toLowerCase();
  return ACT_CAT_ALIASES[key] || (ACT_CAT[key] ? key as keyof typeof ACT_CAT : "outdoor");
};
const normalizeDifficulty = (value?: string | null): string | null => {
  const key = String(value || "").trim().toLowerCase();
  return ACT_DIFF[key] ? key : null;
};
const numOrNull = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const activityCat = (cat: any) => ACT_CAT[normalizeActivityCat(cat)];
const activityGrad = (cat: any) => ACT_GRAD[normalizeActivityCat(cat)];
const distanceLabel = (distance: any) => {
  const n = numOrNull(distance);
  return n == null ? "" : ` · ${n.toFixed(n >= 10 ? 0 : 1)} km`;
};
const formatActivityTime = (value: any, timeTbd: string, locale = "it-IT") => {
  if (!value) return timeTbd;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return timeTbd;
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
};
const durLabel = (m: any) => {
  const n = numOrNull(m);
  if (n == null || n <= 0) return null;
  return n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? " " + (n % 60) + "min" : ""}` : `${n}min`;
};
const capColor = (r: number) => (r >= 1 ? "var(--red)" : r > 0.95 ? "var(--red)" : r > 0.7 ? "var(--amber)" : r > 0.3 ? "var(--green)" : "var(--teal)");
const normalizePrice = (value: any) => {
  const key = String(value || "").trim().toLowerCase();
  if (key.includes("free") || key.includes("gratis")) return "free";
  if (key.includes("paid") || key.includes("pagamento")) return "paid";
  return null;
};

/* ===================== CREATOR AVATAR ===================== */
function CreatorAvatar({ name, size }: { name?: string | null; size: number }) {
  return (
    <div className="author-av" style={{ background: creatorGradient(name), width: size, height: size, fontSize: Math.round(size * 0.34) }}>
      {creatorInitials(name)}
    </div>
  );
}

/* ===================== LEFT FILTERS ===================== */
function ActFilters({ s, set, activities = [] }: any) {
  const { t } = useTranslation();
  const cats = Object.keys(ACT_CAT);
  const anyFilter = s.category !== "all" || s.search;
  return (
    <Widget title={t("activities.filtersTitle")} accent="var(--accent)" delay={60}>
      <div className="act-search">
        <Icon name="search" size={16} />
        <input placeholder={t("activities.searchPlaceholder")} value={s.search} onChange={(e: any) => set({ search: e.target.value })} />
      </div>

      <div className="filter-block">
        <div className="filter-block-label">
          {t("activities.categories")}
          {anyFilter && <button className="filter-reset" onClick={() => set({ category: "all", search: "" })}>{t("activities.reset")}</button>}
        </div>
        <div className="qf-list">
          <button className={"qf-item" + (s.category === "all" ? " active" : "")} style={{ "--qc": "var(--accent)" } as any} onClick={() => set({ category: "all" })}>
            <span className="qf-ic"><Icon name="grid" size={16} /></span>
            <span className="qf-label">{t("activities.all")}</span>
            <span className="qf-count">{activities.length}</span>
          </button>
          {cats.map((c) => {
            const cfg = ACT_CAT[c as keyof typeof ACT_CAT];
            const n = activities.filter((a: any) => a.cat === c).length;
            if (!n) return null;
            return (
              <button key={c} className={"qf-item" + (s.category === c ? " active" : "")} style={{ "--qc": cfg.color } as any} onClick={() => set({ category: s.category === c ? "all" : c })}>
                <span className="qf-ic"><Icon name={cfg.icon} size={16} /></span>
                <span className="qf-label">{t(cfg.labelKey)}</span>
                <span className="qf-count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Widget>
  );
}

/* ===================== HERO ===================== */
function ActHero() {
  const { t } = useTranslation();
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
        <h1 dangerouslySetInnerHTML={{ __html: t("activities.heroTitle") }} />
        <p>{t("activities.heroSubtitle")}</p>
      </div>
    </div>
  );
}

/* ===================== TABS + SORT ===================== */
function ActTabs({ tab, setTab }: any) {
  const { t } = useTranslation();
  return (
    <div className="act-tabs">
      {ACT_TABS.map((tabItem) => (
        <button key={tabItem.id} className={"act-tab" + (tab === tabItem.id ? " on" : "")} onClick={() => setTab(tabItem.id)}>
          <Icon name={tabItem.icon} size={15} />{t(tabItem.labelKey)}
        </button>
      ))}
    </div>
  );
}
function ActSortBar({ count, sort, setSort }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const cur = ACT_SORTS.find((x) => x.id === sort) || ACT_SORTS[0];
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="act-sortbar">
      <div className="act-count"><b>{count}</b> {t("activities.foundWord", { count })}</div>
      <div className="act-sort" onClick={(e) => e.stopPropagation()}>
        <button className="act-sort-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
          <span className="lbl">{t("activities.orderBy")}</span> {t(cur.labelKey)} <Icon name="chevron" size={14} style={{ transform: "rotate(90deg)" }} />
        </button>
        {open && (
          <div className="act-sort-menu" role="listbox">
            {ACT_SORTS.map((o) => (
              <button key={o.id} role="option" aria-selected={sort === o.id} className={"act-sort-opt" + (sort === o.id ? " on" : "")} onClick={() => { setSort(o.id); setOpen(false); }}>
                {t(o.labelKey)}{sort === o.id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== ACTIVITY CARD ===================== */
function ActCard({ a, saved, onSave, onOpen, canSave = true }: any) {
  const { t } = useTranslation();
  const onMove = useGlow();
  const cat = activityCat(a.cat);
  const diff = a.diff ? ACT_DIFF[a.diff] : null;
  const ratio = a.cap > 0 ? a.going / a.cap : 0;
  const stop = (fn: any) => (e: any) => { e.stopPropagation(); fn(); };
  const dur = durLabel(a.dur);
  const dist = distanceLabel(a.dist);
  const catLabel = t(cat.labelKey);
  const priceNode = a.price === "free"
    ? <span className="free">{t("activities.free")}</span>
    : a.price === "paid" ? (a.priceLabel || t("activities.paid")) : null;
  const hasAttrs = !!(dur || diff || priceNode);
  const badge = a.status.rising ? { cls: "rising", icon: "trending", label: t("activities.rising") } : null;
  return (
    <div className="act-card" style={{ "--ac": cat.color, "--aimg": activityGrad(a.cat), "--mx": "50%", "--my": "0%" } as any}
      onMouseMove={onMove} onClick={() => onOpen(a.id)}>
      <div className="act-media">
        {badge && <span className={"act-badge " + badge.cls}><Icon name={badge.icon} size={11} />{badge.label}</span>}
        {canSave && <button className={"act-save" + (saved ? " on" : "")} onClick={stop(() => onSave(a.id))} aria-label={saved ? t("activities.removeSaved") : t("activities.save")} aria-pressed={saved}><Icon name="bookmark" size={16} /></button>}
        {a.rating != null && (
          <span className="am-rating"><Icon name="star" size={13} />{a.rating.toFixed(1)}{a.reviews ? <span>({a.reviews})</span> : null}</span>
        )}
        <span className="am-ghost"><Icon name={cat.icon} size={92} /></span>
      </div>
      <div className="act-body">
        <div className="act-cat"><Icon name={cat.icon} size={12} />{catLabel}{a.subtype && a.subtype !== catLabel ? <><span className="dotsep">·</span><span className="subtype">{a.subtype}</span></> : null}</div>
        <div className="act-name">{a.title}</div>
        {hasAttrs && (
          <div className="act-attrs">
            {dur && <span className="act-attr"><Icon name="clock" size={13} />{dur}</span>}
            {diff && <span className="act-attr"><span className="diff-mini" style={{ "--dc": diff.color } as any}><span className="dot"></span>{t(diff.labelKey)}</span></span>}
            {priceNode && <span className="act-attr"><Icon name="euro" size={13} />{priceNode}</span>}
          </div>
        )}
        <div className="act-loc"><Icon name="pin" size={13} />{a.loc}{dist}</div>
        <div className="act-foot">
          <span className="act-creator">
            <CreatorAvatar name={a.creatorName} size={24} />
            <span className="act-creator-name">{a.creatorName || t("activities.defaultCreator")}</span>
          </span>
          <span className="act-part">
            <span className="cap-bar" style={{ "--capc": capColor(ratio) } as any}><i style={{ width: Math.max(8, ratio * 100) + "%" }}></i></span>
            <span className="pnum"><b>{a.going}</b>{a.cap > 0 ? `/${a.cap}` : ""}</span>
          </span>
        </div>
        <button className="act-cta" onClick={stop(() => onOpen(a.id))}><Icon name="arrow" size={15} />{t("activities.viewDetails")}</button>
      </div>
    </div>
  );
}

/* ===================== RIGHT — NEXT ===================== */
function ActNextWidget({ activity, saved, onSave, onOpen, canSave = true }: any) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  if (!activity) {
    return (
      <Widget title={t("activities.next")} accent="var(--accent)" delay={120}>
        <div className="widget-empty big">{t("activities.noneAvailable")}</div>
      </Widget>
    );
  }
  const a = activity;
  const cat = activityCat(a.cat);
  return (
    <Widget title={t("activities.next")} accent="var(--accent)" delay={120}>
      <div className="next-media" style={{ "--nimg": activityGrad(a.cat) } as any}>
        <span className="nm-count"><span className="led live green"></span><span><span className="lbl">{t("activities.nextBadge")}</span><br />{formatActivityTime(a.startsAt, t("activities.timeTbd"), dtLocale)}</span></span>
        <span className="nm-ghost"><Icon name={cat.icon} size={96} /></span>
      </div>
      <div className="next-title">{a.title}</div>
      <div className="next-fields">
        <div className="next-field"><span className="nf-ic"><Icon name="pin" size={14} /></span><div><div className="nf-lbl">{t("activities.place")}</div><div className="nf-val">{a.loc}</div></div></div>
        <div className="next-field"><span className="nf-ic"><Icon name="users" size={14} /></span><div><div className="nf-lbl">{t("activities.participantsLabel")}</div><div className="nf-val">{a.going}{a.cap > 0 ? ` / ${a.cap}` : ""}</div></div></div>
      </div>
      <div className="next-part" style={{ marginTop: 12 }}>
        <CreatorAvatar name={a.creatorName} size={38} />
        <div className="np-l" style={{ marginLeft: 2 }}>
          <div className="nf-lbl">{t("activities.organizedBy")}</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{a.creatorName || t("activities.defaultCreator")}</div>
        </div>
      </div>
      <div className="next-cta-row">
        <button className="next-cta" onClick={() => onOpen(a.id)}><Icon name="arrow" size={17} />{t("activities.viewDetails")}</button>
        {canSave && <button className={"next-save" + (saved ? " on" : "")} onClick={() => onSave(a.id)} aria-label={saved ? t("activities.removeSaved") : t("activities.save")} aria-pressed={saved}><Icon name="bookmark" size={19} /></button>}
      </div>
    </Widget>
  );
}

function MyActivitiesWidget({ user, setPage, onOpen }: any) {
  const { t } = useTranslation();
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
    <Widget title={t("activities.myActivities")} accent="var(--cyan)" upd={loading ? t("activities.loadingShort") : t("activities.activeCount", { count: items.length })} delay={180}>
      {loading && <div className="widget-empty big">{t("activities.loading")}</div>}
      {!loading && items.length === 0 && (
        <div className="widget-empty big">
          <span>{t("activities.noneCreated")}</span>
          {/* Activity creation is POI-first: it starts from a map pin on the home page. */}
          <button className="link-btn inline" onClick={() => setPage("home")}><Icon name="plus" size={14} />{t("activities.createFirst")}</button>
        </div>
      )}
      {!loading && items.map((item) => (
        <button key={item.id} className="my-act-row" onClick={() => onOpen(item.id)}>
          <span>
            <b>{item.title}</b>
            <small>{item.status} · {item.participantsCount}{item.capacity ? ` / ${item.capacity}` : ""} {t("activities.participantsWord", { count: item.participantsCount || 0 })}{item.reviewCount > 0 ? ` · ${item.averageRating} ${t("activities.ratingWord")}` : ""}</small>
          </span>
          <span className="my-act-actions">
            <Icon name={item.verifiedActivity ? "shieldCheck" : "activity"} size={14} />
          </span>
        </button>
      ))}
    </Widget>
  );
}

/* ===================== RIGHT — WEATHER ===================== */
function WeatherStrip() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<any>(null);
  useEffect(() => {
    let active = true;
    getTrentoWeather().then((data) => { if (active) setWeather(data); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const temp = weather?.current?.temperature;
  const cond = weather?.current?.condition || t("activities.weatherUnavailable");
  return (
    <Widget title={t("activities.weatherTitle")} accent="var(--amber)" delay={320}>
      <div className="wx-strip">
        <WxIcon className="wxs-ic" />
        <div className="wxs-body">
          <div className="wxs-cond">{cond}</div>
          <div className="wxs-note"><span className="led green"></span>{weather?.unavailable ? t("activities.weatherDataUnavailable") : t("activities.weatherUpdated")}</div>
        </div>
        <div className="wxs-temp">{temp != null ? Math.round(temp) : "--"}<sup>°C</sup></div>
      </div>
    </Widget>
  );
}

export function ActivityPage({ page, setPage, theme, setTheme, user, setSelectedActivityId }: any) {
  const { t } = useTranslation();
  // I preferiti sono una funzione da cittadino: admin ed enti non salvano.
  const canSave = user?.role === "registered_user" || user?.role === "anonymous";
  const [backendActivities, setBackendActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [s, setS] = useState({ search: "", category: "all" });
  const [tab, setTab] = useState("esplora");
  const [sort, setSort] = useState("relevance");
  const [saves, setSaves] = useState<Record<string, boolean>>({});
  const set = (patch: any) => setS((prev) => ({ ...prev, ...patch }));

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getActivities();
      const mapped = raw.map((a: any) => {
        const cat = normalizeActivityCat(a.category);
        const rating = numOrNull(a.averageRating ?? a.rating);
        const participants = numOrNull(a.participantCount ?? a.participantsCount) ?? 0;
        const capacity = numOrNull(a.maxParticipants ?? a.capacity) ?? 0;
        const price = normalizePrice(a.price ?? a.priceType);
        return {
          id: a.id,
          cat,
          subtype: a.subtype || null,
          title: a.title,
          dur: numOrNull(a.durationMinutes ?? a.duration),
          diff: normalizeDifficulty(a.difficulty),
          price,
          priceLabel: a.priceLabel || null,
          loc: a.location || a.address || t("activities.locationTbd"),
          dist: numOrNull(a.distance),
          rating,
          reviews: numOrNull(a.reviewCount ?? a.reviewsCount) ?? 0,
          creatorName: a.creator?.name || null,
          going: participants,
          cap: capacity,
          startsAt: a.startsAt || a.startAt || a.dateTime || a.scheduledAt || null,
          status: { rising: participants >= 5 },
          desc: a.description || t("activities.noDescription"),
        };
      });
      setBackendActivities(mapped);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : t("activities.loadError"));
      setLoading(false);
      return;
    }

    // Favorites are secondary: a failure here must not blank the activities list.
    if (user?.id) {
      try {
        const favs = await getFavorites();
        const savesMap: Record<string, boolean> = {};
        favs.forEach((f) => { if (f.markerType === "activity") savesMap[f.markerId] = true; });
        setSaves(savesMap);
      } catch (err) {
        console.warn("Impossibile caricare i preferiti:", err);
      }
    }
    setLoading(false);
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
      if (isSaved) await removeFavorite("activity", id);
      else await addFavorite("activity", id);
    } catch (err) {
      // Roll back the optimistic toggle so the UI never claims a save that failed.
      setSaves((m) => ({ ...m, [id]: isSaved }));
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
    if (tab === "saved") r = r.filter((a) => saves[a.id]);
    // filters
    if (s.category !== "all") r = r.filter((a) => a.cat === s.category);
    if (s.search.trim()) {
      const q = s.search.toLowerCase();
      r = r.filter((a) => (a.title + " " + t(activityCat(a.cat).labelKey) + " " + a.loc + " " + (a.creatorName || "")).toLowerCase().includes(q));
    }
    // sort
    if (sort === "participants") r.sort((a, b) => b.going - a.going);
    return r;
  }, [backendActivities, s, tab, sort, saves]);

  if (loading) {
    return (
      <div className="activity-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div style={{ color: "var(--text-secondary)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("activities.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-scene">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
        <div className="feed-state error" role="alert">
          <Icon name="warn" size={20} />
          <div className="feed-state-title">{t("activities.errorTitle")}</div>
          <div className="feed-state-msg">{error}</div>
          <button className="feed-state-retry" onClick={loadActivities}>{t("activities.retry")}</button>
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
            ? <div className="feed-state empty">
                <Icon name="search" size={20} />
                <div className="feed-state-title">{tab === "saved" ? t("activities.emptyNoSavedTitle") : t("activities.emptyNoFoundTitle")}</div>
                <div className="feed-state-msg">{tab === "saved" ? t("activities.emptyNoSavedMsg") : t("activities.emptyNoFoundMsg")}</div>
              </div>
            : <div className="act-grid">
                {list.map((a) => <ActCard key={a.id} a={a} saved={!!saves[a.id]} onSave={onSave} canSave={canSave} onOpen={() => handleOpenDetail(a.id)} />)}
              </div>}
        </div>

        <div className="ev-col right">
          <ActNextWidget activity={list[0]} saved={list[0] ? !!saves[list[0].id] : false} onSave={onSave} canSave={canSave} onOpen={() => list[0] && handleOpenDetail(list[0].id)} />
          <MyActivitiesWidget user={user} setPage={setPage} onOpen={handleOpenDetail} />
          <WeatherStrip />
        </div>
      </div>
    </div>
  );
}
