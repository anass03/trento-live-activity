import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { catColor, catLabel } from "../../data/redesignData";

// CartoDB vector tile style urls (completely free, no API key required)
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];

export const CAT_ICON: Record<string, string> = { 
  musica: "music", 
  cultura: "landmark", 
  sport: "run", 
  cibo: "food", 
  outdoor: "bike", 
  famiglia: "family" 
};

function getIconSvg(name: string, size = 15): string {
  const paths: Record<string, string> = {
    grid: `<rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />`,
    landmark: `<path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" />`,
    music: `<circle cx="6" cy="18" r="2.5" /><circle cx="17" cy="16" r="2.5" /><path d="M8.5 18V6l11-2v10" />`,
    run: `<circle cx="13" cy="4.5" r="1.8" /><path d="M5 21l3-5 3.5-2 1-4 3 3 3 1" /><path d="M8 11l3-2 3 1" />`,
    food: `<path d="M5 3v7a2 2 0 0 0 2 2v9" /><path d="M9 3v9" /><path d="M5 3v4" /><path d="M9 3v4" /><path d="M18 3c-1.5 0-3 2-3 5s1 4 1 4v9" /><path d="M18 3v18" />`,
    bike: `<circle cx="6" cy="17" r="3.2" /><circle cx="18" cy="17" r="3.2" /><path d="M6 17l4-7h5l-3 7" /><path d="M10 10l-1.5-3H6" /><circle cx="15" cy="5" r="1" />`,
    family: `<circle cx="9" cy="6" r="2.4" /><circle cx="16" cy="7" r="2" /><path d="M5 21v-4a4 4 0 0 1 8 0v4" /><path d="M14 21v-3a3.5 3.5 0 0 1 6 0v3" />`,
    x: `<path d="M6 6l12 12" /><path d="M18 6L6 18" />`,
    pin: `<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" />`,
    clock: `<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />`,
    ticket: `<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M14 6v12" />`
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg>`;
}

interface TrentoMapProps {
  theme: "light" | "dark" | "auto";
  markers: any[];
  activeFilter: string;
  onMarkerClick: (marker: any) => void;
  selectedMarkerId?: string | null;
  zoom: number;
  setZoom: (z: number) => void;
  is3d: boolean;
  onLocateRef?: React.MutableRefObject<(() => void) | null>;
  onResetRef?: React.MutableRefObject<(() => void) | null>;
}

export const TrentoMap = React.memo(function TrentoMap({
  theme,
  markers,
  activeFilter,
  onMarkerClick,
  selectedMarkerId,
  zoom,
  setZoom,
  is3d,
  onLocateRef,
  onResetRef
}: TrentoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const mapMarkers = useRef<maplibregl.Marker[]>([]);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: TRENTO_CENTER,
      zoom: 14.2,
      minZoom: 11,
      maxZoom: 19,
      pitch: is3d ? 60 : 0,
      bearing: is3d ? -20 : 0,
      attributionControl: false,
    });

    map.on("load", () => {
      setStyleLoaded(true);
    });

    map.on("styledata", () => {
      setStyleLoaded(true);
    });

    // Handle zoom callbacks to synchronize state
    map.on("zoom", () => {
      const currentZoom = parseFloat(map.getZoom().toFixed(2));
      // Avoid circular updates by checking diff
      setZoom(currentZoom);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update theme dynamically
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const styleUrl = theme === "dark" ? DARK_STYLE : LIGHT_STYLE;
    setStyleLoaded(false);
    map.setStyle(styleUrl);
  }, [theme]);

  // Handle camera changes based on zoom prop
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const currentZoom = parseFloat(map.getZoom().toFixed(2));
    if (Math.abs(currentZoom - zoom) > 0.05) {
      map.zoomTo(zoom);
    }
  }, [zoom]);

  // Handle 3D pitch/bearing toggle
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    map.easeTo({
      pitch: is3d ? 60 : 0,
      bearing: is3d ? -20 : 0,
      duration: 850
    });
  }, [is3d]);

  // Set reference functions for Locate and Reset
  useEffect(() => {
    if (onLocateRef) {
      onLocateRef.current = () => {
        const map = mapInstance.current;
        if (!map) return;
        map.flyTo({
          center: TRENTO_CENTER,
          zoom: 15.5,
          pitch: 60,
          bearing: -20,
          duration: 1200
        });
      };
    }
    if (onResetRef) {
      onResetRef.current = () => {
        const map = mapInstance.current;
        if (!map) return;
        map.flyTo({
          center: TRENTO_CENTER,
          zoom: 14.2,
          pitch: 0,
          bearing: 0,
          duration: 1200
        });
      };
    }
  }, [onLocateRef, onResetRef]);

  // Fly to selected marker coordinates dynamically
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectedMarkerId || !styleLoaded) return;
    const marker = markers.find((m) => m.id === selectedMarkerId);
    if (marker) {
      map.flyTo({
        center: [marker.longitude ?? 11.121, marker.latitude ?? 46.067],
        zoom: Math.max(map.getZoom(), 15.5),
        duration: 1000
      });
    }
  }, [selectedMarkerId, markers, styleLoaded]);

  // Render HTML markers dynamically on the MapLibre canvas
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !styleLoaded) return;

    // Clear previous markers
    mapMarkers.current.forEach((m) => m.remove());
    mapMarkers.current = [];

    // Filter and add markers
    markers.forEach((m) => {
      const dim = activeFilter !== "all" && activeFilter !== m.cat;
      const selected = selectedMarkerId === m.id;
      
      const el = document.createElement("div");
      el.className = `marker ${m.live ? "live" : ""} ${dim ? "dimmed" : ""} ${selected ? "selected" : ""}`;
      el.style.setProperty("--mc", catColor(m.cat));
      el.style.pointerEvents = "auto";
      
      const dot = document.createElement("div");
      dot.className = "marker-dot";
      
      const iconName = CAT_ICON[m.cat] || "grid";
      dot.innerHTML = getIconSvg(iconName, 17);
      el.appendChild(dot);

      // Add popup tooltip content only if NOT selected
      if (!selected) {
        const tip = document.createElement("div");
        tip.className = "marker-tip";
        tip.style.setProperty("--mc", catColor(m.cat));
        tip.innerHTML = `
          <div class="tip-cat">${catLabel(m.cat)}</div>
          <div class="tip-title">${m.title}</div>
          <div class="tip-meta">
            <span>${m.time}</span> · <span>${m.place}</span>
          </div>
        `;
        el.appendChild(tip);
      } else {
        // Detailed Event Popup (React component HTML equivalent)
        const popupDiv = document.createElement("div");
        const placeBelow = (m.latitude ?? 46.067) > 46.07;
        popupDiv.className = `event-popup ${placeBelow ? "below" : ""}`;
        popupDiv.style.setProperty("--ec", catColor(m.cat));
        
        const going = m.going ?? 25;
        const cap = m.cap ?? 50;
        const pct = Math.min(100, Math.round((going / cap) * 100));
        
        popupDiv.innerHTML = `
          <div class="ep-head">
            <div class="ep-cat">
              <span class="ep-cat-ic">${getIconSvg(CAT_ICON[m.cat] || "grid", 12)}</span>
              ${catLabel(m.cat)}
            </div>
            <div class="ep-title">${m.title}</div>
            <button class="ep-close" aria-label="Chiudi">${getIconSvg("x", 13)}</button>
          </div>
          <div class="ep-body">
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("pin", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">Luogo</div>
                <div class="ep-fval">${m.place}</div>
              </div>
            </div>
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("clock", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">Quando</div>
                <div class="ep-fval">${m.date}, ${m.time}</div>
              </div>
            </div>
            <div class="ep-part">
              <div class="ep-part-l">
                <div class="ep-flbl">Partecipanti</div>
                <div class="ep-part-bar"><i style="width: ${pct}%"></i></div>
              </div>
              <div class="ep-part-n"><b>${going}</b> / ${cap}</div>
            </div>
            <button class="ep-cta">${getIconSvg("ticket", 15)} Partecipa</button>
          </div>
        `;

        popupDiv.addEventListener("click", (e) => {
          e.stopPropagation();
        });

        const closeBtn = popupDiv.querySelector(".ep-close");
        if (closeBtn) {
          closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onMarkerClick(null);
          });
        }

        const ctaBtn = popupDiv.querySelector(".ep-cta");
        if (ctaBtn) {
          ctaBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            alert(`Grazie per esserti registrato all'evento: ${m.title}`);
          });
        }

        el.appendChild(popupDiv);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onMarkerClick(m);
      });

      const maplibreMarker = new maplibregl.Marker({ element: el })
        .setLngLat([m.longitude ?? 11.121, m.latitude ?? 46.067])
        .addTo(map);

      mapMarkers.current.push(maplibreMarker);
    });
  }, [markers, activeFilter, selectedMarkerId, styleLoaded]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0, borderRadius: "inherit" }} 
    />
  );
});
