import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Stessi stili tile di TrentoMap (CartoDB, gratuiti, senza API key)
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Il tema dell'app vive su document.documentElement.dataset.theme come
// "night"/"day" (storicamente anche "dark"): allineato a TrentoMap.
const isDarkTheme = (theme?: string) => theme === "dark" || theme === "night";
const currentTheme = () => document.documentElement.dataset.theme || "night";

type MiniMapProps = {
  latitude: number;
  longitude: number;
  label?: string | null;
  /** Colore del pin (hex/rgb concreto, niente var() perché finisce in un SVG) */
  markerColor?: string;
  height?: number;
};

/**
 * Micro-mappa reale (maplibre-gl) per i popup di dettaglio: centrata sulle
 * coordinate ricevute, con un marker. Interattività limitata: scroll-zoom e
 * rotazione disattivati (resta il drag), tile coerenti col tema night/day.
 */
export function MiniMap({ latitude, longitude, label, markerColor = "#2dd4bf", height = 180 }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Init + cleanup
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDarkTheme(currentTheme()) ? DARK_STYLE : LIGHT_STYLE,
      center: [longitude, latitude],
      zoom: 15.2,
      minZoom: 11,
      maxZoom: 18,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    // Interattività limitata: niente scroll-zoom aggressivo nel modal.
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disableRotation();
    map.keyboard.disable();

    markerRef.current = new maplibregl.Marker({ color: markerColor })
      .setLngLat([longitude, latitude])
      .addTo(map);

    mapRef.current = map;

    // Segui i cambi tema live (il modal può restare aperto durante lo switch)
    const observer = new MutationObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      m.setStyle(isDarkTheme(currentTheme()) ? DARK_STYLE : LIGHT_STYLE);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // creata una sola volta; il ricentraggio vive nell'effetto sotto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ricentra quando cambia l'elemento selezionato (stesso modal, altro parcheggio)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([longitude, latitude]);
    map.easeTo({ center: [longitude, latitude], duration: 450 });
  }, [latitude, longitude]);

  return (
    <div className="dm-mini-map" style={{ height, minHeight: height }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, borderRadius: "inherit" }} />
      {label && (
        <span className="dm-map-label" style={{ zIndex: 2, pointerEvents: "none" }}>{label}</span>
      )}
    </div>
  );
}
