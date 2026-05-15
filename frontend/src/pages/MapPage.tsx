import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/map/MapCanvas';
import { getMapMarkers, type MapMarker, type MarkerType } from '../lib/api';
import type { AppUser } from '../data/mockUser';

type Filter = 'all' | 'preferred' | MarkerType;
type WeatherMood = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';

const filterLabels: Array<{ label: string; value: Filter }> = [
  { label: 'Tutti', value: 'all' },
  { label: 'Preferiti', value: 'preferred' },
  { label: 'Attività', value: 'activity' },
  { label: 'Eventi', value: 'event' },
  { label: 'POI', value: 'poi' },
];

const weatherMoods: Array<{ label: string; value: WeatherMood; temp: string; meta: string }> = [
  { label: 'Sereno', value: 'sunny', temp: '21°C', meta: 'UV 4 · vento 6 km/h' },
  { label: 'Nuvoloso', value: 'cloudy', temp: '18°C', meta: 'Visibilità buona' },
  { label: 'Pioggia', value: 'rainy', temp: '15°C', meta: 'Pioggia leggera' },
  { label: 'Temporale', value: 'stormy', temp: '13°C', meta: 'Allerta meteo' },
  { label: 'Neve', value: 'snowy', temp: '1°C', meta: 'Fondo freddo' },
];

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

export function MapPage({ user }: { user?: AppUser }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [weatherMood, setWeatherMood] = useState<WeatherMood>('cloudy');
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
  }, []);

  const visibleMarkers = useMemo(
    () => markers.filter((marker) => {
      if (filter === 'preferred') {
        if (marker.type === 'poi') return true;
        if (!hasInterests || !marker.category) return false;
        return user!.interessi!.includes(marker.category);
      }
      if (filter !== 'all' && marker.type !== filter) return false;
      return true;
    }),
    [filter, markers, hasInterests, user],
  );

  const highCrowdMarkers = useMemo(
    () => markers
      .filter((marker) => crowdLevel(marker) >= 72 || marker.crowdingStatus === 'red' || marker.crowdingStatus === 'orange')
      .sort((a, b) => crowdLevel(b) - crowdLevel(a))
      .slice(0, 3),
    [markers],
  );

  const upcomingItems = useMemo(
    () => markers
      .filter((marker) => marker.type !== 'poi' && marker.dateTime)
      .sort((a, b) => new Date(a.dateTime || '').getTime() - new Date(b.dateTime || '').getTime())
      .slice(0, 4),
    [markers],
  );

  const featuredHotspots = useMemo(
    () => markers
      .slice()
      .sort((a, b) => crowdLevel(b) - crowdLevel(a))
      .slice(0, 4),
    [markers],
  );

  const cityAlerts = highCrowdMarkers.map((marker) => ({
      title: `${marker.title}: affollamento elevato`,
      meta: `${markerTypeLabel(marker.type)} · ${Math.round(crowdLevel(marker))} / 100`,
      tone: marker.crowdingStatus,
    }));

  const quickStats = [
    { label: 'Punti live', value: markers.length },
    { label: 'Hotspot', value: highCrowdMarkers.length },
    { label: 'Oggi', value: upcomingItems.length },
  ];
  const currentWeather = weatherMoods.find((item) => item.value === weatherMood) ?? weatherMoods[1];

  return (
    <div className="page-frame home-page">
      <header className="home-control-row" aria-label="Controlli città">
        <div className="city-status-strip">
          <span className="live-dot" aria-hidden="true" />
          <strong>{visibleMarkers.length}</strong>
          <span>punti visibili</span>
        </div>
        <label className="city-search">
          <span>Cerca</span>
          <input type="search" placeholder="Zona, evento, attività" />
        </label>
        <div className="time-filter" aria-label="Filtro orario">
          <button type="button" className="active-filter">Ora</button>
          <button type="button">Oggi</button>
          <button type="button">Weekend</button>
        </div>
        <button className="nearby-button" type="button">Vicino a me</button>
      </header>

      <section className="home-dashboard-grid">
        <aside className={`weather-summary weather-${weatherMood}`} aria-label="Meteo Trento">
          <div className="weather-main">
            <span>{currentWeather.label}</span>
            <strong>{currentWeather.temp}</strong>
            <small>{currentWeather.meta}</small>
          </div>
          <div className="weather-mood-tabs" aria-label="Stato meteo">
            {weatherMoods.map((item) => (
              <button
                key={item.value}
                className={weatherMood === item.value ? 'active-filter' : undefined}
                type="button"
                onClick={() => setWeatherMood(item.value)}
              >
                {item.label}
              </button>
            ))}
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
            <section className="state-panel liquid-panel">Nessun punto visibile per questo filtro.</section>
          )}
          {!isLoading && visibleMarkers.length > 0 && <MapCanvas markers={visibleMarkers} user={user} />}
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
            {featuredHotspots.map((marker) => (
              <article key={marker.id}>
                <span>{marker.title}</span>
                <meter min={0} max={100} value={crowdLevel(marker)} />
                <small>{Math.round(crowdLevel(marker))} / 100</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
