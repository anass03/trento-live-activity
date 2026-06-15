import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeocodedLocation } from "../ui/GeocodedLocation";
import { Icon } from "../ui/Icon";

const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const DARK_STYLE  = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface POIMapPickerProps {
  theme?: string;
  initial?: { latitudine?: number | null; longitudine?: number | null };
  onConfirm: (coords: { latitudine: number; longitudine: number }) => void;
  onCancel: () => void;
}

export function POIMapPicker({ theme, initial, onConfirm, onCancel }: POIMapPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef       = useRef<MapLibreMap | null>(null);
  const markerRef    = useRef<Marker | null>(null);
  const isDark = theme === "dark" || theme === "night";

  const initialCoord: [number, number] | null =
    typeof initial?.latitudine  === "number" &&
    typeof initial?.longitudine === "number"
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
        markerRef.current = new maplibregl.Marker({ color: "var(--violet, #7c3aed)", draggable: true })
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

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="detail-modal-scrim"
      style={{ zIndex: 1000 }}
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(90vw, 640px)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 22,
          overflow: "hidden",
          background: "linear-gradient(150deg, var(--glass-1), var(--glass-2))",
          border: "1px solid var(--border-soft)",
          boxShadow: "0 34px 80px rgba(0,0,0,0.46)",
          backdropFilter: "blur(10px) saturate(140%)",
          animation: "modalIn 220ms cubic-bezier(.2,.8,.3,1)",
        }}
      >
        {/* Header */}
        <div className="detail-modal-head" style={{ "--dm-accent": "var(--violet)" } as React.CSSProperties}>
          <div>
            <div className="detail-modal-kicker">📍 {t("mapPicker.kicker")}</div>
            <h2>{t("mapPicker.title")}</h2>
          </div>
          <button className="detail-modal-close bare-btn" onClick={onCancel} aria-label={t("mapPicker.cancel")}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Map */}
        <div
          ref={containerRef}
          style={{ flex: 1, minHeight: 320, cursor: "crosshair" }}
        />

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          padding: "14px 20px",
          borderTop: "1px solid var(--border-soft-2)",
          background: "linear-gradient(150deg, var(--glass-1), var(--glass-2))",
        }}>
          {/* Coordinate label */}
          <div style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 0, flex: 1 }}>
            {coord ? (
              <>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  <GeocodedLocation value={`${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`} />
                </span>
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.45, fontFamily: "var(--mono)" }}>
                  {coord[1].toFixed(5)}, {coord[0].toFixed(5)}
                </span>
              </>
            ) : (
              <em style={{ color: "var(--text-muted)" }}>{t("mapPicker.noPoint")}</em>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "9px 18px",
                background: "var(--chip-fill)",
                border: "1px solid var(--border-soft)",
                borderRadius: 10,
                color: "var(--text-secondary)",
                fontSize: 13, fontWeight: 500,
                fontFamily: "var(--font)",
                cursor: "pointer",
                transition: "background 140ms, color 140ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--hover-fill)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--chip-fill)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {t("mapPicker.cancel")}
            </button>
            <button
              type="button"
              disabled={!coord}
              onClick={() => coord && onConfirm({ longitudine: coord[0], latitudine: coord[1] })}
              style={{
                padding: "9px 18px",
                background: coord
                  ? "color-mix(in srgb, var(--violet) 22%, transparent)"
                  : "var(--chip-fill)",
                border: `1px solid ${coord ? "color-mix(in srgb, var(--violet) 50%, transparent)" : "var(--border-soft-2)"}`,
                borderRadius: 10,
                color: coord ? "color-mix(in srgb, var(--violet) 90%, var(--text-primary))" : "var(--text-faint)",
                fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font)",
                cursor: coord ? "pointer" : "not-allowed",
                transition: "background 140ms, color 140ms, border-color 140ms, box-shadow 140ms",
                display: "flex", alignItems: "center", gap: 7,
              }}
              onMouseEnter={(e) => { if (coord) { e.currentTarget.style.background = "color-mix(in srgb, var(--violet) 30%, transparent)"; e.currentTarget.style.boxShadow = "0 4px 16px color-mix(in srgb, var(--violet) 28%, transparent)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = coord ? "color-mix(in srgb, var(--violet) 22%, transparent)" : "var(--chip-fill)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <Icon name="check" size={15} />
              {t("mapPicker.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
