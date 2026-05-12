import { useEffect, useState } from 'react';
import type { MapMarker } from '../../lib/api';

const statusLabel = { green: 'Basso affollamento', yellow: 'Medio affollamento', red: 'Alto affollamento' };
const typeLabel = { poi: 'POI', activity: 'Attività', event: 'Evento' };

const TRENTO_BOUNDS = {
  minLat: 46.058,
  maxLat: 46.08,
  minLng: 11.105,
  maxLng: 11.13,
};

function clamp(value: number) {
  return Math.min(92, Math.max(8, value));
}

function markerPosition(marker: MapMarker) {
  const x = ((marker.longitude - TRENTO_BOUNDS.minLng) / (TRENTO_BOUNDS.maxLng - TRENTO_BOUNDS.minLng)) * 100;
  const y = (1 - ((marker.latitude - TRENTO_BOUNDS.minLat) / (TRENTO_BOUNDS.maxLat - TRENTO_BOUNDS.minLat))) * 100;
  return { left: `${clamp(x)}%`, top: `${clamp(y)}%` };
}

export function MapCanvas({ markers }: { markers: MapMarker[] }) {
  const [selected, setSelected] = useState<MapMarker | null>(markers[0] ?? null);

  useEffect(() => {
    setSelected((current) => {
      if (current && markers.some((marker) => marker.id === current.id)) return current;
      return markers[0] ?? null;
    });
  }, [markers]);

  return (
    <section className="map-area glass-panel">
      <div className="map-grid" aria-label="Placeholder mappa interattiva">
        {markers.map((marker) => (
          <button
            key={marker.id}
            className={`marker marker-${marker.crowdingStatus}`}
            style={markerPosition(marker)}
            onClick={() => setSelected(marker)}
          >
            <span>{marker.title}</span>
            {marker.isCertified && <small className="badge">Verificato</small>}
          </button>
        ))}
      </div>

      {selected && (
        <aside className="marker-card glass-card">
          <h3>{selected.title}</h3>
          <p>Tipo: {typeLabel[selected.type]}</p>
          <p>Stato: {statusLabel[selected.crowdingStatus]}</p>
          {selected.isCertified && <p className="badge">Evento certificato</p>}
        </aside>
      )}
    </section>
  );
}
