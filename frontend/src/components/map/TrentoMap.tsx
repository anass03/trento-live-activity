import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CAT_ICON, catColor, catLabel } from "../../data/redesignData";
import { showToast } from "../ui/Toaster";

// CartoDB vector tile style urls (completely free, no API key required)
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];

// Il tema dell'app circola come "night"/"day" (data-theme), ma storicamente
// arrivava anche "dark": accetta entrambi per scegliere le tile scure.
const isDarkTheme = (theme: string) => theme === "dark" || theme === "night";

// I popup/tooltip sono costruiti via innerHTML: la descrizione è testo libero
// dell'utente, quindi va sempre escapata prima di interpolarla (anti-XSS).
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    ticket: `<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" /><path d="M14 6v12" />`,
    sparkle: `<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />`,
    bookmark: `<path d="M6 4h12v17l-6-4.5L6 21z" />`,
    layers: `<path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" />`,
    arrow: `<path d="M5 12h14" /><path d="M13 6l6 6-6 6" />`,
    parking: `<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" />`
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.grid}</svg>`;
}

const CROWD_COLOR: Record<string, string> = {
  green: "var(--green)",
  yellow: "var(--amber)",
  red: "var(--red)",
};
const CROWD_KEY: Record<string, string> = {
  green: "map.poi.crowdLow",
  yellow: "map.poi.crowdMedium",
  red: "map.poi.crowdHigh",
};

interface TrentoMapProps {
  theme: "light" | "dark" | "auto";
  markers: any[];
  /* categorie attive (multiselect); array vuoto = mostra tutto */
  activeCategories: string[];
  /* "all" | "poi" | "event" | "activity" */
  kindFilter?: string;
  onMarkerClick: (marker: any) => void;
  selectedMarkerId?: string | null;
  zoom: number;
  setZoom: (z: number) => void;
  is3d: boolean;
  onLocateRef?: React.MutableRefObject<(() => void) | null>;
  onResetRef?: React.MutableRefObject<(() => void) | null>;
  onResetNorthRef?: React.MutableRefObject<(() => void) | null>;
  onBearingChange?: (deg: number) => void;
  onFlyToRef?: React.MutableRefObject<((lng: number, lat: number, zoom?: number) => void) | null>;
  onTempMarkerRef?: React.MutableRefObject<((lng: number, lat: number) => void) | null>;
  /* true quando l'utente loggato è un cittadino: abilita la CTA
     "Crea attività qui" nel popup dei POI */
  canCreateActivity?: boolean;
  /* true quando l'utente può partecipare (registered_user); false = mostra "Vedi" */
  canJoin?: boolean;
  /* true per system_admin / municipal_admin: non mostrano CTA, vedono il messaggio cittadino */
  isAdmin?: boolean;
  /* IDs of events/activities owned by the current user — show "View" not "Join" */
  ownedIds?: Set<string>;
  onCreatePoi?: (marker: any) => void;
  /* apre la pagina di dettaglio di un evento/attività dal popup */
  onOpenDetail?: (marker: any) => void;
  /* naviga a una pagina (es. impostazioni dal toast "posizione non consentita") */
  onNavigate?: (page: string) => void;
}

export const TrentoMap = React.memo(function TrentoMap({
  theme,
  markers,
  activeCategories,
  kindFilter = "all",
  onMarkerClick,
  selectedMarkerId,
  zoom,
  setZoom,
  is3d,
  onLocateRef,
  onResetRef,
  onResetNorthRef,
  onBearingChange,
  onFlyToRef,
  onTempMarkerRef,
  canJoin = false,
  isAdmin = false,
  ownedIds,
  canCreateActivity,
  onCreatePoi,
  onOpenDetail,
  onNavigate
}: TrentoMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const mapMarkers = useRef<maplibregl.Marker[]>([]);
  const userDotMarker = useRef<maplibregl.Marker | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle = isDarkTheme(theme) ? DARK_STYLE : LIGHT_STYLE;

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

    // Sincronizza lo stato React solo a fine zoom: ascoltare "zoom" (che spara
    // ad ogni frame) faceva rientrare il nuovo valore nell'effetto zoomTo e
    // interrompeva le animazioni flyTo/easeTo a metà.
    map.on("zoomend", () => {
      setZoom(parseFloat(map.getZoom().toFixed(2)));
    });

    // Report bearing so the compass needle can reflect the map's rotation live.
    map.on("rotate", () => onBearingChange?.(map.getBearing()));
    map.on("pitchend", () => onBearingChange?.(map.getBearing()));

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
    const styleUrl = isDarkTheme(theme) ? DARK_STYLE : LIGHT_STYLE;
    setStyleLoaded(false);
    map.setStyle(styleUrl);
  }, [theme]);

  // Handle camera changes based on zoom prop (i bottoni +/- dei controlli).
  // Non interferire se la mappa sta già animando verso una destinazione
  // (flyTo da marker/locate/reset): lo stato si riallinea sullo zoomend.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || map.isMoving()) return;
    const currentZoom = parseFloat(map.getZoom().toFixed(2));
    if (Math.abs(currentZoom - zoom) > 0.05) {
      map.easeTo({ zoom, duration: 250 });
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
        const flyToFallback = () => map.flyTo({ center: TRENTO_CENTER, zoom: 15.5, duration: 1100 });
        // Toast "posizione non consentita" con scorciatoia alle impostazioni.
        const notifyBlocked = (denied: boolean) => {
          showToast({
            title: denied ? t("map.locationDenied") : t("map.locationOff"),
            body: denied ? t("map.locationDeniedHint") : t("map.locationOffHint"),
            type: "error",
            action: onNavigate ? { label: t("map.locationOffAction"), onClick: () => onNavigate("impostazioni") } : undefined,
          });
        };
        const locMode = (() => { try { return localStorage.getItem("tla:locationMode") || "never"; } catch { return "never"; } })();
        // "Mai": NON spostiamo la mappa, segnaliamo solo che la posizione è
        // disattivata e offriamo il link alle impostazioni.
        if (locMode === "never") { notifyBlocked(false); return; }
        // Browser senza geolocalizzazione: avvisa, non centrare in silenzio.
        if (!navigator.geolocation) { notifyBlocked(false); return; }
        // Trento area bounding box — roughly 20 km radius around city center
        const TRENTO_BOUNDS = { minLat: 45.96, maxLat: 46.18, minLng: 11.00, maxLng: 11.24 };
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const m = mapInstance.current;
            if (!m) return;
            const { latitude, longitude } = pos.coords;
            const insideTrento = latitude >= TRENTO_BOUNDS.minLat && latitude <= TRENTO_BOUNDS.maxLat
              && longitude >= TRENTO_BOUNDS.minLng && longitude <= TRENTO_BOUNDS.maxLng;
            if (!insideTrento) {
              showToast({ title: t("map.outsideTrento"), body: t("map.outsideTrentoHint"), type: "info" });
              return;
            }
            const coords: [number, number] = [longitude, latitude];
            if (!userDotMarker.current) {
              const dot = document.createElement("div");
              dot.className = "tla-user-dot";
              userDotMarker.current = new maplibregl.Marker({ element: dot }).setLngLat(coords).addTo(m);
            } else {
              userDotMarker.current.setLngLat(coords);
            }
            m.flyTo({ center: coords, zoom: Math.max(m.getZoom(), 16), duration: 1100 });
          },
          (err) => {
            // Permesso negato a livello browser → stesso avviso del "Mai".
            // Altri errori (timeout/posizione non disponibile) → fallback al centro.
            if (err && err.code === err.PERMISSION_DENIED) { notifyBlocked(true); return; }
            flyToFallback();
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
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
    if (onResetNorthRef) {
      onResetNorthRef.current = () => {
        const map = mapInstance.current;
        if (!map) return;
        // Compass: re-orient to north and flatten the tilt (leave zoom/center).
        map.easeTo({ bearing: 0, pitch: 0, duration: 600 });
      };
    }
    if (onFlyToRef) {
      onFlyToRef.current = (lng: number, lat: number, zoom = 16) => {
        const map = mapInstance.current;
        if (!map) return;
        map.flyTo({ center: [lng, lat], zoom, duration: 1200 });
      };
    }
    if (onTempMarkerRef) {
      onTempMarkerRef.current = (lng: number, lat: number) => {
        const map = mapInstance.current;
        if (!map) return;
        if (!document.getElementById("tla-pulse-kf")) {
          const s = document.createElement("style");
          s.id = "tla-pulse-kf";
          s.textContent = `@keyframes tla-pm{0%{box-shadow:0 0 0 0 rgba(13,148,136,.6)}70%{box-shadow:0 0 0 16px rgba(13,148,136,0)}100%{box-shadow:0 0 0 0 rgba(13,148,136,0)}}`;
          document.head.appendChild(s);
        }
        const el = document.createElement("div");
        el.style.cssText = "width:20px;height:20px;border-radius:50%;background:rgba(13,148,136,.75);border:2px solid #0d9488;animation:tla-pm 1s ease infinite;transition:opacity .5s";
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        setTimeout(() => { el.style.opacity = "0"; setTimeout(() => marker.remove(), 500); }, 3000);
      };
    }
  }, [onLocateRef, onResetRef, onResetNorthRef, onFlyToRef, onTempMarkerRef, onNavigate, t]);

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
      const isParking = m.type === "parking";
      const isPoi = m.type === "poi" && !isParking;
      const selected = selectedMarkerId === m.id;

      // Parking markers: visible on "all" and "parking"; hidden on poi/event/activity.
      // Non-parking markers: hidden on "parking"; otherwise standard kind check.
      const kindOut = m.type === "parking"
        ? (kindFilter !== "all" && kindFilter !== "parking")
        : (kindFilter === "parking" || (kindFilter !== "all" && m.type !== kindFilter));

      // Category filter: applies to all marker types.
      // An empty activeCategories array means "show all".
      const catOut = activeCategories.length > 0 && !activeCategories.includes(m.cat);

      // Out-of-filter markers are removed entirely. The selected marker is always
      // kept so an open popup doesn't vanish when the user changes filters.
      if ((kindOut || catOut) && !selected) return;

      const crowd = m.raw?.crowdingStatus || "green";
      const color = isParking ? "var(--teal)" : isPoi ? CROWD_COLOR[crowd] : catColor(m.cat);
      const crowdLabel = t(CROWD_KEY[crowd] || CROWD_KEY.green);

      // Per le attività mostriamo la descrizione come testo grande (il tipo
      // sport/cultura resta la piccola etichetta sopra); gli eventi tengono il
      // proprio titolo. Senza descrizione si ricade sul titolo dell'attività.
      const bigTitle = escapeHtml(m.type === "activity" && m.description ? m.description : (m.title || ""));

      // L'elemento esterno è posizionato da maplibre via transform inline:
      // niente transform in CSS qui, le animazioni vivono sul .tla-pin interno.
      const el = document.createElement("div");
      el.className = `tla-marker${(isPoi || isParking) ? " poi" : ""}${m.live ? " live" : ""}${selected ? " selected" : ""}`;
      el.style.setProperty("--mc", color);
      if (selected) el.style.zIndex = "30";

      const pin = document.createElement("div");
      pin.className = "tla-pin";
      pin.innerHTML = `<span class="tla-pin-ic">${getIconSvg(isParking ? "parking" : isPoi ? "pin" : (CAT_ICON[m.cat] || "grid"), 14)}</span>`;
      el.appendChild(pin);

      // Add popup tooltip content only if NOT selected
      if (!selected) {
        const tip = document.createElement("div");
        tip.className = "marker-tip";
        tip.style.setProperty("--mc", color);
        if (isParking) {
          const free = m.raw?.free ?? null;
          const cap = m.raw?.capacity ?? 0;
          tip.innerHTML = `
            <div class="tip-cat">${t("widgets.parking.title")}</div>
            <div class="tip-title">${m.title}</div>
            <div class="tip-meta">${free != null ? `${free} / ${cap} ${t("widgets.parking.cars")}` : t("widgets.parking.unavailable")}</div>
          `;
        } else if (isPoi) {
          tip.innerHTML = `
          <div class="tip-cat">${t("map.poi.label")}</div>
          <div class="tip-title">${m.title}</div>
          <div class="tip-meta"><span class="tip-crowd-dot"></span>${crowdLabel}</div>
        `;
        } else {
          tip.innerHTML = `
          <div class="tip-cat">${catLabel(m.cat)}</div>
          <div class="tip-title">${bigTitle}</div>
          <div class="tip-meta">
            <span>${m.time}</span> · <span>${m.place}</span>
          </div>
        `;
        }
        el.appendChild(tip);
      } else if (isParking) {
        const popupDiv = document.createElement("div");
        const placeBelow = (m.latitude ?? 46.067) > 46.07;
        popupDiv.className = `event-popup poi-popup ${placeBelow ? "below" : ""}`;
        popupDiv.style.setProperty("--ec", color);
        const free = m.raw?.free ?? null;
        const cap = m.raw?.capacity ?? 0;
        const pct = cap > 0 && free != null ? Math.min(100, Math.round(((cap - free) / cap) * 100)) : 0;
        const typeLabel = m.raw?.type === "bike" ? t("widgets.parking.bikes") : t("widgets.parking.cars");
        popupDiv.innerHTML = `
          <div class="ep-head">
            <div class="ep-cat"><span class="ep-cat-ic">${getIconSvg("parking", 12)}</span>${t("widgets.parking.title")}</div>
            <div class="ep-title">${m.title}</div>
            <button class="ep-close" aria-label="${t("widgets.popup.close")}">${getIconSvg("x", 13)}</button>
          </div>
          <div class="ep-body">
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("pin", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">${t("widgets.popup.place")}</div>
                <div class="ep-fval">${m.raw?.address || m.title}</div>
              </div>
            </div>
            <div class="ep-part">
              <div class="ep-part-l">
                <div class="ep-flbl">${t("widgets.parking.occupied")} · ${typeLabel}</div>
                <div class="ep-part-bar"><i style="width: ${pct}%; background: ${pct > 85 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--teal)"}"></i></div>
              </div>
              <div class="ep-part-n"><b>${free != null ? cap - free : "?"}</b> / ${cap}</div>
            </div>
          </div>
        `;
        popupDiv.addEventListener("click", (e) => e.stopPropagation());
        popupDiv.querySelector(".ep-close")?.addEventListener("click", (e) => {
          e.stopPropagation();
          onMarkerClick(null);
        });
        el.appendChild(popupDiv);
      } else if (isPoi) {
        // POI selezionato: card con stato affollamento e creazione attività.
        // Il flusso cittadino parte da qui: prima il POI, poi la categoria.
        const popupDiv = document.createElement("div");
        const placeBelow = (m.latitude ?? 46.067) > 46.07;
        popupDiv.className = `event-popup poi-popup ${placeBelow ? "below" : ""}`;
        popupDiv.style.setProperty("--ec", color);
        popupDiv.innerHTML = `
          <div class="ep-head">
            <div class="ep-cat"><span class="ep-cat-ic">${getIconSvg("pin", 12)}</span>${t("map.poi.label")}</div>
            <div class="ep-title">${m.title}</div>
            <button class="ep-close" aria-label="${t("widgets.popup.close")}">${getIconSvg("x", 13)}</button>
          </div>
          <div class="ep-body">
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("grid", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">${t("map.poi.status")}</div>
                <div class="ep-fval">${crowdLabel}</div>
              </div>
            </div>
            ${canCreateActivity
              ? `<button class="ep-cta ep-create">${getIconSvg("pin", 15)} ${t("map.poi.createHere")}</button>`
              : `<div class="ep-flbl" style="text-align:center;padding:4px 0">${t("map.poi.loginToCreate")}</div>`}
          </div>
        `;
        popupDiv.addEventListener("click", (e) => e.stopPropagation());
        popupDiv.querySelector(".ep-close")?.addEventListener("click", (e) => {
          e.stopPropagation();
          onMarkerClick(null);
        });
        popupDiv.querySelector(".ep-create")?.addEventListener("click", (e) => {
          e.stopPropagation();
          onCreatePoi && onCreatePoi(m);
        });
        el.appendChild(popupDiv);
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
            <div class="ep-title">${bigTitle}</div>
            <button class="ep-close" aria-label="${t("widgets.popup.close")}">${getIconSvg("x", 13)}</button>
          </div>
          <div class="ep-body">
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("pin", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">${t("widgets.popup.place")}</div>
                <div class="ep-fval">${m.place}</div>
              </div>
            </div>
            <div class="ep-field">
              <span class="ep-fic">${getIconSvg("clock", 14)}</span>
              <div class="ep-ftext">
                <div class="ep-flbl">${t("widgets.popup.when")}</div>
                <div class="ep-fval">${m.date}, ${m.time}</div>
              </div>
            </div>
            <div class="ep-part">
              <div class="ep-part-l">
                <div class="ep-flbl">${t("widgets.popup.participants")}</div>
                <div class="ep-part-bar"><i style="width: ${pct}%"></i></div>
              </div>
              <div class="ep-part-n"><b>${going}</b> / ${cap}</div>
            </div>
            ${isAdmin
              ? `<div class="ep-flbl" style="text-align:center;padding:4px 0">${t("map.adminHint")}</div>`
              : `<button class="ep-cta">${(() => { const own = !!(ownedIds && (ownedIds.has(m.sourceId) || ownedIds.has(m.id))); const join = canJoin && !own; return `${join ? getIconSvg("ticket", 15) : getIconSvg("arrow", 15)} ${join ? t("widgets.popup.join") : t("widgets.popup.view")}`; })()}</button>`
            }
            ${canCreateActivity && m.poiId ? `<button class="ep-cta ep-create-also" style="margin-top:6px;background:transparent;border:1.5px solid rgba(128,128,128,0.25);color:var(--text-secondary);box-shadow:none;font-weight:600">${getIconSvg("pin", 15)} ${t("map.poi.createHere")}</button>` : ""}
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

        if (!isAdmin) {
          const ctaBtn = popupDiv.querySelector(".ep-cta");
          if (ctaBtn) {
            ctaBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              onOpenDetail && onOpenDetail(m);
            });
          }
        }

        if (canCreateActivity && m.poiId) {
          const createAlsoBtn = popupDiv.querySelector(".ep-create-also");
          if (createAlsoBtn) {
            createAlsoBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              onCreatePoi && onCreatePoi({ sourceId: m.poiId, id: m.poiId, title: m.place || m.title });
            });
          }
        }

        el.appendChild(popupDiv);
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onMarkerClick(m);
      });

      // anchor "bottom": la punta del pin tocca la coordinata esatta
      const maplibreMarker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([m.longitude ?? 11.121, m.latitude ?? 46.067])
        .addTo(map);

      mapMarkers.current.push(maplibreMarker);
    });
  }, [markers, activeCategories, kindFilter, selectedMarkerId, styleLoaded, canCreateActivity, canJoin, isAdmin, ownedIds, t]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0, borderRadius: "inherit" }} 
    />
  );
});
