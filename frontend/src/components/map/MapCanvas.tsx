import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function detailPath(marker: MapMarker): string | null {
  if (marker.type === 'activity') return `/attivita/${marker.sourceId}`;
  if (marker.type === 'event') return `/eventi/${marker.sourceId}`;
  return null;
}

export function MapCanvas({ markers }: { markers: MapMarker[] }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<MapMarker | null>(null);
  const [pinned, setPinned] = useState<MapMarker | null>(null);

  // Clear pinned if it disappears from visible markers
  useEffect(() => {
    if (pinned && !markers.some((m) => m.id === pinned.id)) setPinned(null);
  }, [markers, pinned]);

  const displayed = pinned ?? hovered;

  function handleMarkerClick(marker: MapMarker) {
    setPinned((prev) => (prev?.id === marker.id ? null : marker));
  }

  function handleCardClick() {
    if (!displayed) return;
    const path = detailPath(displayed);
    if (path) navigate(path);
  }

  return (
    <section className="map-area glass-panel">
      <div className="map-grid" aria-label="Placeholder mappa interattiva">
        {markers.map((marker) => (
          <button
            key={marker.id}
            className={`marker marker-${marker.crowdingStatus}${pinned?.id === marker.id ? ' marker-pinned' : ''}`}
            style={markerPosition(marker)}
            onMouseEnter={() => setHovered(marker)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleMarkerClick(marker)}
          >
            <span>{marker.title}</span>
            {marker.isCertified && <small className="badge">Verificato</small>}
          </button>
        ))}
      </div>

      {displayed && (
        <aside
          className="marker-card glass-card"
          style={{ cursor: detailPath(displayed) ? 'pointer' : 'default' }}
          onClick={handleCardClick}
          title={detailPath(displayed) ? 'Clicca per aprire i dettagli' : undefined}
        >
          <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            {typeLabel[displayed.type]}{pinned ? ' · fissato' : ''}
          </p>
          <h3 style={{ margin: '0 0 6px' }}>{displayed.title}</h3>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>Affollamento: {statusLabel[displayed.crowdingStatus]}</p>
          {displayed.isCertified && <p className="badge" style={{ margin: 0 }}>Evento certificato</p>}
          {detailPath(displayed) && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-primary)' }}>Apri dettagli →</p>
          )}
        </aside>
      )}
    </section>
  );
}
