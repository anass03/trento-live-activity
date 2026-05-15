import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const CITY_STYLE = 'https://tiles.openfreemap.org/styles/bright';

export interface POIMapPickerProps {
  initial?: { latitudine?: number | null; longitudine?: number | null };
  onConfirm: (coords: { latitudine: number; longitudine: number }) => void;
  onCancel: () => void;
}

export function POIMapPicker({ initial, onConfirm, onCancel }: POIMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialCoord: [number, number] | null =
    typeof initial?.latitudine === 'number' && typeof initial?.longitudine === 'number'
      ? [initial.longitudine, initial.latitudine]
      : null;
  const [coord, setCoord] = useState<[number, number] | null>(initialCoord);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CITY_STYLE,
      center: initialCoord ?? TRENTO_CENTER,
      zoom: initialCoord ? 16 : 14.4,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

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
        });
      }
      setCoord([lng, lat]);
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

  return (
    <div className="poi-map-picker-backdrop" role="presentation" onClick={onCancel}>
      <div className="poi-map-picker liquid-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Scegli la posizione sulla mappa</h2>
          <p>Clicca sulla mappa per posizionare il pin. Puoi trascinarlo per affinare.</p>
        </header>
        <div ref={containerRef} className="poi-map-picker-canvas" />
        <footer>
          <div className="poi-map-picker-coord">
            {coord
              ? <><strong>Coordinate</strong> {coord[1].toFixed(6)}, {coord[0].toFixed(6)}</>
              : <em>Nessun punto selezionato — clicca sulla mappa</em>}
          </div>
          <div className="filter-actions">
            <button type="button" onClick={onCancel}>Annulla</button>
            <button
              type="button"
              className="primary-button"
              disabled={!coord}
              onClick={() => coord && onConfirm({ longitudine: coord[0], latitudine: coord[1] })}
            >
              Conferma posizione
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
