import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/map/MapCanvas';
import { getMapMarkers, type MapMarker, type MarkerType } from '../lib/api';
import { listFavorites } from '../lib/favorites';
import { fetchWeather, type WeatherMood, type WeatherSnapshot } from '../lib/weather';
import type { AppUser } from '../data/mockUser';

type Filter = 'all' | 'preferred' | 'favorites' | MarkerType;
type TimeFilter = 'now' | 'today' | 'weekend';

const filterLabelsBase: Array<{ label: string; value: Filter }> = [
  { label: 'Tutti', value: 'all' },
  { label: 'Per te', value: 'preferred' },
  { label: 'Preferiti', value: 'favorites' },
  { label: 'Attività', value: 'activity' },
  { label: 'Eventi', value: 'event' },
  { label: 'POI', value: 'poi' },
];

const weatherMoodLabel: Record<WeatherMood, string> = {
  sunny: 'Sereno',
  cloudy: 'Nuvoloso',
  rainy: 'Pioggia',
  stormy: 'Temporale',
  snowy: 'Neve',
};

const TRENTO: [number, number] = [46.0679, 11.1211];

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
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate();
}
function isInWeekend(d: Date, today = new Date()): boolean {
  // Calcola sabato e domenica della settimana corrente (lun=1, dom=0 in JS).
  const start = new Date(today);
  const dow = start.getDay(); // 0..6
  const daysUntilSaturday = (6 - dow + 7) % 7; // dom→6, lun→5, sab→0
  const sat = new Date(start);
  sat.setDate(start.getDate() + daysUntilSaturday);
  sat.setHours(0, 0, 0, 0);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23, 59, 59, 999);
  return d >= sat && d <= sun;
}

function formatTime(value?: string | null) {
  if (!value) return 'Oggi';
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value));
}

function markerTypeLabel(type: MarkerType) {
  if (type === 'activity') return 'Attività';
  if (type === 'event') return 'Evento';
  return 'POI';
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
  const isEnte = user?.role === 'certified_entity';
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
  const hasInterests = Array.isArray(user?.interessi) && (user!.interessi!.length ?? 0) > 0;

  async function loadMarkers() {
    setIsLoading(true);
    setNotice(null);
    try {
      setMarkers(await getMapMarkers());
    } catch (e) {
      setMarkers([]);
      setNotice(e instanceof Error ? e.message : 'Errore nel caricamento dati mappa.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMarkers();
    void listFavorites().then(setFavorites);
    void fetchWeather().then(setWeather).catch(() => setWeather(null));
    const onFavChanged = () => { void listFavorites().then(setFavorites); };
    window.addEventListener('tla:favorites-changed', onFavChanged);
    return () => window.removeEventListener('tla:favorites-changed', onFavChanged);
  }, []);

  function handleNearMe() {
    if (!navigator.geolocation) { setGeoError('Geolocalizzazione non supportata dal browser'); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
      },
      (err) => {
        const reasons: Record<number, string> = {
          1: 'Permesso negato. Controlla le impostazioni del browser.',
          2: 'Posizione non disponibile.',
          3: 'Timeout.',
        };
        setGeoError(reasons[err.code] ?? `Errore (codice ${err.code})`);
        setGeoLoading(false);
      },
      { timeout: 10000 },
    );
  }

  // Enti certificati non vedono attività spontanee: le filtriamo dalla base e
  // rimuoviamo il filtro "Attività" dalla toolbar.
  const filterLabels = isEnte
    ? filterLabelsBase.filter((f) => f.value !== 'activity')
    : filterLabelsBase;

  const baseMarkers = useMemo(
    () => (isEnte ? markers.filter((m) => m.type !== 'activity') : markers),
    [isEnte, markers],
  );

  const visibleMarkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseMarkers.filter((marker) => {
      // ── filtro categoria/tipo ────────────────────────────────────────
      if (filter === 'preferred') {
        if (marker.type === 'poi') {
          /* keep POIs */
        } else if (!hasInterests || !marker.category) {
          return false;
        } else if (!user!.interessi!.includes(marker.category)) {
          return false;
        }
      } else if (filter === 'favorites') {
        // POI favorites are stored with sourceId; activities/events use id.
        const favoriteId = marker.type === 'poi' ? marker.sourceId : marker.id;
        const fav = favorites.some((f) => f.markerType === marker.type && f.markerId === favoriteId);
        if (!fav) return false;
      } else if (filter !== 'all' && marker.type !== filter) {
        return false;
      }

      // ── filtro temporale ──────────────────────────────────────────────
      // 'now' = tutto visibile; 'today' / 'weekend' = solo attività/eventi nella finestra
      if (timeFilter !== 'now') {
        if (marker.type === 'poi') return false;
        if (!marker.dateTime) return false;
        const d = new Date(marker.dateTime);
        if (timeFilter === 'today' && !isToday(d)) return false;
        if (timeFilter === 'weekend' && !isInWeekend(d)) return false;
      }

      // ── "Vicino a me" ────────────────────────────────────────────────
      if (userLocation && Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude)) {
        const dist = haversineKm(userLocation, [marker.latitude!, marker.longitude!]);
        if (dist > 2) return false; // 2 km
      }

      // ── ricerca testuale: matcha titolo, categoria, descrizione ──────
      if (q) {
        const hay = `${marker.title} ${marker.category || ''} ${marker.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, timeFilter, search, baseMarkers, hasInterests, user, favorites, userLocation]);

  const highCrowdMarkers = useMemo(
    () => baseMarkers
      .filter((marker) =>
        crowdLevel(marker) >= 45
        || marker.crowdingStatus === 'red'
        || marker.crowdingStatus === 'orange'
        || marker.crowdingStatus === 'yellow',
      )
      .sort((a, b) => crowdLevel(b) - crowdLevel(a))
      .slice(0, 5),
    [baseMarkers],
  );

  const upcomingItems = useMemo(
    () => baseMarkers
      .filter((marker) => marker.type !== 'poi' && marker.dateTime)
      .sort((a, b) => new Date(a.dateTime || '').getTime() - new Date(b.dateTime || '').getTime())
      .slice(0, 4),
    [baseMarkers],
  );

  const featuredHotspots = useMemo(
    () => baseMarkers
      .slice()
      .sort((a, b) => crowdLevel(b) - crowdLevel(a))
      .slice(0, 4),
    [baseMarkers],
  );

  function severityFor(marker: MapMarker): { label: string; tone: MapMarker['crowdingStatus'] } {
    const level = crowdLevel(marker);
    if (marker.crowdingStatus === 'red' || level >= 82) return { label: 'affollamento critico', tone: 'red' };
    if (marker.crowdingStatus === 'orange' || level >= 62) return { label: 'affollamento intenso', tone: 'orange' };
    if (marker.crowdingStatus === 'yellow' || level >= 34) return { label: 'affollamento moderato', tone: 'yellow' };
    return { label: 'affollamento basso', tone: 'green' };
  }

  function categoryLabel(marker: MapMarker): string {
    const cat = (marker.category || '').toLowerCase();
    if (cat.includes('parcheg')) return 'Parcheggio';
    if (cat.includes('univ') || cat.includes('biblio') || cat.includes('aula')) return 'Università';
    if (cat.includes('piazza')) return 'Piazza';
    if (cat.includes('parco')) return 'Parco';
    if (cat.includes('museo')) return 'Museo';
    if (cat.includes('stazione') || cat.includes('trasport')) return 'Trasporti';
    return markerTypeLabel(marker.type);
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
    { label: 'Punti live', value: baseMarkers.length },
    { label: 'Hotspot', value: highCrowdMarkers.length },
    { label: 'Oggi', value: upcomingItems.length },
  ];
  const currentMood: WeatherMood = weather?.mood ?? 'cloudy';

  return (
    <div className="page-frame home-page">
      <header className="home-control-row" aria-label="Controlli città">
        <div className="city-status-strip">
          <span className="live-dot" aria-hidden="true" />
          <strong>{visibleMarkers.length}</strong>
          <span>punti visibili</span>
          {userLocation && <small className="muted-copy"> · raggio 2 km</small>}
        </div>
        <label className="city-search">
          <span className="visually-hidden">Cerca</span>
          <input
            type="search"
            placeholder="Cerca zona, evento, attività…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="time-filter" aria-label="Filtro orario">
          <button type="button" className={timeFilter === 'now' ? 'active-filter' : undefined} onClick={() => setTimeFilter('now')}>Ora</button>
          <button type="button" className={timeFilter === 'today' ? 'active-filter' : undefined} onClick={() => setTimeFilter('today')}>Oggi</button>
          <button type="button" className={timeFilter === 'weekend' ? 'active-filter' : undefined} onClick={() => setTimeFilter('weekend')}>Weekend</button>
        </div>
        {userLocation ? (
          <button className="nearby-button active-filter" type="button" onClick={() => { setUserLocation(null); setGeoError(null); }}>
            Rimuovi posizione
          </button>
        ) : (
          <button className="nearby-button" type="button" onClick={handleNearMe} disabled={geoLoading}>
            {geoLoading ? 'Localizzazione…' : 'Vicino a me'}
          </button>
        )}
        {geoError && <span className="form-error" style={{ margin: 0 }}>{geoError}</span>}
      </header>

      <section className="home-dashboard-grid">
        <aside className={`weather-summary weather-${currentMood}`} aria-label="Meteo Trento">
          <div className="weather-main">
            <span>{weatherMoodLabel[currentMood]}</span>
            <strong>{weather ? `${weather.temperature}°C` : '—'}</strong>
            <small>{weather ? `Vento ${Math.round(weather.windKmh)} km/h` : 'Caricamento meteo…'}</small>
          </div>
        </aside>

        <div className="home-map-panel">
          <div className="home-map-toolbar">
            <div className="filters">
              {filterLabels.map((item) => (
                <button
                  key={item.value}
                  className={filter === item.value ? 'active-filter' : undefined}
                  onClick={() => setFilter(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {notice && (
            <aside className="map-notice" aria-live="polite">
              <span>{notice}</span>
              <button onClick={loadMarkers} type="button">Riprova</button>
            </aside>
          )}
          {isLoading && <section className="state-panel liquid-panel">La città si sta aggiornando...</section>}
          {!isLoading && visibleMarkers.length === 0 && (
            <aside className="map-notice map-notice--empty" aria-live="polite">
              <span>Nessun punto visibile per questo filtro.</span>
            </aside>
          )}
          {!isLoading && <MapCanvas markers={visibleMarkers} user={user} />}
        </div>

        <aside className="home-live-column">
          <section className="home-widget city-alerts">
            <div className="widget-heading">
              <span className="section-eyebrow">Avvisi città</span>
              <strong>Da guardare ora</strong>
            </div>
            <div className="alert-list">
              {cityAlerts.length === 0 && <p className="muted-copy">Nessun avviso critico dai dati live.</p>}
              {cityAlerts.map((alert) => (
                <article className={`alert-item alert-${alert.tone}`} key={`${alert.title}-${alert.meta}`}>
                  <i aria-hidden="true" />
                  <div>
                    <h3>{alert.title}</h3>
                    <p>{alert.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="home-widget upcoming-widget">
            <div className="widget-heading">
              <span className="section-eyebrow">Prossime ore</span>
              <strong>Vicino a te</strong>
            </div>
            <ol className="timeline-list">
              {upcomingItems.length === 0 && <li><time>Ora</time><div><strong>Nessun evento imminente</strong><span>Dati backend aggiornati</span></div></li>}
              {upcomingItems.map((item) => (
                <li key={item.id}>
                  <time>{formatTime(item.dateTime)}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{markerTypeLabel(item.type)} · {item.category || 'città'}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>

      <section className="home-support-grid" aria-label="Sintesi live">
        <div className="quick-stat-strip">
          {quickStats.map((stat) => (
            <article key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
        <section className="home-widget hotspot-widget">
          <div className="widget-heading">
            <span className="section-eyebrow">Hotspot</span>
            <strong>Aree più attive</strong>
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
