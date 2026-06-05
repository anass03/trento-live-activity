import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveActivityTitle } from '../lib/activityTitle';
import { ServiceRequestModal } from '../components/ui/ServiceRequestModal';
import { MapCanvas } from '../components/map/MapCanvas';
import { getMapMarkers, getParking, type MapMarker, type MarkerType, type ParkingSpot } from '../lib/api';
import { listFavorites } from '../lib/favorites';
import { fetchWeather, type WeatherMood, type WeatherSnapshot } from '../lib/weather';
import { useAutoRefresh } from '../lib/useAutoRefresh';
import type { AppUser } from '../data/mockUser';

type Filter = 'all' | 'preferred' | 'favorites' | MarkerType;
type TimeFilter = 'now' | 'today' | 'weekend';

const TRENTO: [number, number] = [46.0679, 11.1211];

const PARKING_CROWD_STATUS: Record<string, MapMarker['crowdingStatus']> = {
  verde: 'green', giallo: 'yellow', rosso: 'red',
};
const PARKING_CROWD_LEVEL: Record<string, number> = { verde: 18, giallo: 45, rosso: 92 };

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isToday(d: Date, today = new Date()): boolean {
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
function isInWeekend(d: Date, today = new Date()): boolean {
  const start = new Date(today);
  const dow = start.getDay();
  const daysUntilSaturday = (6 - dow + 7) % 7;
  const sat = new Date(start);
  sat.setDate(start.getDate() + daysUntilSaturday);
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23, 59, 59, 999);
  return d >= sat && d <= sun;
}

function crowdLevel(marker: MapMarker) {
  if (Number.isFinite(marker.crowdLevel)) return marker.crowdLevel;
  return { green: 20, yellow: 50, orange: 72, red: 90 }[marker.crowdingStatus] ?? 20;
}

function crowdBarColor(level: number): string {
  if (level >= 82) return 'var(--color-danger)';
  if (level >= 62) return 'var(--color-orange)';
  if (level >= 34) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function MapPage({ user }: { user?: AppUser }) {
  const { t } = useTranslation();
  const isEnte = user?.role === 'certified_entity';
  const isAdmin = user?.role === 'municipal_admin' || user?.role === 'system_admin';
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('now');
  const [search, setSearch] = useState('');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [favorites, setFavorites] = useState<Array<{ markerType: string; markerId: string }>>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [parking, setParking] = useState<ParkingSpot[]>([]);
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const hasInterests = Array.isArray(user?.interessi) && (user!.interessi!.length ?? 0) > 0;

  const filterLabelsBase: Array<{ label: string; value: Filter }> = [
    { label: t('filters.all'),        value: 'all' },
    { label: t('filters.forYou'),     value: 'preferred' },
    { label: t('filters.favorites'),  value: 'favorites' },
    { label: t('filters.activities'), value: 'activity' },
    { label: t('filters.events'),     value: 'event' },
    { label: t('filters.poi'),        value: 'poi' },
    { label: t('filters.parking'),    value: 'parking' },
  ];

  const PARKING_STATUS: Record<string, { label: string; color: string }> = {
    verde:  { label: t('map.parkingFree'),      color: 'var(--color-success)' },
    giallo: { label: t('map.parkingAlmostFull'), color: 'var(--color-warning)' },
    rosso:  { label: t('map.parkingFull'),       color: 'var(--color-danger)' },
  };

  async function loadMarkers(silent = false) {
    if (!silent) { setIsLoading(true); setNotice(null); }
    try { setMarkers(await getMapMarkers()); }
    catch (e) {
      if (!silent) { setMarkers([]); setNotice(e instanceof Error ? e.message : t('map.loadError')); }
    } finally { if (!silent) setIsLoading(false); }
  }

  function loadParking() {
    return getParking().then((res) => setParking(res.parkings)).catch(() => { /* optional */ });
  }

  useEffect(() => {
    void loadMarkers();
    void loadParking();
    void listFavorites().then(setFavorites);
    void fetchWeather().then(setWeather).catch(() => setWeather(null));
    const onFavChanged = () => { void listFavorites().then(setFavorites); };
    window.addEventListener('tla:favorites-changed', onFavChanged);
    return () => window.removeEventListener('tla:favorites-changed', onFavChanged);
  }, []);

  useAutoRefresh(() => {
    void loadMarkers(true);
    void loadParking();
    void fetchWeather().then(setWeather).catch(() => { /* keep last */ });
  }, 30_000);

  function handleNearMe() {
    if (!navigator.geolocation) { setGeoError(t('profile.locationUnsupported')); return; }
    setGeoLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setGeoLoading(false); },
      (err) => {
        const reasons: Record<number, string> = {
          1: t('map.geoDenied'),
          2: t('map.geoUnavailable'),
          3: t('map.geoTimeout'),
        };
        setGeoError(reasons[err.code] ?? `Error (${err.code})`);
        setGeoLoading(false);
      },
      { timeout: 10000 },
    );
  }

  const filterLabels = filterLabelsBase.filter((f) => {
    if (isEnte && f.value === 'activity') return false;
    if (isAdmin && (f.value === 'preferred' || f.value === 'favorites')) return false;
    return true;
  });

  useEffect(() => {
    if (isAdmin && (filter === 'preferred' || filter === 'favorites')) setFilter('all');
  }, [isAdmin, filter]);

  const parkingMarkers = useMemo<MapMarker[]>(
    () => {
      const bikePrefix = t('map.bikeStoragePrefix');
      const bikeNorm = (s: string) => {
        const stripped = s.replace(/^(Servizio\s+)?Rimessaggio\s+Bici\s*[-–]?\s*/i, '').trim();
        return stripped ? `${bikePrefix} – ${stripped}` : bikePrefix;
      };
      return parking
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => ({
          id: `parking-${p.id}`,
          type: 'parking' as MarkerType,
          title: p.type === 'bike' ? bikeNorm(p.name) : p.name,
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          crowdLevel: PARKING_CROWD_LEVEL[p.status] ?? (p.occupancyPct ?? 0),
          crowdingStatus: PARKING_CROWD_STATUS[p.status] ?? 'green',
          isCertified: false,
          sourceId: p.id,
          category: p.type === 'bike' ? t('map.parkingBikes') : t('map.parkingCars'),
          description: p.type === 'bike' && p.description
            ? bikeNorm(p.description)
            : p.description || (p.type === 'bike' ? t('map.parkingBikes') : t('map.parkingCars')),
          free: p.free,
          total: p.capacity,
        }));
    },
    [parking, t],
  );

  const baseMarkers = useMemo(
    () => {
      const base = isEnte ? markers.filter((m) => m.type !== 'activity') : markers;
      return [...base, ...parkingMarkers].map((m) =>
        m.type === 'activity' ? { ...m, title: resolveActivityTitle(m.category, t) } : m,
      );
    },
    [isEnte, markers, parkingMarkers, t],
  );

  const visibleMarkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseMarkers.filter((marker) => {
      if (filter === 'preferred') {
        if (marker.type === 'poi') { /* keep */ }
        else if (!hasInterests || !marker.category) return false;
        else if (!user!.interessi!.includes(marker.category)) return false;
      } else if (filter === 'favorites') {
        const favoriteId = marker.type === 'poi' ? marker.sourceId : marker.id;
        if (!favorites.some((f) => f.markerType === marker.type && f.markerId === favoriteId)) return false;
      } else if (filter !== 'all' && marker.type !== filter) {
        return false;
      }
      if (timeFilter !== 'now') {
        if (marker.type === 'poi') return false;
        if (!marker.dateTime) return false;
        const d = new Date(marker.dateTime);
        if (timeFilter === 'today' && !isToday(d)) return false;
        if (timeFilter === 'weekend' && !isInWeekend(d)) return false;
      }
      if (userLocation && Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude)) {
        if (haversineKm(userLocation, [marker.latitude!, marker.longitude!]) > 2) return false;
      }
      if (q) {
        if (!`${marker.title} ${marker.category || ''} ${marker.description || ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [filter, timeFilter, search, baseMarkers, hasInterests, user, favorites, userLocation]);

  const highCrowdMarkers = useMemo(
    () => baseMarkers.filter((m) => crowdLevel(m) >= 45 || m.crowdingStatus === 'red' || m.crowdingStatus === 'orange' || m.crowdingStatus === 'yellow').sort((a, b) => crowdLevel(b) - crowdLevel(a)).slice(0, 5),
    [baseMarkers],
  );
  const upcomingItems = useMemo(
    () => baseMarkers.filter((m) => m.type !== 'poi' && m.dateTime).sort((a, b) => new Date(a.dateTime || '').getTime() - new Date(b.dateTime || '').getTime()).slice(0, 4),
    [baseMarkers],
  );
  const featuredHotspots = useMemo(() => baseMarkers.slice().sort((a, b) => crowdLevel(b) - crowdLevel(a)).slice(0, 4), [baseMarkers]);

  function markerTypeLabel(type: MarkerType): string {
    if (type === 'activity') return t('map.markerActivity');
    if (type === 'event')    return t('map.markerEvent');
    if (type === 'parking')  return t('map.markerParking');
    return t('map.markerPOI');
  }

  function categoryLabel(marker: MapMarker): string {
    const cat = (marker.category || '').toLowerCase();
    if (cat.includes('parcheg')) return t('categories.parcheggio');
    if (cat.includes('univ') || cat.includes('biblio') || cat.includes('aula')) return t('categories.universita');
    if (cat.includes('piazza')) return t('categories.piazza');
    if (cat.includes('parco'))  return t('categories.parco');
    if (cat.includes('museo'))  return t('categories.museo');
    if (cat.includes('stazione') || cat.includes('trasport')) return t('categories.stazione');
    return markerTypeLabel(marker.type);
  }

  function translateCategory(cat: string | undefined): string {
    if (!cat) return t('map.city');
    const key = cat.toLowerCase().replace(/\s+/g, '');
    return t(`categories.${key}`, { defaultValue: cat });
  }

  function severityFor(marker: MapMarker): { label: string; tone: MapMarker['crowdingStatus'] } {
    const level = crowdLevel(marker);
    if (marker.crowdingStatus === 'red'    || level >= 82) return { label: t('map.severityCritical'), tone: 'red' };
    if (marker.crowdingStatus === 'orange' || level >= 62) return { label: t('map.severityIntense'),  tone: 'orange' };
    if (marker.crowdingStatus === 'yellow' || level >= 34) return { label: t('map.severityModerate'), tone: 'yellow' };
    return { label: t('map.severityLow'), tone: 'green' };
  }

  function formatTime(value?: string | null) {
    if (!value) return t('filters.now');
    const locale = t('common.dateTBD') === 'Date TBD' ? 'en-GB' : 'it-IT';
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value));
  }

  const cityAlerts = highCrowdMarkers.map((marker) => {
    const sev = severityFor(marker);
    return {
      title: `${marker.title}: ${sev.label}`,
      meta: `${categoryLabel(marker)} · ${Math.round(crowdLevel(marker))} / 100`,
      tone: sev.tone,
    };
  });

  const quickStats = [
    { label: t('map.liveDots'), value: baseMarkers.length },
    { label: t('map.hotspot'),  value: highCrowdMarkers.length },
    { label: t('map.today'),    value: upcomingItems.length },
  ];

  const currentMood: WeatherMood = weather?.mood ?? 'cloudy';

  const parkingByType = useMemo(() => {
    const byCrowd = (a: ParkingSpot, b: ParkingSpot) => (b.occupancyPct ?? 0) - (a.occupancyPct ?? 0);
    return { cars: parking.filter((p) => p.type === 'car').sort(byCrowd), bikes: parking.filter((p) => p.type === 'bike').sort(byCrowd) };
  }, [parking]);

  function renderParkingGroup(items: ParkingSpot[], title: string) {
    if (items.length === 0) return null;
    return (
      <div className="parking-group">
        <h3 className="parking-group-title">{title} <span className="section-count">{items.length}</span></h3>
        <ul className="parking-list">
          {items.map((p) => {
            const st = PARKING_STATUS[p.status] ?? PARKING_STATUS.verde;
            return (
              <li key={p.id} className="parking-item" title={`${st.label} · ${p.occupancyPct ?? 0}% ${t('map.occupied')}`}>
                <span className="parking-dot" style={{ background: st.color }} aria-hidden="true" />
                <span className="parking-name">{p.name}</span>
                <span className="parking-free" style={{ color: st.color }}>
                  {p.free != null ? `${p.free} / ${p.capacity}` : `– / ${p.capacity}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="page-frame home-page">
      <header className="home-control-row" aria-label={t('map.filterLabel')}>
        <div className="city-status-strip">
          <span className="live-dot" aria-hidden="true" />
          <strong>{visibleMarkers.length}</strong>
          <span>{t('map.visiblePoints')}</span>
          {userLocation && <small className="muted-copy"> {t('map.radiusHint')}</small>}
        </div>
        <label className="city-search">
          <span className="visually-hidden">{t('common.search')}</span>
          <input type="search" placeholder={t('map.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="time-filter" aria-label={t('map.timeFilterLabel')}>
          <button type="button" className={timeFilter === 'now'     ? 'active-filter' : undefined} onClick={() => setTimeFilter('now')}>{t('filters.now')}</button>
          <button type="button" className={timeFilter === 'today'   ? 'active-filter' : undefined} onClick={() => setTimeFilter('today')}>{t('filters.today')}</button>
          <button type="button" className={timeFilter === 'weekend' ? 'active-filter' : undefined} onClick={() => setTimeFilter('weekend')}>{t('filters.weekend')}</button>
        </div>
        {userLocation ? (
          <button className="nearby-button active-filter" type="button" onClick={() => { setUserLocation(null); setGeoError(null); }}>
            {t('map.removeLocation')}
          </button>
        ) : (
          <button className="nearby-button" type="button" onClick={handleNearMe} disabled={geoLoading}>
            {geoLoading ? t('map.locating') : t('map.nearMe')}
          </button>
        )}
        {geoError && <span className="form-error" style={{ margin: 0 }}>{geoError}</span>}
      </header>

      <section className="home-dashboard-grid">

        {/* Left column: compact weather + parking + CTA */}
        <div className="home-left-column">
          <aside className={`weather-summary weather-${currentMood}`} aria-label="Meteo Trento">
            <div className="weather-main">
              <span>{t(`weather.${currentMood}`)}</span>
              <strong>{weather ? `${weather.temperature}°C` : '—'}</strong>
              <small>{weather ? `${t('map.windLabel')} ${Math.round(weather.windKmh)} km/h` : t('map.weatherLoading')}</small>
            </div>
          </aside>

          <section className="home-widget parking-widget">
            <div className="widget-heading">
              <span className="section-eyebrow">{t('map.parking')}</span>
              <strong>{t('map.parkingAvailability')}</strong>
              <small className="muted-copy">{t('map.parkingHint')}</small>
            </div>
            {parking.length === 0 ? (
              <p className="muted-copy">{t('map.parkingNoData')}</p>
            ) : (
              <div className="parking-groups">
                {renderParkingGroup(parkingByType.cars, t('map.parkingCars'))}
                {renderParkingGroup(parkingByType.bikes, t('map.parkingBikes'))}
              </div>
            )}
          </section>

          {/* Citizen needs CTA — only for registered citizens */}
          {user?.role === 'registered_user' && (
            <section className="home-widget liquid-card" style={{ gap: 10, display: 'grid' }}>
              <div className="widget-heading">
                <span className="section-eyebrow">{t('serviceRequest.ctaEyebrow')}</span>
                <strong>{t('serviceRequest.ctaTitle')}</strong>
              </div>
              <p className="muted-copy" style={{ margin: 0, fontSize: 13 }}>{t('serviceRequest.ctaDesc')}</p>
              <button type="button" className="primary-button" style={{ width: 'fit-content' }} onClick={() => setShowServiceRequest(true)}>
                📍 {t('serviceRequest.ctaButton')}
              </button>
            </section>
          )}
        </div>

        {/* Center: map */}
        <div className="home-map-panel">
          <div className="home-map-toolbar">
            <div className="filters">
              {filterLabels.map((item) => (
                <button key={item.value} className={filter === item.value ? 'active-filter' : undefined} onClick={() => setFilter(item.value)} type="button">
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {notice && (
            <aside className="map-notice" aria-live="polite">
              <span>{notice}</span>
              <button onClick={() => loadMarkers()} type="button">{t('map.retry')}</button>
            </aside>
          )}
          {isLoading && <section className="state-panel liquid-panel">{t('map.loading')}</section>}
          {!isLoading && visibleMarkers.length === 0 && (
            <aside className="map-notice map-notice--empty" aria-live="polite">
              <span>{t('map.noPoints')}</span>
            </aside>
          )}
          {!isLoading && <MapCanvas markers={visibleMarkers} user={user} />}
        </div>

        {/* Right column: live alerts + upcoming events */}
        <aside className="home-live-column">
          <section className="home-widget city-alerts">
            <div className="widget-heading">
              <span className="section-eyebrow">{t('map.cityAlerts')}</span>
              <strong>{t('map.watchNow')}</strong>
            </div>
            <div className="alert-list">
              {cityAlerts.length === 0 && <p className="muted-copy">{t('map.noAlerts')}</p>}
              {cityAlerts.map((alert) => (
                <article className={`alert-item alert-${alert.tone}`} key={`${alert.title}-${alert.meta}`}>
                  <i aria-hidden="true" />
                  <div><h3>{alert.title}</h3><p>{alert.meta}</p></div>
                </article>
              ))}
            </div>
          </section>

          <section className="home-widget upcoming-widget">
            <div className="widget-heading">
              <span className="section-eyebrow">{t('map.upcoming')}</span>
              <strong>{t('map.nearYou')}</strong>
            </div>
            <ol className="timeline-list">
              {upcomingItems.length === 0 && (
                <li><time>{t('filters.now')}</time><div><strong>{t('map.noUpcoming')}</strong><span>{t('map.upcomingMeta')}</span></div></li>
              )}
              {upcomingItems.map((item) => (
                <li key={item.id}>
                  <time>{formatTime(item.dateTime)}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{markerTypeLabel(item.type)} · {translateCategory(item.category)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>

      {showServiceRequest && <ServiceRequestModal onClose={() => setShowServiceRequest(false)} />}

      <section className="home-support-grid" aria-label={t('map.liveDots')}>
        <div className="quick-stat-strip">
          {quickStats.map((stat) => (
            <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>
          ))}
        </div>
        <section className="home-widget hotspot-widget">
          <div className="widget-heading">
            <span className="section-eyebrow">{t('map.hotspot')}</span>
            <strong>{t('map.mostActive')}</strong>
          </div>
          <div className="hotspot-list">
            {featuredHotspots.map((marker) => {
              const level = Math.round(crowdLevel(marker));
              return (
                <article key={marker.id}>
                  <span>{marker.title}</span>
                  <div className="crowd-bar" role="progressbar" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
                    <div className="crowd-bar-fill" style={{ width: `${level}%`, background: crowdBarColor(level) }} />
                  </div>
                  <small style={{ color: crowdBarColor(level) }}>{level} / 100</small>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
