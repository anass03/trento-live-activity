import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CrowdingStatus, MarkerType } from '../../lib/api';

const CARD_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const crowdColors: Record<CrowdingStatus, string> = {
  green: '#2f9e72',
  yellow: '#c9a227',
  orange: '#d97706',
  red: '#c2413f',
};

function crowdStatusForLevel(level: number): CrowdingStatus {
  if (level >= 82) return 'red';
  if (level >= 62) return 'orange';
  if (level >= 34) return 'yellow';
  return 'green';
}

function addHeatLayers(map: MapLibreMap, coordinates: [number, number], color: string, crowdLevel: number) {
  const sourceId = 'card-preview-point';
  const layerIds = ['card-preview-outer', 'card-preview-mid', 'card-preview-core'];

  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { crowdLevel },
          geometry: { type: 'Point', coordinates },
        },
      ],
    },
  });

  map.addLayer({
    id: 'card-preview-outer',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-color': color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 42 + crowdLevel * 0.7, 17, 110 + crowdLevel * 1.2],
      'circle-opacity': 0.18,
      'circle-blur': 1,
    },
  });
  map.addLayer({
    id: 'card-preview-mid',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-color': color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 18 + crowdLevel * 0.45, 17, 48 + crowdLevel * 0.9],
      'circle-opacity': 0.32,
      'circle-blur': 0.72,
    },
  });
  map.addLayer({
    id: 'card-preview-core',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-color': color,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 7, 17, 16],
      'circle-opacity': 0.88,
      'circle-blur': 0.18,
    },
  });
}

export type CardMapPreviewProps = {
  latitude?: number | null;
  longitude?: number | null;
  title: string;
  category?: string | null;
  description?: string | null;
  dateTime?: string | null;
  type: Exclude<MarkerType, 'poi'>;
  crowdLevel?: number;
};

export function CardMapPreview({
  latitude,
  longitude,
  title,
  crowdLevel = 42,
}: CardMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [hasMapError, setHasMapError] = useState(false);
  const normalizedCrowdLevel = Math.max(0, Math.min(100, Math.round(crowdLevel)));
  const crowdStatus = crowdStatusForLevel(normalizedCrowdLevel);
  const crowdColor = crowdColors[crowdStatus];

  const coordinates = useMemo<[number, number] | null>(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return [longitude as number, latitude as number];
  }, [latitude, longitude]);

  useEffect(() => {
    if (!coordinates || !containerRef.current || mapRef.current) return;

    setHasMapError(false);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARD_MAP_STYLE,
      center: coordinates,
      zoom: 15.85,
      pitch: 62,
      bearing: -8,
      interactive: false,
      attributionControl: { compact: true },
      renderWorldCopies: false,
    });

    const markerElement = document.createElement('div');
    markerElement.className = `card-map-marker card-map-marker-${crowdStatus}`;
    markerElement.style.setProperty('--card-marker-color', crowdColor);
    markerElement.title = title;

    const marker = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
      .setLngLat(coordinates)
      .addTo(map);

    markerRef.current = marker;

    const handleLoad = () => {
      addHeatLayers(map, coordinates, crowdColor, normalizedCrowdLevel);
      map.easeTo({ center: coordinates, zoom: 16.05, pitch: 64, bearing: -4, duration: 1200 });
    };
    const handleError = () => setHasMapError(true);

    map.once('load', handleLoad);
    map.on('error', handleError);
    mapRef.current = map;

    return () => {
      map.off('error', handleError);
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [coordinates, crowdColor, crowdStatus, normalizedCrowdLevel, title]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coordinates) return;

    markerRef.current?.setLngLat(coordinates);
    map.easeTo({ center: coordinates, zoom: 15.85, pitch: 62, bearing: -8, duration: 700 });
    if (map.isStyleLoaded()) {
      addHeatLayers(map, coordinates, crowdColor, normalizedCrowdLevel);
    }
  }, [coordinates, crowdColor, normalizedCrowdLevel]);

  return (
    <div className={`card-map-preview ${!coordinates ? 'is-empty' : ''}`} aria-hidden="true">
      {coordinates ? (
        <>
          <div ref={containerRef} className="card-map-canvas" />
          {hasMapError && <div className="card-map-empty">Mappa non disponibile</div>}
          <div className="card-map-vignette" />
        </>
      ) : (
        <div className="card-map-empty">Coordinate non disponibili</div>
      )}
    </div>
  );
}

export function activityCrowdLevel(participantCount: number, maxParticipants: number) {
  if (!maxParticipants) return 35;
  return Math.max(8, Math.min(100, Math.round((participantCount / maxParticipants) * 100)));
}
