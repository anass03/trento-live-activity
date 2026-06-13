/* ===========================================================
   Trento Live Activity — EVENTI page
   =========================================================== */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { getTimeFormat } from "../lib/i18n";
import { Header } from "../components/layout/Header";
import { Avatars } from "../components/redesign/Avatars";
import { Widget, useGlow } from "../components/redesign/widgets";
import { Icon } from "../components/ui/Icon";
import { GeocodedLocation } from "../components/ui/GeocodedLocation";
import { getEvents, joinEvent, leaveEvent, addFavorite, removeFavorite, getFavorites, ApiEvent, ApiError } from "../lib/api";

/* ---- category meta aligned with the backend enum
   (EVENT_CATEGORIES = sport|cultura|musica|arte|gastronomia|altro) ---- */
const EV_META: Record<string, { color: string; icon: string; grad: string }> = {
  musica:      { color: "var(--magenta)", icon: "music",    grad: "linear-gradient(140deg,#db2777,#831843)" },
  cultura:     { color: "var(--violet)",  icon: "landmark", grad: "linear-gradient(140deg,#7c3aed,#4c1d95)" },
  sport:       { color: "var(--green)",   icon: "run",      grad: "linear-gradient(140deg,#059669,#064e3b)" },
  arte:        { color: "var(--amber)",   icon: "sparkle",  grad: "linear-gradient(140deg,#d97706,#7c2d12)" },
  gastronomia: { color: "var(--orange)",  icon: "food",     grad: "linear-gradient(140deg,#ea580c,#9a3412)" },
  altro:       { color: "var(--cyan)",    icon: "compass",  grad: "linear-gradient(140deg,#0ea5e9,#075985)" },
};
const evMeta = (cat?: string) => EV_META[cat || ""] || EV_META.altro;

const EV_FILTERS = [
  { id: "all", label: "events.filters.all", color: "var(--cyan)", icon: "grid" },
  ...Object.keys(EV_META).map((id) => ({
    id, label: `events.filters.${id}`, color: EV_META[id].color, icon: EV_META[id].icon,
  })),
];

const uiLocale = () => (i18n.language?.startsWith("en") ? "en-GB" : "it-IT");
const fmt = (n?: number) => (n || 0).toLocaleString(uiLocale());
// "16:30:00" → "16:30"
const shortTime = (v?: string | null) => (v ? String(v).slice(0, 5) : "");

/* ===================== MINI CALENDAR ===================== */
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Best-effort parse of an event's date from whatever the API returned.
function parseEventDate(e: any): Date | null {
  for (const v of [e?.dateTime, e?.startTime, e?.createdAt]) {
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

// "2026-06-17T16:30:00" → "mer 17 giu, 16:30" (segue la lingua corrente).
function formatEventWhen(e: any, lang?: string): string | null {
  const d = parseEventDate(e);
  if (!d) return null;
  const locale = lang?.startsWith("en") ? "en-GB" : "it-IT";
  const hour12 = getTimeFormat() === "12h";
  const date = d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12 });
  return `${date}, ${time}`;
}

function MiniCalendar({ events = [], selected, onSelect }: any) {
  const { t } = useTranslation();
  const onMove = useGlow();
  const today = React.useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const dows = t("events.calendar.dows", { returnObjects: true }) as string[];

  // Monday-anchored week, shifted by weekOffset.
  const weekDays = React.useMemo(() => {
    const mondayIdx = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayIdx + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  // Real event dots: which days in this week actually have events.
  const eventDays = React.useMemo(() => {
    const days = (events || []).map(parseEventDate).filter(Boolean) as Date[];
    return weekDays.map((wd) => days.some((d) => sameDay(d, wd)));
  }, [events, weekDays]);

  const monthLabel = weekDays[0].toLocaleDateString(uiLocale(), { month: "long", year: "numeric" });

  return (
    <div className="widget anim-in" style={{ "--accent": "var(--violet)", animationDelay: "60ms" } as React.CSSProperties} onMouseMove={onMove}>
      <div className="widget-inner">
        <div className="cal-head">
          <div className="cal-month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
          <div className="cal-nav">
            <button aria-label={t("events.calendar.prevWeek")} onClick={() => setWeekOffset((w) => w - 1)}><Icon name="chevronL" size={14} /></button>
            <button aria-label={t("events.calendar.nextWeek")} onClick={() => setWeekOffset((w) => w + 1)}><Icon name="chevron" size={14} /></button>
          </div>
        </div>
        <div className="cal-grid">
          {dows.map((d, i) => <div className="cal-dow" key={"d" + i}>{d}</div>)}
          {weekDays.map((d, i) => {
            const isSel = selected ? sameDay(d, selected) : sameDay(d, today);
            return (
              <button key={d.toISOString()} type="button"
                className={"cal-day" + (isSel ? " sel" : "")}
                aria-current={sameDay(d, today) ? "date" : undefined}
                aria-pressed={selected ? sameDay(d, selected) : false}
                title={t(selected && sameDay(d, selected) ? "events.calendar.clearDay" : "events.calendar.pickDay")}
                onClick={() => onSelect?.(selected && sameDay(d, selected) ? null : d)}>
                {d.getDate()}
                {eventDays[i] && <span className="dot"></span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===================== QUICK FILTERS ===================== */
function QuickFilters({ activeCategories, onToggle, counts }: any) {
  const { t } = useTranslation();
  return (
    <Widget title={t("events.filters.title")} accent="var(--cyan)" delay={140}>
      <div className="qf-list">
        {EV_FILTERS.map((f) => {
          const isAll = f.id === "all";
          const isActive = isAll ? activeCategories.size === 0 : activeCategories.has(f.id);
          return (
            <button key={f.id} className={"qf-item" + (isActive ? " active" : "")}
              style={{ "--qc": f.color } as React.CSSProperties} onClick={() => onToggle(f.id)} aria-pressed={isActive}>
              <span className="qf-ic"><Icon name={f.icon} size={16} /></span>
              <span className="qf-label">{t(f.label)}</span>
              <span className="qf-count">{counts[f.id] || 0}</span>
            </button>
          );
        })}
      </div>
    </Widget>
  );
}

/* ===================== MOST PARTICIPATED ===================== */
function MostParticipated({ list, onPick }: any) {
  const { t } = useTranslation();
  const top = [...list]
    .filter((e: any) => (e.participantCount || 0) > 0)
    .sort((a: any, b: any) => (b.participantCount || 0) - (a.participantCount || 0))
    .slice(0, 3);
  return (
    <Widget title={t("events.mostParticipated")} accent="var(--magenta)" delay={220}>
      {top.map((e: any, i: number) => (
        <button className="trend-row" key={e.id} onClick={() => onPick(e.id)}>
          <span className="trend-rank">{i + 1}</span>
          <span className="trend-body">
            <span className="trend-title">{e.title}</span>
            <span className="trend-loc"><GeocodedLocation value={e.location} fallback="Trento" /></span>
          </span>
          <span className="trend-count"><Icon name="users" size={13} />{fmt(e.participantCount)}</span>
        </button>
      ))}
      {top.length === 0 && (
        <div style={{ color: "var(--text-secondary)", fontSize: 12, padding: "10px 0", textAlign: "center" }}>
          {t("events.noneWithParticipants")}
        </div>
      )}
    </Widget>
  );
}

/* ===================== SEARCH BAR ===================== */
function Composer({ search, setSearch }: any) {
  const { t } = useTranslation();
  return (
    <div className="composer">
      <div className="composer-field" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <Icon name="search" size={17} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("events.searchPlaceholder")}
          style={{ background: "none", border: "none", color: "var(--text-primary)", outline: "none", width: "100%", fontSize: 14 }}
        />
      </div>
    </div>
  );
}

/* ===================== EVENT POST CARD ===================== */
function PostCard({ e, saved, shared, onSave, onShare, onOpen, flash, canSave = true }: any) {
  const { t, i18n } = useTranslation();
  const onMove = useGlow();
  const meta = evMeta(e.category);
  const catLabel = t(`events.filters.${e.category}`, { defaultValue: e.category });
  const count = e.participantCount || 0;
  const stop = (fn: any) => (ev: any) => { ev.stopPropagation(); fn(); };
  return (
    <div className={"post" + (flash ? " flash" : "")} data-post={e.id}
      style={{ "--pc": meta.color, "--pimg": meta.grad, "--mx": "50%", "--my": "0%" } as React.CSSProperties}
      onMouseMove={onMove} onClick={() => onOpen(e.id)}>
      <div className="post-media">
        <div className="pm-badges">
          {e.isCertified
            ? <span className="pm-live" style={{ background: "var(--teal)" }}><Icon name="shieldCheck" size={11} />{t("events.certified")}</span>
            : <span className="pm-tag"><Icon name={meta.icon} size={12} />{catLabel}</span>}
          {count > 20 && <span className="pm-feat"><Icon name="flame" size={11} />{t("events.popular")}</span>}
        </div>
        <span className="pm-ghost"><Icon name={meta.icon} size={116} /></span>
      </div>
      <div className="post-content">
        <div className="post-cat"><span className="pc-ic" style={{ color: meta.color }}><Icon name={meta.icon} size={12} /></span>{catLabel}</div>
        <div className="post-title">{e.title}</div>
        <div className="post-desc">{e.description}</div>
        <div className="post-meta">
          <span className="pm"><Icon name="pin" size={14} /><GeocodedLocation value={e.location} fallback="Trento" /></span>
          <span className="pm"><Icon name="clock" size={14} />{formatEventWhen(e, i18n.language) || t("events.today")}</span>
        </div>
        <div className="post-foot">
          {count > 0 && (
            <Avatars ids={[0, 1, 2].slice(0, Math.min(3, count))} extra={Math.max(0, count - 3)} />
          )}
          <span className="attend-count" style={count > 0 ? undefined : { marginLeft: 0 }}>
            <b>{fmt(count)}</b> {t("events.participantsWord", { count })}
          </span>
          <div className="post-actions">
            <button className={"act-btn icon-only" + (shared ? " on-share" : "")} onClick={stop(() => onShare(e))}
              aria-label={shared ? t("events.shareCopied") : t("events.ariaShare")} title={shared ? t("events.shareCopied") : undefined}>
              <Icon name={shared ? "check" : "share"} size={17} />
            </button>
            {canSave && (
              <button className={"act-btn save icon-only" + (saved ? " on" : "")} onClick={stop(() => onSave(e.id))} aria-label={t("events.ariaSave")}><Icon name="bookmark" size={17} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== FEED ===================== */
const Feed = React.forwardRef<any, any>(function Feed({ events, user, search, setSearch, hasFilter, saves, sharedId, onSave, onShare, onOpen, flashId }, ref) {
  const { t } = useTranslation();
  const emptyTitle = search ? t("events.emptyNoResultsTitle") : hasFilter ? t("events.emptyNoCategoryTitle") : t("events.emptyNoEventsTitle");
  const emptyMsg = search ? t("events.emptyNoResultsMsg") : hasFilter ? t("events.emptyNoCategoryMsg") : t("events.emptyNoEventsMsg");
  return (
    <div className="ev-col feed" ref={ref}>
      <Composer user={user} search={search} setSearch={setSearch} />
      {events.length === 0 && (
        <div className="feed-state empty">
          <Icon name="calendar" size={20} />
          <div className="feed-state-title">{emptyTitle}</div>
          <div className="feed-state-msg">{emptyMsg}</div>
        </div>
      )}
      {events.map((e: any) => (
        <div className="feed-row" key={e.id}>
          <div className="tl">
            <span className={"tl-node" + (e.isCertified ? " live" : "")} style={{ "--tc": evMeta(e.category).color } as React.CSSProperties}></span>
            <span className={"tl-label" + (e.isCertified ? " live" : "")}>{shortTime(e.startTime) || t("events.live")}</span>
          </div>
          <div className="feed-body">
            <PostCard e={e} saved={!!saves[e.id]} shared={sharedId === e.id}
              onSave={onSave} onShare={onShare} onOpen={onOpen} flash={flashId === e.id}
              canSave={user?.role === "registered_user" || user?.role === "anonymous"} />
          </div>
        </div>
      ))}
    </div>
  );
});

/* ===================== NEXT ACTIVITY ===================== */
function NextActivity({ event, joined, saved, busy, joinError, onJoin, onSave, canJoin = true }: any) {
  const { t, i18n } = useTranslation();
  if (!event) {
    return (
      <Widget title={t("events.next")} accent="var(--cyan)" upd={t("events.none")} delay={120}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
          {t("events.noUpcoming")}
        </div>
      </Widget>
    );
  }
  const meta = evMeta(event.category);
  const pct = Math.round(((event.participantCount || 0) / (event.maxPartecipanti || 100)) * 100);
  // NB: don't pass accent="var(--accent)" — the Widget sets `--accent: <value>`
  // inline, and a self-referential var() makes the property invalid for the
  // whole subtree (the join CTA gradient disappears). Use a concrete token.
  return (
    <Widget title={t("events.next")} accent="var(--cyan)" upd={t("events.upcoming")} delay={120}>
      <div className="next-media" style={{ "--nimg": meta.grad } as React.CSSProperties}>
        <span className="nm-count">
          <span className="led live green"></span>
          <span><span className="lbl">{t("events.upcomingBadge")}</span></span>
        </span>
        <span className="nm-ghost"><Icon name={meta.icon} size={96} /></span>
      </div>
      <div className="next-title">{event.title}</div>
      <div className="next-fields">
        <div className="next-field">
          <span className="nf-ic"><Icon name="pin" size={14} /></span>
          <div><div className="nf-lbl">{t("events.place")}</div><div className="nf-val"><GeocodedLocation value={event.location} fallback="Trento" /></div></div>
        </div>
        <div className="next-field">
          <span className="nf-ic"><Icon name="clock" size={14} /></span>
          <div><div className="nf-lbl">{t("events.when")}</div><div className="nf-val">{formatEventWhen(event, i18n.language) || t("events.today")}</div></div>
        </div>
      </div>
      <div className="next-part">
        <div className="np-l">
          <div className="nf-lbl">{t("events.participantsLabel")}</div>
          <div className="np-bar"><i style={{ width: Math.max(8, pct) + "%" }}></i></div>
        </div>
        <div className="np-n"><b>{event.participantCount || 0}</b> {event.maxPartecipanti ? `/ ${event.maxPartecipanti}` : ""}</div>
      </div>
      <div className="next-cta-row">
        {canJoin && (
          <button className={"next-cta" + (joined ? " joined" : "")} onClick={onJoin} aria-pressed={joined} disabled={busy} aria-busy={busy}>
            <Icon name={joined ? "check" : "ticket"} size={17} />
            {busy ? t("events.joining") : joined ? t("events.joinedCta") : t("events.joinCta")}
          </button>
        )}
        {canJoin && (
          <button className={"next-save" + (saved ? " on" : "")} onClick={onSave} aria-label={t("events.ariaSaveEvent")}><Icon name="bookmark" size={19} /></button>
        )}
      </div>
      {joinError && <div className="next-join-error" role="alert"><Icon name="warn" size={13} />{joinError}</div>}
    </Widget>
  );
}

/* ===================== CITY EVENTS GRID ===================== */
function CityGrid({ list, onOpen }: any) {
  const { t } = useTranslation();
  return (
    <Widget title={t("events.cityGrid")} accent="var(--teal)" upd={t("events.cityGridTotal", { count: list.length })} delay={220}
      style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" }}>
      <div className="city-grid">
        {list.map((e: any) => {
          const meta = evMeta(e.category);
          return (
            <button className="mini" key={e.id} style={{ "--mc": meta.color, "--mimg": meta.grad } as React.CSSProperties} onClick={() => onOpen(e.id)}>
              <div className="mini-media">
                <span className="mled" style={{ animation: e.isCertified ? "ledPulse 2.6s ease-in-out infinite" : "none" }}></span>
                <span className="pm-ghost" style={{ right: -8, bottom: -10 }}><Icon name={meta.icon} size={52} /></span>
              </div>
              <div className="mini-body">
                <div className="mini-time">{shortTime(e.startTime) || t("events.live")}</div>
                <div className="mini-title">{e.title}</div>
                <div className="mini-cat"><Icon name={meta.icon} size={11} />{t(`events.filters.${e.category}`, { defaultValue: e.category })}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Widget>
  );
}

/* ===================== PAGE ===================== */
export function EventsPage({ page, setPage, theme, setTheme, user, setSelectedEventId }: any) {
  const { t } = useTranslation();
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selDate, setSelDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saves, setSaves] = useState<Record<string, boolean>>({});
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const feedRef = useRef<any>(null);
  const shareTimer = useRef<any>(null);
  useEffect(() => () => clearTimeout(shareTimer.current), []);

  // Load all events once; category + search are applied client-side so the
  // sidebar counters stay correct and typing doesn't refetch on every key.
  const loadEventsData = async () => {
    setError(null);
    try {
      const data = await getEvents({ limit: 100 });
      setEvents(data);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : t("events.loadError"));
      setLoading(false);
      return;
    }

    // Favorites are a secondary enhancement: a failure here must never blank the
    // events feed (which already loaded successfully above).
    if (user?.id) {
      try {
        const favs = await getFavorites();
        const savesMap: Record<string, boolean> = {};
        favs.forEach((f) => {
          if (f.markerType === "event") savesMap[f.markerId] = true;
        });
        setSaves(savesMap);
      } catch (err) {
        console.warn("Impossibile caricare i preferiti:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEventsData();
  }, [user?.id]);

  const toggleCategory = (id: string) => {
    if (id === "all") { setActiveCategories(new Set()); return; }
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ---- client-side filtering (category + calendar day + free-text) ---- */
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return events.filter((e) => {
      const dt = e.dateTime || (e as any).startTime;
      if (dt) { try { if (new Date(dt).getTime() < now) return false; } catch (_) {} }
      if (activeCategories.size > 0 && !activeCategories.has(e.category)) return false;
      if (selDate) {
        const d = parseEventDate(e);
        if (!d || !sameDay(d, selDate)) return false;
      }
      if (!q) return true;
      return [e.title, e.description, e.location]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [events, activeCategories, selDate, search]);

  const requireAuth = () => {
    if (user?.role === "registered_user" && user?.id) return true;
    if (!user?.id || user?.role === "anonymous") setPage("login");
    return false;
  };

  const handleSave = async (id: string) => {
    if (!requireAuth()) return;
    const isSaved = !!saves[id];
    setSaves((prev) => ({ ...prev, [id]: !isSaved }));
    try {
      if (isSaved) {
        await removeFavorite("event", id);
      } else {
        await addFavorite("event", id);
      }
    } catch (err) {
      // Roll back the optimistic toggle so the UI never claims a save that failed.
      setSaves((prev) => ({ ...prev, [id]: isSaved }));
      console.error(err);
    }
  };

  const handleShare = async (e: ApiEvent) => {
    const text = `${e.title} — ${e.location || "Trento"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: e.title, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
      setSharedId(e.id);
      clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setSharedId(null), 1800);
    } catch (err) {
      // User dismissed the share sheet or clipboard was denied: nothing to report.
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedEventId(id);
    setPage("evento-dettaglio");
  };

  // Update one event in place (no full reload) after join/leave.
  const patchEvent = (id: string, patch: Partial<ApiEvent>) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const handleJoinToggle = async (ev: ApiEvent) => {
    if (!requireAuth()) return;
    if (joinBusy) return;
    setJoinBusy(true);
    setJoinError(null);
    const isJoined = !!ev.participantIds?.includes(user?.id || "");
    try {
      if (isJoined) {
        const res = await leaveEvent(ev.id);
        patchEvent(ev.id, {
          participantCount: res.participantCount,
          participantIds: (ev.participantIds || []).filter((pid) => pid !== user?.id),
        });
      } else {
        const res = await joinEvent(ev.id);
        patchEvent(ev.id, {
          participantCount: res.participantCount,
          participantIds: [...(ev.participantIds || []), user?.id],
        });
      }
    } catch (err: any) {
      setJoinError(err instanceof ApiError ? err.message : t("events.joinError"));
    } finally {
      setJoinBusy(false);
    }
  };

  // Sidebar filter counters: all future events per category (ignoring active search/category filter
  // so the other category pills still show non-zero counts).
  const futureEvents = React.useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      const dt = e.dateTime || (e as any).startTime;
      if (dt) { try { return new Date(dt).getTime() >= now; } catch (_) {} }
      return true;
    });
  }, [events]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: futureEvents.length };
    futureEvents.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [futureEvents]);

  // "Next event": the soonest upcoming one — no fallback to past events.
  const nextEvent = React.useMemo(() => {
    const now = Date.now();
    const upcoming = events
      .map((e) => ({ e, d: parseEventDate(e) }))
      .filter((x) => x.d && x.d.getTime() >= now)
      .sort((a, b) => a.d!.getTime() - b.d!.getTime());
    return upcoming[0]?.e || null;
  }, [events]);

  if (loading) {
    return (
      <div className="events-scene">
        <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          {t("events.loading")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="events-scene">
        <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
        <div className="feed-state error" role="alert">
          <Icon name="warn" size={20} />
          <div className="feed-state-title">{t("events.errorTitle")}</div>
          <div className="feed-state-msg">{error}</div>
          <button className="feed-state-retry" onClick={() => { setLoading(true); loadEventsData(); }}>{t("events.retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="events-scene">
      <div className="events-header">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      </div>

      <div className="events-layout">
        {/* LEFT */}
        <div className="ev-col left">
          <MiniCalendar events={events} selected={selDate} onSelect={setSelDate} />
          <QuickFilters activeCategories={activeCategories} onToggle={toggleCategory} counts={categoryCounts} />
          <MostParticipated list={events} onPick={handleOpenDetail} />
        </div>

        {/* CENTER */}
        <Feed ref={feedRef} events={filtered} user={user} search={search} setSearch={setSearch} hasFilter={activeCategories.size > 0 || !!selDate}
          saves={saves} sharedId={sharedId} onSave={handleSave} onShare={handleShare}
          onOpen={handleOpenDetail} flashId={null} />

        {/* RIGHT */}
        <div className="ev-col right">
          <NextActivity
            event={nextEvent}
            canJoin={user?.role === "registered_user"}
            joined={nextEvent ? !!(nextEvent.participantIds?.includes(user?.id || "")) : false}
            saved={nextEvent ? !!saves[nextEvent.id] : false}
            busy={joinBusy}
            joinError={joinError}
            onJoin={() => nextEvent && handleJoinToggle(nextEvent)}
            onSave={() => nextEvent && handleSave(nextEvent.id)}
          />
          <CityGrid list={filtered.filter((e) => e.id !== nextEvent?.id)} onOpen={handleOpenDetail} />
        </div>
      </div>
    </div>
  );
}
