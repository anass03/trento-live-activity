/* ===========================================================
   Trento Live Activity — EVENTI page
   =========================================================== */
import React, { useEffect, useRef, useState } from "react";
import { Header } from "../components/layout/Header";
import { Avatars } from "../components/redesign/Avatars";
import { CAT_ICON, Widget, useGlow } from "../components/redesign/widgets";
import { Icon } from "../components/ui/Icon";
import { catColor, catLabel as tlaCatLabel } from "../data/redesignData";
import { CommentsSection } from "../components/redesign/CommentsSection";
import { getEvents, joinEvent, leaveEvent, addFavorite, removeFavorite, getFavorites, ApiEvent } from "../lib/api";

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
  { id: "all",      label: "Tutti gli eventi", color: "var(--cyan)",    icon: "grid" },
  { id: "musica",   label: "Musica",           color: "var(--magenta)", icon: "music" },
  { id: "cultura",  label: "Cultura",          color: "var(--violet)",  icon: "landmark" },
  { id: "cibo",     label: "Food & Drink",     color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  label: "Outdoor",          color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", label: "Famiglia",         color: "var(--cyan)",    icon: "family" },
];

const fmt = (n?: number) => (n || 0).toLocaleString("it-IT");

/* ===================== MINI CALENDAR ===================== */
function MiniCalendar() {
  const onMove = useGlow();
  const [sel, setSel] = useState(16);
  const days = [13, 14, 15, 16, 17, 18, 19];
  const dows = ["L", "M", "M", "G", "V", "S", "D"];
  const hasEvent: Record<number, boolean> = { 16: true, 17: true, 18: true };
  return (
    <div className="widget anim-in" style={{ "--accent": "var(--violet)", animationDelay: "60ms" } as React.CSSProperties} onMouseMove={onMove}>
      <div className="widget-inner">
        <div className="cal-head">
          <div className="cal-month">Maggio 2026</div>
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
function QuickFilters({ active, setActive, counts }: any) {
  return (
    <Widget title="Filtri rapidi" accent="var(--cyan)" delay={140}>
      <div className="qf-list">
        {EV_FILTERS.map((f) => (
          <button key={f.id} className={"qf-item" + (active === f.id ? " active" : "")}
            style={{ "--qc": f.color } as React.CSSProperties} onClick={() => setActive(f.id)}>
            <span className="qf-ic"><Icon name={f.icon} size={16} /></span>
            <span className="qf-label">{f.label}</span>
            <span className="qf-count">{counts[f.id] || 0}</span>
          </button>
        ))}
      </div>
    </Widget>
  );
}

/* ===================== TRENDING TONIGHT ===================== */
function TrendingTonight({ list, onPick }: any) {
  return (
    <Widget title="Trending tonight" accent="var(--magenta)" upd="Live" delay={220}>
      {list.slice(0, 3).map((t: any, i: number) => (
        <button className="trend-row" key={t.id} onClick={() => onPick(t.id)}>
          <span className="trend-rank">{i + 1}</span>
          <span className="trend-body">
            <span className="trend-title">{t.title}</span>
            <span className="trend-loc">{t.location || "Trento"}</span>
          </span>
          <span className="trend-count"><Icon name="flame" size={13} />{fmt(t.participantCount)}</span>
        </button>
      ))}
      {list.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "10px 0", textAlign: "center" }}>
          Nessun evento trending oggi
        </div>
      )}
    </Widget>
  );
}

/* ===================== LIVE NOW ===================== */
function LiveNow({ count }: any) {
  const bars = [0.5, 0.85, 0.35, 1, 0.6, 0.9, 0.45];
  return (
    <Widget title="Live ora a Trento" accent="var(--green)" upd="In diretta" delay={300}>
      <div className="live-now">
        <div className="live-num">
          <b>{count}</b>
          <span>Eventi totali</span>
        </div>
        <div className="eq" aria-hidden="true">
          {bars.map((b, i) => <i key={i} style={{ animationDelay: `${i * 0.13}s`, animationDuration: `${1.1 + b * 0.7}s` } as React.CSSProperties}></i>)}
        </div>
      </div>
    </Widget>
  );
}

/* ===================== COMPOSER / DISCOVERY ===================== */
function Composer({ user, search, setSearch }: any) {
  return (
    <div className="composer">
      <div className="avatar">{user?.avatar || "MR"}</div>
      <div className="composer-field" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <Icon name="search" size={17} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca o scopri eventi per stasera…"
          style={{ background: "none", border: "none", color: "white", outline: "none", width: "100%", fontSize: 14 }}
        />
      </div>
    </div>
  );
}

/* ===================== EVENT POST CARD ===================== */
function PostCard({ e, liked, saved, onLike, onSave, onOpen, flash }: any) {
  const onMove = useGlow();
  const color = catColor(e.category);
  const catLabel = tlaCatLabel(e.category);
  const likes = (e.likes || 0) + (liked ? 1 : 0);
  const stop = (fn: any) => (ev: any) => { ev.stopPropagation(); fn(); };
  return (
    <div className={"post" + (flash ? " flash" : "")} data-post={e.id}
      style={{ "--pc": color, "--pimg": EV_GRAD[e.category] || EV_GRAD.musica, "--mx": "50%", "--my": "0%" } as React.CSSProperties}
      onMouseMove={onMove} onClick={() => onOpen(e.id)}>
      <div className="post-media">
        <div className="pm-badges">
          {e.isCertified
            ? <span className="pm-live" style={{ background: "var(--teal)" }}><Icon name="shieldCheck" size={11} />Certificato</span>
            : <span className="pm-tag"><Icon name={CAT_ICON[e.category] || "activity"} size={12} />{catLabel}</span>}
          {e.participantCount && e.participantCount > 20 && <span className="pm-feat"><Icon name="flame" size={11} />Popolare</span>}
        </div>
        <span className="pm-ghost"><Icon name={CAT_ICON[e.category] || "activity"} size={116} /></span>
      </div>
      <div className="post-content">
        <div className="post-cat"><span className="pc-ic" style={{ color }}><Icon name={CAT_ICON[e.category] || "activity"} size={12} /></span>{catLabel}</div>
        <div className="post-title">{e.title}</div>
        <div className="post-desc">{e.description}</div>
        <div className="post-meta">
          <span className="pm"><Icon name="pin" size={14} />{e.location || "Trento"}</span>
          <span className="pm"><Icon name="clock" size={14} />{e.dateTime || e.createdAt || "Oggi"}</span>
        </div>
        <div className="post-foot">
          <Avatars ids={[0, 1, 2]} extra={Math.max(0, (e.participantCount || 0) - 3)} />
          <span className="attend-count"><b>{fmt(e.participantCount)}</b> partecipanti</span>
          <div className="post-actions">
            <button className={"act-btn" + (liked ? " on" : "")} onClick={stop(() => onLike(e.id))} aria-label="Mi interessa">
              <Icon name="heart" size={17} />{fmt(likes)}
            </button>
            <button className="act-btn" onClick={stop(() => onOpen(e.id))} aria-label="Commenti">
              <Icon name="comment" size={17} />{e.commentsCount || 0}
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
const Feed = React.forwardRef<any, any>(function Feed({ events, user, search, setSearch, likes, saves, onLike, onSave, onOpen, flashId }, ref) {
  return (
    <div className="ev-col feed" ref={ref}>
      <Composer user={user} search={search} setSearch={setSearch} />
      {events.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "40px 8px", textAlign: "center" }}>
          Nessun evento stasera.
        </div>
      )}
      {events.map((e: any) => (
        <div className="feed-row" key={e.id}>
          <div className="tl">
            <span className={"tl-node" + (e.isCertified ? " live" : "")} style={{ "--tc": catColor(e.category) } as React.CSSProperties}></span>
            <span className={"tl-label" + (e.isCertified ? " live" : "")}>{e.startTime || "Live"}</span>
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
  if (!event) {
    return (
      <Widget title="Prossimo evento" accent="var(--cyan)" upd="Nessuno" delay={120}>
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
          Nessun evento programmato in arrivo
        </div>
      </Widget>
    );
  }
  const pct = Math.round(((event.participantCount || 0) / (event.maxPartecipanti || 100)) * 100);
  return (
    <Widget title="Prossimo evento" accent="var(--accent)" upd="In arrivo" delay={120}>
      <div className="next-media" style={{ "--nimg": EV_GRAD[event.category] || EV_GRAD.musica } as React.CSSProperties}>
        <span className="nm-count">
          <span className="led live green"></span>
          <span><span className="lbl">IN ARRIVO</span></span>
        </span>
        <span className="nm-ghost"><Icon name={CAT_ICON[event.category] || "activity"} size={96} /></span>
      </div>
      <div className="next-title">{event.title}</div>
      <div className="next-fields">
        <div className="next-field">
          <span className="nf-ic"><Icon name="pin" size={14} /></span>
          <div><div className="nf-lbl">Luogo</div><div className="nf-val">{event.location || "Trento"}</div></div>
        </div>
        <div className="next-field">
          <span className="nf-ic"><Icon name="clock" size={14} /></span>
          <div><div className="nf-lbl">Quando</div><div className="nf-val">{event.dateTime || "Oggi"}</div></div>
        </div>
      </div>
      <div className="next-part">
        <div className="np-l">
          <div className="nf-lbl">Partecipanti</div>
          <div className="np-bar"><i style={{ width: Math.max(8, pct) + "%" }}></i></div>
        </div>
        <div className="np-n"><b>{event.participantCount || 0}</b> {event.maxPartecipanti ? `/ ${event.maxPartecipanti}` : ""}</div>
      </div>
      <div className="next-cta-row">
        <button className={"next-cta" + (joined ? " joined" : "")} onClick={onJoin}>
          <Icon name="ticket" size={17} />{joined ? "Partecipi!" : "Partecipa all'evento"}
        </button>
        <button className={"next-save" + (saved ? " on" : "")} onClick={onSave} aria-label="Salva evento"><Icon name="bookmark" size={19} /></button>
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

  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [saves, setSaves] = useState<Record<string, boolean>>({});

  const feedRef = useRef<any>(null);

  // Load events
  const loadEventsData = async () => {
    try {
      const data = await getEvents({
        q: search || undefined,
        categoria: filter === "all" ? undefined : filter
      });
      setEvents(data);

      // Load favorites
      if (user?.id) {
        const favs = await getFavorites();
        const savesMap: Record<string, boolean> = {};
        favs.forEach((f) => {
          if (f.markerType === "event") savesMap[f.markerId] = true;
        });
        setSaves(savesMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventsData();
  }, [filter, search, user?.id]);

  const handleLike = (id: string) => {
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async (id: string) => {
    const isSaved = !!saves[id];
    setSaves((prev) => ({ ...prev, [id]: !isSaved }));
    try {
      if (isSaved) {
        await removeFavorite("event", id);
      } else {
        await addFavorite("event", id);
      }
    } catch (err) {
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

  return (
    <div className="events-scene">
      <div className="events-header">
        <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      </div>

      <div className="events-layout">
        {/* LEFT */}
        <div className="ev-col left">
          <MiniCalendar />
          <QuickFilters active={filter} setActive={setFilter} counts={categoryCounts} />
          <TrendingTonight list={events} onPick={handleOpenDetail} />
          <LiveNow count={events.length} />
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
