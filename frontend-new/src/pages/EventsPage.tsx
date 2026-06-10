/* ===========================================================
   Trento Live Activity — EVENTI page
   =========================================================== */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../lib/i18n";
import { Header } from "../components/layout/Header";
import { Avatars } from "../components/redesign/Avatars";
import { Widget, useGlow } from "../components/redesign/widgets";
import { CAT_ICON } from "../data/redesignData";
import { Icon } from "../components/ui/Icon";
import { catColor, catLabel as tlaCatLabel } from "../data/redesignData";
import { CommentsSection } from "../components/redesign/CommentsSection";
import { getEvents, joinEvent, leaveEvent, addFavorite, removeFavorite, getFavorites, ApiEvent, ApiError } from "../lib/api";

/* ---- gradient "media" per category (matches home thumbnails) ---- */
const EV_GRAD: Record<string, string> = {
  musica:   "linear-gradient(140deg,#db2777,#831843)",
  cultura:  "linear-gradient(140deg,#7c3aed,#4c1d95)",
  cibo:     "linear-gradient(140deg,#d97706,#7c2d12)",
  outdoor:  "linear-gradient(140deg,#0d9488,#134e4a)",
  sport:    "linear-gradient(140deg,#059669,#064e3b)",
  famiglia: "linear-gradient(140deg,#0ea5e9,#075985)",
};

const EV_FILTERS = [
  { id: "all",      label: "events.filters.all",      color: "var(--cyan)",    icon: "grid" },
  { id: "musica",   label: "events.filters.musica",   color: "var(--magenta)", icon: "music" },
  { id: "cultura",  label: "events.filters.cultura",  color: "var(--violet)",  icon: "landmark" },
  { id: "cibo",     label: "events.filters.cibo",     color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  label: "events.filters.outdoor",  color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", label: "events.filters.famiglia", color: "var(--cyan)",    icon: "family" },
];

const uiLocale = () => (i18n.language?.startsWith("en") ? "en-GB" : "it-IT");
const fmt = (n?: number) => (n || 0).toLocaleString(uiLocale());

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

function MiniCalendar({ events = [] }: any) {
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
          {weekDays.map((d, i) => (
            <div key={d.toISOString()} className={"cal-day" + (sameDay(d, today) ? " sel" : "")} aria-current={sameDay(d, today) ? "date" : undefined}>
              {d.getDate()}
              {eventDays[i] && <span className="dot"></span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== QUICK FILTERS ===================== */
function QuickFilters({ active, setActive, counts }: any) {
  const { t } = useTranslation();
  return (
    <Widget title={t("events.filters.title")} accent="var(--cyan)" delay={140}>
      <div className="qf-list">
        {EV_FILTERS.map((f) => (
          <button key={f.id} className={"qf-item" + (active === f.id ? " active" : "")}
            style={{ "--qc": f.color } as React.CSSProperties} onClick={() => setActive(f.id)}>
            <span className="qf-ic"><Icon name={f.icon} size={16} /></span>
            <span className="qf-label">{t(f.label)}</span>
            <span className="qf-count">{counts[f.id] || 0}</span>
          </button>
        ))}
      </div>
    </Widget>
  );
}

/* ===================== MOST PARTICIPATED ===================== */
function MostParticipated({ list, onPick }: any) {
  const { t } = useTranslation();
  const top = [...list]
    .sort((a: any, b: any) => (b.participantCount || 0) - (a.participantCount || 0))
    .slice(0, 3);
  return (
    <Widget title={t("events.mostParticipated")} accent="var(--magenta)" delay={220}>
      {top.map((t: any, i: number) => (
        <button className="trend-row" key={t.id} onClick={() => onPick(t.id)}>
          <span className="trend-rank">{i + 1}</span>
          <span className="trend-body">
            <span className="trend-title">{t.title}</span>
            <span className="trend-loc">{t.location || "Trento"}</span>
          </span>
          <span className="trend-count"><Icon name="users" size={13} />{fmt(t.participantCount)}</span>
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
          style={{ background: "none", border: "none", color: "white", outline: "none", width: "100%", fontSize: 14 }}
        />
      </div>
    </div>
  );
}

/* ===================== EVENT POST CARD ===================== */
function PostCard({ e, liked, saved, onLike, onSave, onOpen, flash }: any) {
  const { t } = useTranslation();
  const onMove = useGlow();
  const color = catColor(e.category);
  const catLabel = tlaCatLabel(e.category);
  // The list API doesn't return a like total yet, so only show a count once it's real.
  const hasLikeCount = typeof e.likes === "number";
  const likes = (e.likes || 0) + (liked ? 1 : 0);
  const hasCommentCount = typeof e.commentsCount === "number";
  const stop = (fn: any) => (ev: any) => { ev.stopPropagation(); fn(); };
  return (
    <div className={"post" + (flash ? " flash" : "")} data-post={e.id}
      style={{ "--pc": color, "--pimg": EV_GRAD[e.category] || EV_GRAD.musica, "--mx": "50%", "--my": "0%" } as React.CSSProperties}
      onMouseMove={onMove} onClick={() => onOpen(e.id)}>
      <div className="post-media">
        <div className="pm-badges">
          {e.isCertified
            ? <span className="pm-live" style={{ background: "var(--teal)" }}><Icon name="shieldCheck" size={11} />{t("events.certified")}</span>
            : <span className="pm-tag"><Icon name={CAT_ICON[e.category] || "activity"} size={12} />{catLabel}</span>}
          {e.participantCount && e.participantCount > 20 && <span className="pm-feat"><Icon name="flame" size={11} />{t("events.popular")}</span>}
        </div>
        <span className="pm-ghost"><Icon name={CAT_ICON[e.category] || "activity"} size={116} /></span>
      </div>
      <div className="post-content">
        <div className="post-cat"><span className="pc-ic" style={{ color }}><Icon name={CAT_ICON[e.category] || "activity"} size={12} /></span>{catLabel}</div>
        <div className="post-title">{e.title}</div>
        <div className="post-desc">{e.description}</div>
        <div className="post-meta">
          <span className="pm"><Icon name="pin" size={14} />{e.location || "Trento"}</span>
          <span className="pm"><Icon name="clock" size={14} />{e.dateTime || e.createdAt || t("events.today")}</span>
        </div>
        <div className="post-foot">
          <Avatars ids={[0, 1, 2]} extra={Math.max(0, (e.participantCount || 0) - 3)} />
          <span className="attend-count"><b>{fmt(e.participantCount)}</b> {t("events.participantsWord", { count: e.participantCount || 0 })}</span>
          <div className="post-actions">
            <button className={"act-btn" + (liked ? " on" : "")} onClick={stop(() => onLike(e.id))} aria-label={t("events.ariaLike")} aria-pressed={liked}>
              <Icon name="heart" size={17} />{hasLikeCount ? fmt(likes) : null}
            </button>
            <button className="act-btn" onClick={stop(() => onOpen(e.id))} aria-label={t("events.ariaComments")}>
              <Icon name="comment" size={17} />{hasCommentCount ? e.commentsCount : null}
            </button>
            <button className="act-btn icon-only" onClick={stop(() => {})} aria-label={t("events.ariaShare")}><Icon name="share" size={17} /></button>
            <button className={"act-btn save icon-only" + (saved ? " on" : "")} onClick={stop(() => onSave(e.id))} aria-label={t("events.ariaSave")}><Icon name="bookmark" size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== FEED ===================== */
const Feed = React.forwardRef<any, any>(function Feed({ events, user, search, setSearch, likes, saves, onLike, onSave, onOpen, flashId }, ref) {
  const { t } = useTranslation();
  return (
    <div className="ev-col feed" ref={ref}>
      <Composer user={user} search={search} setSearch={setSearch} />
      {events.length === 0 && (
        <div className="feed-state empty">
          <Icon name="calendar" size={20} />
          <div className="feed-state-title">{search ? t("events.emptyNoResultsTitle") : t("events.emptyNoEventsTitle")}</div>
          <div className="feed-state-msg">{search ? t("events.emptyNoResultsMsg") : t("events.emptyNoEventsMsg")}</div>
        </div>
      )}
      {events.map((e: any) => (
        <div className="feed-row" key={e.id}>
          <div className="tl">
            <span className={"tl-node" + (e.isCertified ? " live" : "")} style={{ "--tc": catColor(e.category) } as React.CSSProperties}></span>
            <span className={"tl-label" + (e.isCertified ? " live" : "")}>{e.startTime || t("events.live")}</span>
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
function NextActivity({ event, joined, saved, onJoin, onSave }: any) {
  const { t } = useTranslation();
  if (!event) {
    return (
      <Widget title={t("events.next")} accent="var(--cyan)" upd={t("events.none")} delay={120}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
          {t("events.noUpcoming")}
        </div>
      </Widget>
    );
  }
  const pct = Math.round(((event.participantCount || 0) / (event.maxPartecipanti || 100)) * 100);
  return (
    <Widget title={t("events.next")} accent="var(--accent)" upd={t("events.upcoming")} delay={120}>
      <div className="next-media" style={{ "--nimg": EV_GRAD[event.category] || EV_GRAD.musica } as React.CSSProperties}>
        <span className="nm-count">
          <span className="led live green"></span>
          <span><span className="lbl">{t("events.upcomingBadge")}</span></span>
        </span>
        <span className="nm-ghost"><Icon name={CAT_ICON[event.category] || "activity"} size={96} /></span>
      </div>
      <div className="next-title">{event.title}</div>
      <div className="next-fields">
        <div className="next-field">
          <span className="nf-ic"><Icon name="pin" size={14} /></span>
          <div><div className="nf-lbl">{t("events.place")}</div><div className="nf-val">{event.location || "Trento"}</div></div>
        </div>
        <div className="next-field">
          <span className="nf-ic"><Icon name="clock" size={14} /></span>
          <div><div className="nf-lbl">{t("events.when")}</div><div className="nf-val">{event.dateTime || t("events.today")}</div></div>
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
        <button className={"next-cta" + (joined ? " joined" : "")} onClick={onJoin} aria-pressed={joined}>
          <Icon name={joined ? "check" : "ticket"} size={17} />{joined ? t("events.joinedCta") : t("events.joinCta")}
        </button>
        <button className={"next-save" + (saved ? " on" : "")} onClick={onSave} aria-label={t("events.ariaSaveEvent")}><Icon name="bookmark" size={19} /></button>
      </div>
    </Widget>
  );
}

/* ===================== CITY EVENTS GRID ===================== */
function CityGrid({ list, onOpen }: any) {
  return (
    <Widget title="Eventi in città" accent="var(--teal)" upd={list.length + " totali"} delay={220}
      style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" }}>
      <div className="city-grid">
        {list.map((e: any) => {
          const color = catColor(e.category);
          return (
            <button className="mini" key={e.id} style={{ "--mc": color, "--mimg": EV_GRAD[e.category] || EV_GRAD.musica } as React.CSSProperties} onClick={() => onOpen(e.id)}>
              <div className="mini-media">
                <span className="mled" style={{ animation: e.isCertified ? "ledPulse 2.6s ease-in-out infinite" : "none" }}></span>
                <span className="pm-ghost" style={{ right: -8, bottom: -10 }}><Icon name={CAT_ICON[e.category] || "activity"} size={52} /></span>
              </div>
              <div className="mini-body">
                <div className="mini-time">{e.startTime || "Live"}</div>
                <div className="mini-title">{e.title}</div>
                <div className="mini-cat"><Icon name={CAT_ICON[e.category] || "activity"} size={11} />{tlaCatLabel(e.category)}</div>
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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [saves, setSaves] = useState<Record<string, boolean>>({});

  const feedRef = useRef<any>(null);

  // Load events
  const loadEventsData = async () => {
    setError(null);
    try {
      const data = await getEvents({
        q: search || undefined,
        categoria: filter === "all" ? undefined : filter
      });
      setEvents(data);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Impossibile caricare gli eventi. Riprova.");
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
  }, [filter, search, user?.id]);

  const requireAuth = () => {
    if (user?.role !== "anonymous" && user?.id) return true;
    setPage("login");
    return false;
  };

  const handleLike = (id: string) => {
    if (!requireAuth()) return;
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const handleOpenDetail = (id: string) => {
    setSelectedEventId(id);
    setPage("evento-dettaglio");
  };

  // Pre-calculate filter category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    events.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  }, [events]);

  const nextEvent = events.length > 0 ? events[0] : null;

  if (loading) {
    return (
      <div className="events-scene">
        <div className="events-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 15, padding: "100px 0", textAlign: "center" }}>
          Caricamento eventi...
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
          <div className="feed-state-title">Qualcosa è andato storto</div>
          <div className="feed-state-msg">{error}</div>
          <button className="feed-state-retry" onClick={() => { setLoading(true); loadEventsData(); }}>Riprova</button>
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
          <MiniCalendar events={events} />
          <QuickFilters active={filter} setActive={setFilter} counts={categoryCounts} />
          <MostParticipated list={events} onPick={handleOpenDetail} />
        </div>

        {/* CENTER */}
        <Feed ref={feedRef} events={events} user={user} search={search} setSearch={setSearch}
          likes={likes} saves={saves} onLike={handleLike} onSave={handleSave} onOpen={handleOpenDetail} flashId={null} />

        {/* RIGHT */}
        <div className="ev-col right">
          <NextActivity
            event={nextEvent}
            joined={nextEvent ? !!(nextEvent.participantIds?.includes(user?.id || "")) : false}
            saved={nextEvent ? !!saves[nextEvent.id] : false}
            onJoin={async () => {
              if (!nextEvent) return;
              if (!requireAuth()) return;
              const isJoined = !!(nextEvent.participantIds?.includes(user?.id || ""));
              try {
                if (isJoined) {
                  await leaveEvent(nextEvent.id);
                } else {
                  await joinEvent(nextEvent.id);
                }
                loadEventsData();
              } catch (err) {
                console.error(err);
              }
            }}
            onSave={() => nextEvent && handleSave(nextEvent.id)}
          />
          <CityGrid list={events.slice(1)} onOpen={handleOpenDetail} />
        </div>
      </div>
    </div>
  );
}
