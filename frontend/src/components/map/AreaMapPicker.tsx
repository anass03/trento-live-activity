import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { GeocodedLocation } from '../ui/GeocodedLocation';

const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const CITY_STYLE = 'https://tiles.openfreemap.org/styles/bright';

/** Build a GeoJSON polygon approximating a circle (64 segments). */
function buildCircle(lat: number, lng: number, radiusKm: number) {
  const points = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = (radiusKm / 111.32) / Math.cos((lat * Math.PI) / 180);
    const dy = radiusKm / 110.574;
    coords.push([lng + dx * Math.sin(angle), lat + dy * Math.cos(angle)]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

export interface AreaMapPickerProps {
  initial?: { centerLat?: number | string | null; centerLng?: number | string | null; radiusKm?: number | string | null };
  onConfirm: (area: { centerLat: number; centerLng: number; radiusKm: number }) => void;
  onCancel: () => void;
}

export function AreaMapPicker({ initial, onConfirm, onCancel }: AreaMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const radiusRef = useRef<number>(initial?.radiusKm ? Number(initial.radiusKm) : 2);

  const initialCoord: [number, number] | null =
    initial?.centerLng != null && initial?.centerLat != null &&
    !isNaN(Number(initial.centerLng)) && !isNaN(Number(initial.centerLat))
      ? [Number(initial.centerLng), Number(initial.centerLat)]
      : null;

  const [coord, setCoord] = useState<[number, number] | null>(initialCoord);
  const [radiusKm, setRadiusKm] = useState<number>(radiusRef.current);

  // Keep ref in sync so the dragend closure always sees the latest radius.
  useEffect(() => { radiusRef.current = radiusKm; }, [radiusKm]);

  function updateCircle(map: MapLibreMap, lat: number, lng: number, radius: number) {
    if (!map.isStyleLoaded()) return;
    const src = map.getSource('area-circle') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(buildCircle(lat, lng, radius));
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CITY_STYLE,
      center: initialCoord ?? TRENTO_CENTER,
      zoom: initialCoord ? 13 : 14.4,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('area-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'area-circle-fill',
        type: 'fill',
        source: 'area-circle',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'area-circle-stroke',
        type: 'line',
        source: 'area-circle',
        paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-opacity': 0.7 },
      });
      if (initialCoord) updateCircle(map, initialCoord[1], initialCoord[0], radiusRef.current);
    });

    function place(lng: number, lat: number) {
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: '#2563eb', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current!.getLngLat();
          setCoord([ll.lng, ll.lat]);
          updateCircle(map, ll.lat, ll.lng, radiusRef.current);
        });
      }
      setCoord([lng, lat]);
      updateCircle(map, lat, lng, radiusRef.current);
    }

    if (initialCoord) place(initialCoord[0], initialCoord[1]);
    map.on('click', (e) => place(e.lngLat.lng, e.lngLat.lat));

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw circle whenever radius slider changes.
  useEffect(() => {
    if (mapRef.current && coord) {
      updateCircle(mapRef.current, coord[1], coord[0], radiusKm);
    }
  }, [radiusKm, coord]);

  return (
    <div className="poi-map-picker-backdrop" role="presentation" onClick={onCancel}>
      <div className="poi-map-picker liquid-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Scegli l'area di analisi</h2>
          <p>Clicca sulla mappa per impostare il centro, poi definisci il raggio.</p>
        </header>
        <div ref={containerRef} className="poi-map-picker-canvas" />
        <footer>
          <div className="poi-map-picker-coord">
            {coord ? (
              <>
                <strong><GeocodedLocation value={`${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`} /></strong>
                <code style={{ fontSize: 11, opacity: 0.6 }}>{coord[1].toFixed(6)}, {coord[0].toFixed(6)}</code>
              </>
            ) : (
              <em>Nessun punto selezionato — clicca sulla mappa</em>
            )}
            <div className="area-picker-radius-input" style={{ marginTop: 8 }}>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(0.1, Number(e.target.value) || 0.1))}
                style={{ width: 70 }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>km</span>
            </div>
          </div>
          <div className="filter-actions">
            <button type="button" onClick={onCancel}>Annulla</button>
            <button
              type="button"
              className="primary-button"
              disabled={!coord}
              onClick={() => coord && onConfirm({ centerLng: coord[0], centerLat: coord[1], radiusKm })}
            >
              Conferma area
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
