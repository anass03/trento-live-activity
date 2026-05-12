import { useEffect, useMemo, useState } from 'react';
import { MapCanvas } from '../components/map/MapCanvas';
import { getMapMarkers, type MapMarker, type MarkerType } from '../lib/api';
import type { AppUser } from '../data/mockUser';

type Filter = 'all' | MarkerType;

const filterLabels: Array<{ label: string; value: Filter }> = [
  { label: 'Tutti', value: 'all' },
  { label: 'Attività', value: 'activity' },
  { label: 'Eventi', value: 'event' },
  { label: 'POI', value: 'poi' },
];

export function MapPage({ user }: { user?: AppUser }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInterests = Array.isArray(user?.interessi) && (user!.interessi!.length ?? 0) > 0;

  async function loadMarkers() {
    setIsLoading(true);
    setError(null);
    try {
      setMarkers(await getMapMarkers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel caricamento della mappa.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMarkers();
  }, []);

  const visibleMarkers = useMemo(
    () => markers.filter((marker) => {
      if (filter !== 'all' && marker.type !== filter) return false;
      if (hasInterests && marker.type !== 'poi' && marker.category) {
        return user!.interessi!.includes(marker.category);
      }
      return true;
    }),
    [filter, markers, hasInterests, user],
  );

  return (
    <div className="page-frame">
      <header className="utility-strip glass-card">
        <div>
          <h1>Mappa</h1>
          <p>Scopri attività, eventi e luoghi vicino a te</p>
        </div>
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
      </header>
      {isLoading && <section className="state-panel glass-panel">Caricamento dati mappa da PostgreSQL...</section>}
      {error && (
        <section className="state-panel glass-panel">
          <p>{error}</p>
          <button onClick={loadMarkers} type="button">Riprova</button>
        </section>
      )}
      {!isLoading && !error && visibleMarkers.length === 0 && (
        <section className="state-panel glass-panel">Nessun marker disponibile per il filtro selezionato.</section>
      )}
      {!isLoading && !error && visibleMarkers.length > 0 && <MapCanvas markers={visibleMarkers} />}
    </div>
  );
}
