import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpDown,
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  Dog,
  Flame,
  Leaf,
  MapPin,
  Mountain,
  Music,
  Palette,
  Search,
  Shield,
  Sparkles,
  Star,
  Sun,
  Timer,
  TrendingUp,
  Users,
  Utensils,
  Waypoints,
  Zap,
  Accessibility,
  Heart,
  DollarSign,
} from 'lucide-react';
import type { AppUser } from '../data/mockUser';
import { getActivities, joinActivity, leaveActivity, type ApiActivity } from '../lib/api';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import { formatDateTime } from '../lib/formatters';
import { resolveActivityTitle } from '../lib/activityTitle';
import { Widget, Avatars, useGlow } from '../components/redesign';

/* ── colour maps ── */
const CAT_COLORS: Record<string, string> = {
  outdoor: '#0d9488', sport: '#059669', cultura: '#7c3aed',
  cibo: '#d97706', benessere: '#ec4899', creativita: '#8b5cf6',
  sociale: '#0ea5e9', musica: '#db2777',
};
const CAT_ICONS: Record<string, typeof Mountain> = {
  outdoor: Mountain, sport: Zap, cultura: Palette,
  cibo: Utensils, benessere: Heart, creativita: Sparkles,
  sociale: Users, musica: Music,
};
const TRUST_COLORS: Record<string, string> = {
  NEW: '#94a3b8', GROWING: '#38bdf8', RELIABLE: '#34d399',
  HIGHLY_RELIABLE: '#a78bfa', VERIFIED: '#38bdf8',
};
const DIFF_COLORS: Record<string, string> = {
  facile: '#34d399', medio: '#fbbf24', difficile: '#f87171',
};

type SortKey = 'date' | 'popular' | 'rating' | 'newest';
type TabKey = 'all' | 'foryou' | 'popular' | 'new';

/* ── helpers ── */
function catGradient(category: string): string {
  const c = CAT_COLORS[category] ?? '#6366f1';
  return `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 50%, #1e1b4b))`;
}
function trustLevel(a: ApiActivity): string {
  if (!a.creator) return 'NEW';
  return 'RELIABLE';
}
function trustLabel(level: string): string {
  switch (level) {
    case 'VERIFIED': return 'Verificato';
    case 'HIGHLY_RELIABLE': return 'Molto affidabile';
    case 'RELIABLE': return 'Affidabile';
    case 'GROWING': return 'In crescita';
    default: return 'Nuovo';
  }
}
function fakeRating(_a: ApiActivity): number {
  return 4.0 + Math.round(Math.random() * 10) / 10;
}
function fakeDuration(_a: ApiActivity): string {
  const h = 1 + Math.floor(Math.random() * 3);
  return `${h}h`;
}
function fakeDifficulty(_a: ApiActivity): string {
  const opts = ['facile', 'medio', 'difficile'];
  return opts[Math.floor(Math.random() * opts.length)];
}
function fakePrice(_a: ApiActivity): string | null {
  return Math.random() > 0.5 ? null : `€${5 + Math.floor(Math.random() * 20)}`;
}
function makeAvatars(count: number): { initials: string; gradient: string }[] {
  const gradients = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
  ];
  const names = ['MR', 'LB', 'GP', 'AC', 'FS', 'DB'];
  const n = Math.min(count, 3);
  return Array.from({ length: n }, (_, i) => ({
    initials: names[i % names.length],
    gradient: gradients[i % gradients.length],
  }));
}

/* stable seed for per-activity random values */
function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function stableRating(a: ApiActivity): number {
  const h = stableHash(a.id);
  return +(3.5 + (h % 16) / 10).toFixed(1);
}
function stableDuration(a: ApiActivity): string {
  const h = stableHash(a.id);
  return `${1 + (h % 4)}h`;
}
function stableDifficulty(a: ApiActivity): string {
  const h = stableHash(a.id);
  return ['facile', 'medio', 'difficile'][h % 3];
}
function stablePrice(a: ApiActivity): string | null {
  const h = stableHash(a.id);
  return h % 3 === 0 ? null : `€${5 + (h % 25)}`;
}

function badgeText(a: ApiActivity): string {
  const now = new Date();
  if (a.dateTime) {
    const d = new Date(a.dateTime);
    if (d <= now) return '⚡ IN CORSO';
  }
  if (a.participantCount >= a.maxParticipants * 0.8) return '🔥 POPOLARE';
  if (a.createdAt) {
    const diff = now.getTime() - new Date(a.createdAt).getTime();
    if (diff < 86400_000 * 3) return '✨ NUOVA';
  }
  return '📍 APERTA';
}

function badgeClass(a: ApiActivity): string {
  const now = new Date();
  if (a.dateTime && new Date(a.dateTime) <= now) return 'act-badge now';
  if (a.participantCount >= a.maxParticipants * 0.8) return 'act-badge rising';
  return 'act-badge';
}

/* ── component ── */
export function ActivitiesPage({ user }: { user?: AppUser }) {
  const { t } = useTranslation();
  const onMove = useGlow();
  const userId = user?.id;
  const userInterests = user?.interessi ?? [];

  /* ── state ── */
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [tab, setTab] = useState<TabKey>('all');
  const [sort, setSort] = useState<SortKey>('date');
  const [sortOpen, setSortOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  /* practical filters */
  const [petFriendly, setPetFriendly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [diffFilter, setDiffFilter] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement>(null);

  /* close sort dropdown on outside click */
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen]);

  /* ── data loading ── */
  const loadActivities = useCallback(async (silent = false) => {
    if (!silent) { setIsLoading(true); setError(null); }
    try { setActivities(await getActivities()); }
    catch (e) { if (!silent) setError(e instanceof Error ? e.message : t('activities.loading')); }
    finally { if (!silent) setIsLoading(false); }
  }, [t]);

  useEffect(() => { void loadActivities(); }, [loadActivities]);
  useAutoRefresh(() => loadActivities(true), 30_000);

  /* ── actions ── */
  async function handleJoin(activityId: string) {
    setActionLoading(activityId);
    try {
      const updated = await joinActivity(activityId);
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...updated } : a));
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setActionLoading(null); }
  }

  async function handleLeave(activityId: string) {
    setActionLoading(activityId);
    try {
      await leaveActivity(activityId);
      await loadActivities(true);
    } catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setActionLoading(null); }
  }

  function toggleSave(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const activityTitle = (a: { category?: string | null }) => resolveActivityTitle(a.category, t);

  /* ── derived data ── */
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach(a => counts.set(a.category, (counts.get(a.category) ?? 0) + 1));
    return Array.from(counts.entries()).map(([cat, count]) => ({ category: cat, count }));
  }, [activities]);

  const filtered = useMemo(() => {
    let list = [...activities];

    // tab filter
    if (tab === 'foryou' && userInterests.length > 0) {
      list = list.filter(a => userInterests.includes(a.category));
    } else if (tab === 'popular') {
      list = list.filter(a => a.participantCount >= a.maxParticipants * 0.5);
    } else if (tab === 'new') {
      const threeDaysAgo = Date.now() - 86400_000 * 3;
      list = list.filter(a => a.createdAt && new Date(a.createdAt).getTime() > threeDaysAgo);
    }

    // category
    if (category !== 'all') list = list.filter(a => a.category === category);

    // search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        `${a.title} ${a.description ?? ''} ${a.category} ${a.location ?? ''}`.toLowerCase().includes(q),
      );
    }

    // difficulty filter — uses stable hash
    if (diffFilter) {
      list = list.filter(a => stableDifficulty(a) === diffFilter);
    }
    // free filter
    if (freeOnly) {
      list = list.filter(a => stablePrice(a) === null);
    }

    // sort
    list.sort((a, b) => {
      switch (sort) {
        case 'date': {
          const ta = a.dateTime ? new Date(a.dateTime).getTime() : Infinity;
          const tb = b.dateTime ? new Date(b.dateTime).getTime() : Infinity;
          return ta - tb;
        }
        case 'popular': return b.participantCount - a.participantCount;
        case 'rating': return stableRating(b) - stableRating(a);
        case 'newest': {
          const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return cb - ca;
        }
        default: return 0;
      }
    });

    return list;
  }, [activities, tab, category, search, sort, userInterests, diffFilter, freeOnly]);

  /* trusted authors — unique creators from top activities */
  const trustedAuthors = useMemo(() => {
    const seen = new Set<string>();
    const authors: Array<{ id: string; name: string; actCount: number; rating: number; trust: string }> = [];
    for (const a of activities) {
      if (!a.creator || seen.has(a.creator.id)) continue;
      seen.add(a.creator.id);
      const count = activities.filter(x => x.creator?.id === a.creator!.id).length;
      authors.push({
        id: a.creator.id,
        name: a.creator.name,
        actCount: count,
        rating: stableRating(a),
        trust: count >= 5 ? 'HIGHLY_RELIABLE' : count >= 3 ? 'RELIABLE' : 'GROWING',
      });
    }
    return authors.sort((a, b) => b.actCount - a.actCount).slice(0, 5);
  }, [activities]);

  /* "perfette adesso" — just pick a few upcoming activities */
  const perfectNow = useMemo(() => {
    const now = new Date();
    return activities
      .filter(a => a.dateTime && new Date(a.dateTime) >= now && a.status !== 'completa')
      .sort((a, b) => new Date(a.dateTime!).getTime() - new Date(b.dateTime!).getTime())
      .slice(0, 4);
  }, [activities]);

  const sortLabels: Record<SortKey, string> = {
    date: t('activities.sortDate', 'Data'),
    popular: t('activities.sortPopular', 'Popolari'),
    rating: t('activities.sortRating', 'Valutazione'),
    newest: t('activities.sortNewest', 'Più recenti'),
  };

  /* ── render ── */
  return (
    <div className="activity-scene">
      <div className="activity-layout">

        {/* ====== LEFT COLUMN — Filters ====== */}
        <div className="ev-col">
          <Widget title={t('activities.search', 'CERCA')} delay={60}>
            <div className="act-search">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                type="search"
                placeholder={t('activities.searchPlaceholder', 'Cerca attività, luoghi...')}
              />
            </div>
          </Widget>

          <Widget title={t('activities.categories', 'CATEGORIE')} delay={120}>
            <div className="qf-list">
              <button
                className={`qf-item${category === 'all' ? ' active' : ''}`}
                style={{ '--qc': 'var(--accent)' } as CSSProperties}
                onClick={() => setCategory('all')}
              >
                <div className="qf-ic"><Waypoints size={16} /></div>
                <span className="qf-label">{t('activities.allCategories', 'Tutte')}</span>
                <span className="qf-count">{activities.length}</span>
              </button>
              {categoryCounts.map(({ category: cat, count }) => {
                const Icon = CAT_ICONS[cat] ?? Leaf;
                const color = CAT_COLORS[cat] ?? '#6366f1';
                return (
                  <button
                    key={cat}
                    className={`qf-item${category === cat ? ' active' : ''}`}
                    style={{ '--qc': color } as CSSProperties}
                    onClick={() => setCategory(cat)}
                  >
                    <div className="qf-ic"><Icon size={16} /></div>
                    <span className="qf-label">
                      {t(`categories.${cat.toLowerCase()}`, { defaultValue: cat })}
                    </span>
                    <span className="qf-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </Widget>

          <Widget title={t('activities.filters', 'FILTRI')} delay={180}>
            <div className="filter-block">
              <div className="filter-block-label">
                {t('activities.practicalFilters', 'Pratici')}
                {(petFriendly || freeOnly || accessible) && (
                  <button className="filter-reset" onClick={() => { setPetFriendly(false); setFreeOnly(false); setAccessible(false); }}>
                    Reset
                  </button>
                )}
              </div>
              <div className="pf-grid">
                <button className={`pf-chip${petFriendly ? ' on' : ''}`} onClick={() => setPetFriendly(v => !v)}>
                  <Dog size={13} /> Pet-friendly
                </button>
                <button className={`pf-chip${freeOnly ? ' on' : ''}`} onClick={() => setFreeOnly(v => !v)}>
                  <DollarSign size={13} /> Gratuito
                </button>
                <button className={`pf-chip${accessible ? ' on' : ''}`} onClick={() => setAccessible(v => !v)}>
                  <Accessibility size={13} /> Accessibile
                </button>
              </div>
            </div>
            <div className="filter-block">
              <div className="filter-block-label">
                {t('activities.difficulty', 'Difficoltà')}
                {diffFilter && (
                  <button className="filter-reset" onClick={() => setDiffFilter(null)}>Reset</button>
                )}
              </div>
              <div className="diff-row">
                {(['facile', 'medio', 'difficile'] as const).map(d => (
                  <button
                    key={d}
                    className={`diff-pill${diffFilter === d ? ' on' : ''}`}
                    style={{ '--dc': DIFF_COLORS[d] } as CSSProperties}
                    onClick={() => setDiffFilter(diffFilter === d ? null : d)}
                  >
                    <span className="dot" /> {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </Widget>
        </div>

        {/* ====== CENTER COLUMN — Hero + Cards ====== */}
        <div className="ev-col feed">
          {/* Hero */}
          <div className="act-hero">
            <div className="hero-bloom" />
            <div className="hero-content">
              <div className="hero-eyebrow">
                <Sparkles size={14} /> SCOPRI · PARTECIPA · VIVI
              </div>
              <h1>Attività a <em>Trento</em></h1>
              <p>Esperienze curate dalla community locale.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="act-tabs">
            {([
              { key: 'all' as TabKey, label: t('filters.all', 'Tutte'), icon: <Waypoints size={15} /> },
              { key: 'foryou' as TabKey, label: t('activities.forYou', 'Per te'), icon: <Star size={15} /> },
              { key: 'popular' as TabKey, label: t('activities.popular', 'Popolari'), icon: <Flame size={15} /> },
              { key: 'new' as TabKey, label: t('activities.new', 'Nuove'), icon: <Sparkles size={15} /> },
            ]).map(item => (
              <button
                key={item.key}
                className={`act-tab${tab === item.key ? ' on' : ''}`}
                onClick={() => setTab(item.key)}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {/* Sort bar */}
          <div className="act-sortbar">
            <span className="act-count">
              <b>{filtered.length}</b> {t('activities.found', 'attività trovate')}
            </span>
            <div className="act-sort" ref={sortRef}>
              <button className="act-sort-btn" onClick={() => setSortOpen(v => !v)}>
                <ArrowUpDown size={14} />
                <span className="lbl">{t('activities.sortBy', 'Ordina:')}</span>
                {sortLabels[sort]}
                <ChevronDown size={14} />
              </button>
              {sortOpen && (
                <div className="act-sort-menu">
                  {(Object.keys(sortLabels) as SortKey[]).map(k => (
                    <button
                      key={k}
                      className={`act-sort-opt${sort === k ? ' on' : ''}`}
                      onClick={() => { setSort(k); setSortOpen(false); }}
                    >
                      {sortLabels[k]}
                      {sort === k && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* States */}
          {isLoading && (
            <div className="state-panel liquid-panel">{t('activities.loading')}</div>
          )}
          {error && (
            <div className="state-panel liquid-panel">
              <p>{error}</p>
              <button onClick={() => loadActivities()} type="button">{t('common.retry', 'Riprova')}</button>
            </div>
          )}
          {!isLoading && !error && activities.length === 0 && (
            <div className="state-panel liquid-panel">{t('activities.noActivities')}</div>
          )}
          {!isLoading && !error && activities.length > 0 && filtered.length === 0 && (
            <div className="state-panel liquid-panel">{t('activities.noResults', 'Nessun risultato')}</div>
          )}

          {/* Card grid */}
          {filtered.length > 0 && (
            <div className="act-grid">
              {filtered.map(activity => {
                const CatIcon = CAT_ICONS[activity.category] ?? Leaf;
                const catColor = CAT_COLORS[activity.category] ?? '#6366f1';
                const trust = trustLevel(activity);
                const tc = TRUST_COLORS[trust] ?? TRUST_COLORS.NEW;
                const rating = stableRating(activity);
                const duration = stableDuration(activity);
                const difficulty = stableDifficulty(activity);
                const price = stablePrice(activity);
                const dc = DIFF_COLORS[difficulty] ?? '#94a3b8';
                const avatars = makeAvatars(activity.participantCount);
                const extraParticipants = Math.max(0, activity.participantCount - 3);
                const isSaved = savedIds.has(activity.id);
                const isParticipant = userId ? activity.participantIds?.includes(userId) : false;

                return (
                  <button
                    key={activity.id}
                    className="act-card"
                    style={{ '--ac': catColor } as CSSProperties}
                    onMouseMove={onMove}
                  >
                    <div
                      className="act-media"
                      style={{ '--aimg': catGradient(activity.category) } as CSSProperties}
                    >
                      <div className="am-ghost"><CatIcon size={92} /></div>
                      <div className={badgeClass(activity)}>{badgeText(activity)}</div>
                      <button
                        className={`act-save${isSaved ? ' on' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleSave(activity.id); }}
                      >
                        <Bookmark size={16} />
                      </button>
                      <div className="am-rating">
                        <Star size={13} /> {rating}
                        <span>({3 + stableHash(activity.id) % 20})</span>
                      </div>
                    </div>

                    <div className="act-body">
                      <div className="act-cat" style={{ '--ac': catColor } as CSSProperties}>
                        <CatIcon size={12} />
                        {t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}
                      </div>

                      <div className="act-name">{activityTitle(activity)}</div>

                      <div className="act-attrs">
                        <span className="act-attr"><Clock size={13} /> {duration}</span>
                        <span className="act-attr">
                          <span className="diff-mini" style={{ '--dc': dc } as CSSProperties}>
                            <span className="dot" /> {difficulty}
                          </span>
                        </span>
                        {price ? (
                          <span className="act-attr">{price}</span>
                        ) : (
                          <span className="act-attr"><span className="free">Gratuito</span></span>
                        )}
                      </div>

                      {activity.location && (
                        <div className="act-loc">
                          <MapPin size={13} /> {activity.location}
                        </div>
                      )}

                      <div className="act-foot">
                        <span className="act-trust" style={{ '--tc': tc } as CSSProperties}>
                          <Shield size={12} /> {trustLabel(trust)}
                        </span>
                        <div className="act-part">
                          <Avatars avatars={avatars} extra={extraParticipants > 0 ? extraParticipants : undefined} />
                          <span className="pnum">
                            <b>{activity.participantCount}</b>/{activity.maxParticipants}
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      {userId && (
                        isParticipant ? (
                          <button
                            className="act-cta"
                            style={{ background: 'color-mix(in srgb, var(--green) 22%, var(--glass-1))', border: '1px solid color-mix(in srgb, var(--green) 50%, transparent)', boxShadow: 'none', color: 'var(--text-primary)' }}
                            disabled={actionLoading === activity.id}
                            onClick={e => { e.stopPropagation(); handleLeave(activity.id); }}
                          >
                            <Check size={15} /> {actionLoading === activity.id ? '...' : t('activities.participating', 'Iscritto')}
                          </button>
                        ) : activity.status !== 'completa' ? (
                          <button
                            className="act-cta"
                            disabled={actionLoading === activity.id}
                            onClick={e => { e.stopPropagation(); handleJoin(activity.id); }}
                          >
                            <Users size={15} /> {actionLoading === activity.id ? '...' : t('activities.join', 'Partecipa')}
                          </button>
                        ) : null
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ====== RIGHT COLUMN — Widgets ====== */}
        <div className="ev-col right">
          <Widget title={t('activities.trustedAuthors', 'AUTORI FIDATI')} delay={100}>
            {trustedAuthors.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('activities.noAuthors', 'Nessun autore ancora.')}</p>
            ) : (
              trustedAuthors.map(author => {
                const tc = TRUST_COLORS[author.trust] ?? TRUST_COLORS.NEW;
                return (
                  <button key={author.id} className="author-row">
                    <div
                      className="author-av"
                      style={{ background: `linear-gradient(135deg, ${tc}, color-mix(in srgb, ${tc} 50%, #1e1b4b))` }}
                    >
                      {author.name.charAt(0).toUpperCase()}
                      {author.trust === 'VERIFIED' && (
                        <div className="vbadge"><Check size={9} /></div>
                      )}
                    </div>
                    <div className="author-body">
                      <div className="author-name">{author.name}</div>
                      <div className="author-meta">
                        <span className="star"><Star size={11} /> {author.rating}</span>
                        · {author.actCount} {t('activities.activitiesCount', 'attività')}
                      </div>
                      <div className="author-trust-lbl" style={{ '--tc': tc } as CSSProperties}>
                        <Shield size={11} /> {trustLabel(author.trust)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </Widget>

          <Widget title={t('activities.perfectNow', 'PERFETTE ADESSO')} delay={200} accent="var(--teal)">
            {perfectNow.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('activities.noPerfect', 'Nessuna attività imminente.')}</p>
            ) : (
              perfectNow.map(activity => {
                const CatIcon = CAT_ICONS[activity.category] ?? Leaf;
                const catColor = CAT_COLORS[activity.category] ?? '#6366f1';
                return (
                  <button key={activity.id} className="perfect-row">
                    <div
                      className="perfect-thumb"
                      style={{ '--pimg': catGradient(activity.category) } as CSSProperties}
                    />
                    <div className="perfect-body">
                      <div className="perfect-reason" style={{ '--rc': catColor } as CSSProperties}>
                        <CatIcon size={11} />
                        {t(`categories.${activity.category?.toLowerCase()}`, { defaultValue: activity.category })}
                      </div>
                      <div className="perfect-title">{activityTitle(activity)}</div>
                      <div className="perfect-meta">
                        <Timer size={12} /> {formatDateTime(activity.dateTime)}
                        <span className="temp"><Sun size={12} /></span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </Widget>
        </div>
      </div>
    </div>
  );
}
