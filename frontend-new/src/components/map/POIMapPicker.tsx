import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeocodedLocation } from "../ui/GeocodedLocation";

const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface POIMapPickerProps {
  theme?: string;
  initial?: { latitudine?: number | null; longitudine?: number | null };
  onConfirm: (coords: { latitudine: number; longitudine: number }) => void;
  onCancel: () => void;
}

export function POIMapPicker({ theme, initial, onConfirm, onCancel }: POIMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const isDark = theme === "dark" || theme === "night";

  const initialCoord: [number, number] | null =
    typeof initial?.latitudine === "number" && typeof initial?.longitudine === "number"
      ? [initial.longitudine, initial.latitudine]
      : null;

  const [coord, setCoord] = useState<[number, number] | null>(initialCoord);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? DARK_STYLE : LIGHT_STYLE,
      center: initialCoord ?? TRENTO_CENTER,
      zoom: initialCoord ? 16 : 14.4,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    function place(lng: number, lat: number) {
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#2563eb", draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current.on("dragend", () => {
          const ll = markerRef.current!.getLngLat();
          setCoord([ll.lng, ll.lat]);
        });
      }
      setCoord([lng, lat]);
    }

    if (initialCoord) place(initialCoord[0], initialCoord[1]);
    map.on("click", (e) => place(e.lngLat.lng, e.lngLat.lat));

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-card, #1a1f2e)",
          borderRadius: 16, padding: "20px 20px 16px",
          width: "min(90vw, 640px)", maxHeight: "90vh",
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          border: "1px solid var(--border-soft, rgba(255,255,255,0.08))",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>Scegli posizione sulla mappa</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Clicca sulla mappa o trascina il marcatore per posizionare il POI.
          </p>
        </div>

        <div
          ref={containerRef}
          style={{ width: "100%", height: 360, borderRadius: 12, overflow: "hidden", cursor: "crosshair" }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>
            {coord ? (
              <>
                <strong>
                  <GeocodedLocation value={`${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`} />
                </strong>
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.5, fontFamily: "monospace" }}>
                  {coord[1].toFixed(6)}, {coord[0].toFixed(6)}
                </span>
              </>
            ) : (
              <em style={{ color: "var(--text-muted)" }}>Nessun punto selezionato</em>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="revamp-action-btn" onClick={onCancel}>
              Annulla
            </button>
            <button
              type="button"
              className="revamp-action-btn success"
              disabled={!coord}
              onClick={() => coord && onConfirm({ longitudine: coord[0], latitudine: coord[1] })}
            >
              Conferma posizione
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
