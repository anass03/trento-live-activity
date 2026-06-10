import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bike, Bookmark, ChevronLeft, ChevronRight, Clock, Dumbbell,
  Flame, Heart, Landmark, MapPin, Music, Search, Share2,
  TrendingUp, Users, UtensilsCrossed, Zap,
} from 'lucide-react';
import {
  getEvents, getToken, joinEvent, leaveEvent, reportEvent,
  type ApiEvent,
} from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDateTime, formatDay } from '../lib/formatters';
import type { AppUser } from '../data/mockUser';
import { Widget, Avatars, EventModal, useGlow, type EventData } from '../components/redesign';

/* ─── category visuals ──────────────────────────────────── */

const CAT_COLORS: Record<string, string> = {
  musica: '#db2777', cultura: '#7c3aed', sport: '#059669',
  cibo: '#d97706', outdoor: '#0d9488', famiglia: '#0ea5e9',
};
const CAT_GRADIENTS: Record<string, string> = {
  musica: 'linear-gradient(140deg,#db2777,#831843)',
  cultura: 'linear-gradient(140deg,#7c3aed,#4c1d95)',
  cibo: 'linear-gradient(140deg,#d97706,#7c2d12)',
  outdoor: 'linear-gradient(140deg,#0d9488,#134e4a)',
  sport: 'linear-gradient(140deg,#059669,#064e3b)',
  famiglia: 'linear-gradient(140deg,#0ea5e9,#075985)',
};
const CAT_ICON: Record<string, typeof Music> = {
  musica: Music, cultura: Landmark, sport: Dumbbell,
  cibo: UtensilsCrossed, outdoor: Bike, famiglia: Users,
};
const CATEGORY_LIST = ['musica', 'cultura', 'sport', 'cibo', 'outdoor', 'famiglia'] as const;

const REPORT_TYPES = ['contenuto_inappropriato', 'spam', 'disinformazione', 'altro'];

/* ─── avatar palette helpers ────────────────────────────── */

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#a855f7)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#3b82f6)',
];

function generateAvatars(count: number) {
  const n = Math.min(count, 3);
  return {
    avatars: Array.from({ length: n }, (_, i) => ({
      initials: String.fromCharCode(65 + (i % 26)),
      gradient: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
    })),
    extra: Math.max(0, count - 3),
  };
}

/* ─── date helpers (same logic as before) ───────────────── */

function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasExplicitTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (!hasExplicitTimezone) {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endDateFromStartAndTime(start: Date, endTime?: string | null): Date {
  const end = new Date(start);
  const time = endTime?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!time) return end;
  end.setHours(Number(time[1]), Number(time[2]), Number(time[3] ?? 0), 0);
  if (end < start) end.setDate(end.getDate() + 1);
  return end;
}

function happensToday(event: ApiEvent, ref: Date): boolean {
  const start = parseLocalDateTime(event.dateTime);
  if (!start) return false;
  const end = endDateFromStartAndTime(start, event.endTime);
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return start < dayEnd && end >= dayStart;
}

function isUpcomingWeekend(dateStr: string | null | undefined): boolean {
  const date = parseLocalDateTime(dateStr);
  if (!date) return false;
  const day = date.getDay();
  return date >= new Date() && (day === 0 || day === 6);
}

function isHappeningNow(event: ApiEvent): boolean {
  const start = parseLocalDateTime(event.dateTime);
  if (!start) return false;
  const end = endDateFromStartAndTime(start, event.endTime);
  const now = new Date();
  return start <= now && end >= now;
}

/* ─── calendar helpers ──────────────────────────────────── */

function getMonthMatrix(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const start = firstDay === 0 ? 6 : firstDay - 1; // Monday start
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(start).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/* ════════════════════════════════════════════════════════════
 *  EVENTS PAGE
 * ════════════════════════════════════════════════════════════ */

export function EventsPage({ certifiedOnly = false, user }: { certifiedOnly?: boolean; user?: AppUser }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const openId = searchParams.get('open');

  /* ── core state ─────────────────────────────────────── */
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'weekend'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [partLoading, setPartLoading] = useState<string | null>(null);
  const [partError, setPartError] = useState<{ id: string; text: string } | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  /* report state */
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportTipo, setReportTipo] = useState(REPORT_TYPES[0]);
  const [reportMsg, setReportMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  /* calendar state */
  const now = useMemo(() => new Date(), []);
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  const isLoggedIn = !!getToken() && user?.role !== 'anonymous';
  const userId = user?.id;
  const isCitizen = user?.role === 'registered_user';
  const canReport = isLoggedIn && user?.role !== 'certified_entity';

  const onMove = useGlow();

  /* ── data loading ───────────────────────────────────── */

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) { setIsLoading(true); setError(null); }
    try { setEvents(await getEvents()); }
    catch (e) { if (!silent) setError(e instanceof Error ? e.message : t('events.loading')); }
    finally { if (!silent) setIsLoading(false); }
  }, [t]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);
  useAutoRefresh(() => loadEvents(true), 30_000);

  useEffect(() => {
    if (!openId || events.length === 0) return;
    const target = events.find((e) => String(e.id) === openId);
    if (target) setSelectedEvent(target);
  }, [events, openId]);

  /* ── filtering ──────────────────────────────────────── */

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (certifiedOnly && !event.isCertified) return false;
    if (timeFilter === 'today' && !happensToday(event, new Date())) return false;
    if (timeFilter === 'weekend' && !isUpcomingWeekend(event.dateTime)) return false;
    if (categoryFilter && event.category !== categoryFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${event.title} ${event.description || ''} ${event.category} ${event.location || ''}`.toLowerCase().includes(q);
  }), [certifiedOnly, events, search, timeFilter, categoryFilter]);

  /* ── derived data ───────────────────────────────────── */

  const liveNowCount = useMemo(() => events.filter(isHappeningNow).length, [events]);

  const trendingEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => (b.participantCount ?? 0) - (a.participantCount ?? 0)).slice(0, 5),
    [filteredEvents],
  );

  const upcomingEvent = useMemo(() => {
    const upcoming = filteredEvents
      .filter((ev) => ev.dateTime && new Date(ev.dateTime) >= new Date())
      .sort((a, b) => new Date(a.dateTime!).getTime() - new Date(b.dateTime!).getTime());
    return upcoming[0] ?? null;
  }, [filteredEvents]);

  const cityEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.dateTime && new Date(ev.dateTime) >= new Date()).slice(0, 6),
    [filteredEvents],
  );

  /* days with events (for calendar widget) */
  const eventDays = useMemo(() => {
    const days = new Set<number>();
    events.forEach((ev) => {
      const d = parseLocalDateTime(ev.dateTime);
      if (d && d.getMonth() === calMonth && d.getFullYear() === calYear) {
        days.add(d.getDate());
      }
    });
    return days;
  }, [events, calMonth, calYear]);

  const calendarMatrix = useMemo(() => getMonthMatrix(calYear, calMonth), [calYear, calMonth]);

  /* count by category */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach((ev) => {
      counts[ev.category] = (counts[ev.category] || 0) + 1;
    });
    return counts;
  }, [filteredEvents]);

  /* ── participation handlers ─────────────────────────── */

  async function handleJoinEvent(eventId: string) {
    setPartLoading(eventId); setPartError(null);
    try {
      const result = await joinEvent(eventId);
      setEvents((prev) => prev.map((ev) => ev.id === eventId && userId
        ? { ...ev, participantCount: result.participantCount, participantIds: [...(ev.participantIds || []), userId] }
        : ev));
    } catch (e) { setPartError({ id: eventId, text: e instanceof Error ? e.message : t('common.error') }); }
    finally { setPartLoading(null); }
  }

  async function handleLeaveEvent(eventId: string) {
    setPartLoading(eventId); setPartError(null);
    try {
      const result = await leaveEvent(eventId);
      setEvents((prev) => prev.map((ev) => ev.id === eventId && userId
        ? { ...ev, participantCount: result.participantCount, participantIds: (ev.participantIds || []).filter((p) => p !== userId) }
        : ev));
    } catch (e) { setPartError({ id: eventId, text: e instanceof Error ? e.message : t('common.error') }); }
    finally { setPartLoading(null); }
  }

  async function submitReport(eventId: string) {
    try { await reportEvent(eventId, reportTipo); setReportMsg({ id: eventId, ok: true, text: t('events.reportSent') }); }
    catch (e) { setReportMsg({ id: eventId, ok: false, text: e instanceof Error ? e.message : t('common.error') }); }
    finally { setReportingId(null); }
  }

  /* ── like / save (local toggle) ─────────────────────── */

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ── calendar nav ───────────────────────────────────── */

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  const monthName = new Date(calYear, calMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  /* ── PostCard renderer ──────────────────────────────── */

  function renderPostCard(event: ApiEvent) {
    const catKey = event.category?.toLowerCase() ?? '';
    const color = CAT_COLORS[catKey] || '#7c3aed';
    const gradient = CAT_GRADIENTS[catKey] || CAT_GRADIENTS.cultura;
    const CatIcon = CAT_ICON[catKey] || Landmark;
    const { avatars, extra } = generateAvatars(event.participantCount ?? 0);
    const isJoined = !!(userId && event.participantIds?.includes(userId));
    const liked = likedIds.has(event.id);
    const saved = savedIds.has(event.id);

    return (
      <div
        key={event.id}
        className="post"
        style={{ '--pc': color } as CSSProperties}
        onMouseMove={onMove}
        onClick={() => setSelectedEvent(event)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(event); }}
      >
        <div className="post-media" style={{ '--pimg': gradient } as CSSProperties}>
          <div className="pm-tag"><CatIcon size={12} />{event.category}</div>
          {event.isCertified && <div className="pm-feat">{t('events.certified')}</div>}
        </div>
        <div className="post-content">
          <div className="post-cat">
            <span className="pc-ic"><CatIcon size={12} /></span>{event.category}
          </div>
          <div className="post-title">{event.title}</div>
          <div className="post-desc">{event.description || t('events.noDescription')}</div>
          <div className="post-meta">
            <span className="pm"><MapPin size={14} /><b>{event.location || t('common.dateTBD')}</b></span>
            <span className="pm"><Clock size={14} />{formatDateTime(event.dateTime)}</span>
          </div>
          <div className="post-foot">
            <Avatars avatars={avatars} extra={extra} />
            <span className="attend-count"><b>{event.participantCount ?? 0}</b> {t('common.participants').toLowerCase()}</span>
            <div className="post-actions">
              {isCitizen && (
                isJoined
                  ? <button
                      type="button"
                      className="pa-btn joined"
                      disabled={partLoading === event.id}
                      onClick={(e) => { e.stopPropagation(); handleLeaveEvent(event.id); }}
                      aria-label={t('events.leave')}
                    >
                      <Users size={14} />
                    </button>
                  : <button
                      type="button"
                      className="pa-btn"
                      disabled={partLoading === event.id}
                      onClick={(e) => { e.stopPropagation(); handleJoinEvent(event.id); }}
                      aria-label={t('events.join')}
                    >
                      <Users size={14} />
                    </button>
              )}
              <button
                type="button"
                className={`pa-btn${liked ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleLike(event.id); }}
                aria-label="Like"
              >
                <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className={`pa-btn${saved ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleSave(event.id); }}
                aria-label="Save"
              >
                <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className="pa-btn"
                onClick={(e) => { e.stopPropagation(); }}
                aria-label="Share"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
          {/* participation error inline */}
          {partError?.id === event.id && (
            <small className="error-message" style={{ marginTop: 4 }}>{partError.text}</small>
          )}
          {/* report controls */}
          {canReport && reportMsg?.id !== event.id && (
            reportingId === event.id ? (
              <div className="report-controls" onClick={(e) => e.stopPropagation()}>
                <select value={reportTipo} onChange={(e) => setReportTipo(e.target.value)}>
                  {REPORT_TYPES.map((tipo) => <option key={tipo} value={tipo}>{tipo.replace(/_/g, ' ')}</option>)}
                </select>
                <button className="danger-button compact-button" type="button" onClick={() => submitReport(event.id)}>{t('common.submit')}</button>
                <button className="ghost-button compact-button" type="button" onClick={() => setReportingId(null)}>{t('common.cancel')}</button>
              </div>
            ) : (
              <button
                className="ghost-button compact-button"
                type="button"
                style={{ marginTop: 4, fontSize: 11 }}
                onClick={(e) => { e.stopPropagation(); setReportingId(event.id); setReportMsg(null); }}
              >
                {t('events.report')}
              </button>
            )
          )}
          {reportMsg?.id === event.id && (
            <small className={reportMsg.ok ? 'success-message' : 'error-message'} style={{ marginTop: 4 }}>
              {reportMsg.text}
            </small>
          )}
        </div>
      </div>
    );
  }

  /* ── EventModal adapter ─────────────────────────────── */

  function toEventData(ev: ApiEvent): EventData {
    return {
      id: ev.id,
      title: ev.title,
      description: ev.description || '',
      place: ev.location || t('common.dateTBD'),
      dateTime: formatDateTime(ev.dateTime),
      category: ev.category,
      going: ev.participantCount ?? 0,
      cap: ev.maxPartecipanti ?? 999,
      isLiked: likedIds.has(ev.id),
      isSaved: savedIds.has(ev.id),
    };
  }

  /* ── time filter chips ──────────────────────────────── */

  const timeChips: { key: 'all' | 'today' | 'weekend'; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'today', label: t('filters.today') },
    { key: 'weekend', label: t('filters.weekend') },
  ];

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <div className="events-scene">
      <div className="events-layout">
        {/* ─────────── LEFT COLUMN ─────────── */}
        <div className="ev-col">
          {/* Calendar Widget */}
          <Widget title={t('events.calendar', 'CALENDARIO')} delay={0}>
            <div className="cal-head">
              <button type="button" className="cal-nav" onClick={prevMonth} aria-label={t('common.previous', 'Precedente')}>
                <ChevronLeft size={14} />
              </button>
              <span className="cal-month">{monthName}</span>
              <button type="button" className="cal-nav" onClick={nextMonth} aria-label={t('common.next', 'Successivo')}>
                <ChevronRight size={14} />
              </button>
            </div>
            <table className="cal-grid">
              <thead>
                <tr>
                  {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => <th key={i}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {calendarMatrix.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) => {
                      const hasEvent = day !== null && eventDays.has(day);
                      const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                      return (
                        <td key={di} className={[hasEvent ? 'has-ev' : '', isToday ? 'today' : ''].filter(Boolean).join(' ')}>
                          {day ?? ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Widget>

          {/* Quick Filters Widget */}
          <Widget title={t('events.quickFilters', 'FILTRI RAPIDI')} delay={80}>
            <ul className="filter-list">
              {CATEGORY_LIST.map((cat) => {
                const CIcon = CAT_ICON[cat] || Landmark;
                const active = categoryFilter === cat;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      className={`fl-btn${active ? ' active' : ''}`}
                      style={{ '--fc': CAT_COLORS[cat] } as CSSProperties}
                      onClick={() => setCategoryFilter(active ? null : cat)}
                    >
                      <CIcon size={14} />
                      <span>{cat}</span>
                      <small>{categoryCounts[cat] || 0}</small>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Widget>

          {/* Trending Widget */}
          <Widget title={t('events.trending', 'IN TENDENZA')} accent="#f59e0b" delay={160}>
            {trendingEvents.length === 0 ? (
              <p className="widget-empty">{t('events.noResults')}</p>
            ) : (
              <ol className="trending-list">
                {trendingEvents.map((ev, i) => (
                  <li key={ev.id} onClick={() => setSelectedEvent(ev)} role="button" tabIndex={0}>
                    <span className="tr-rank">{i + 1}</span>
                    <div className="tr-info">
                      <span className="tr-title">{ev.title}</span>
                      <small><TrendingUp size={10} /> {ev.participantCount ?? 0}</small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Widget>

          {/* Live Now Widget */}
          <Widget title={t('events.liveNow', 'LIVE ORA')} delay={240}>
            <div className="live-now-box">
              <Zap size={20} />
              <span className="live-count">{liveNowCount}</span>
              <span className="live-label">{t('events.happeningNow', 'eventi in corso')}</span>
            </div>
          </Widget>
        </div>

        {/* ─────────── CENTER COLUMN (FEED) ─────────── */}
        <div className="ev-col feed">
          {/* Search / Discovery bar */}
          <div className="composer" onMouseMove={onMove}>
            <div className="composer-search">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={certifiedOnly ? t('events.searchCertifiedPlaceholder') : t('events.searchPlaceholder')}
              />
            </div>
            <div className="composer-chips">
              {timeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={`chip${timeFilter === chip.key ? ' active' : ''}`}
                  onClick={() => setTimeFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
              {certifiedOnly && <span className="chip cert-chip">{t('events.certified')}</span>}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="state-panel liquid-panel">{t('events.loading')}</div>
          )}

          {/* Error state */}
          {error && (
            <div className="state-panel liquid-panel">
              <p>{error}</p>
              <button onClick={() => loadEvents()} type="button">{t('common.retry')}</button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredEvents.length === 0 && (
            <div className="state-panel liquid-panel">{t('events.noResults')}</div>
          )}

          {/* Event cards feed */}
          {!isLoading && !error && filteredEvents.map((event) => renderPostCard(event))}
        </div>

        {/* ─────────── RIGHT COLUMN ─────────── */}
        <div className="ev-col right">
          {/* Next Activity Widget */}
          <Widget title={t('events.nextActivity', 'PROSSIMA ATTIVITÀ')} delay={50}>
            {upcomingEvent ? (
              <div
                className="next-ev-card"
                onClick={() => setSelectedEvent(upcomingEvent)}
                role="button"
                tabIndex={0}
              >
                <div
                  className="nec-banner"
                  style={{ background: CAT_GRADIENTS[upcomingEvent.category] || CAT_GRADIENTS.cultura }}
                />
                <div className="nec-body">
                  <span className="nec-cat" style={{ color: CAT_COLORS[upcomingEvent.category] || '#7c3aed' }}>
                    {upcomingEvent.category}
                  </span>
                  <strong>{upcomingEvent.title}</strong>
                  <span className="nec-meta">
                    <MapPin size={12} /> {upcomingEvent.location || t('common.dateTBD')}
                  </span>
                  <span className="nec-meta">
                    <Clock size={12} /> {formatDateTime(upcomingEvent.dateTime)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="widget-empty">{t('events.noResults')}</p>
            )}
          </Widget>

          {/* City Events Widget */}
          <Widget title={t('events.cityEvents', 'EVENTI IN CITTÀ')} delay={130}>
            {cityEvents.length === 0 ? (
              <p className="widget-empty">{t('events.noResults')}</p>
            ) : (
              <div className="city-ev-grid">
                {cityEvents.map((ev) => {
                  const CIcon = CAT_ICON[ev.category] || Landmark;
                  return (
                    <div
                      key={ev.id}
                      className="city-ev-mini"
                      style={{ '--cec': CAT_COLORS[ev.category] || '#7c3aed' } as CSSProperties}
                      onClick={() => setSelectedEvent(ev)}
                      role="button"
                      tabIndex={0}
                    >
                      <CIcon size={14} />
                      <span className="cem-title">{ev.title}</span>
                      <small>{formatDay(ev.dateTime)}</small>
                    </div>
                  );
                })}
              </div>
            )}
          </Widget>
        </div>
      </div>

      {/* ─────────── EVENT MODAL ─────────── */}
      {selectedEvent && (
        <EventModal
          event={toEventData(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          onJoin={() => {
            const isJoined = !!(userId && selectedEvent.participantIds?.includes(userId));
            if (isJoined) handleLeaveEvent(selectedEvent.id);
            else handleJoinEvent(selectedEvent.id);
          }}
          onLike={() => toggleLike(selectedEvent.id)}
          onSave={() => toggleSave(selectedEvent.id)}
        />
      )}
    </div>
  );
}
