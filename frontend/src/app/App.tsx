/* ===========================================================
   Trento Live Activity — App
   =========================================================== */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { TrentoMap } from "../components/map/TrentoMap";
import { CreateActivityPanel } from "../components/map/CreateActivityPanel";
import { ActiveAreasWidget, AlertsWidget, EventsWidget, MapLabels, MarkersLayer, ParkingWidget, WeatherWidget, ServiceRequestWidget } from "../components/redesign/widgets";
import { TrentoTweaks } from "../components/redesign/TrentoTweaks";
import { LoginModal } from "../components/auth/LoginModal";
import { Icon } from "../components/ui/Icon";
import { DetailModal } from "../components/ui/DetailModal";
import { Toaster, showToast } from "../components/ui/Toaster";
import { onForegroundMessage } from "../lib/firebase";
import { C, CATEGORIES, catColor } from "../data/redesignData";
import { ActivityPage } from "../pages/ActivitiesPage";
import { EventsPage } from "../pages/EventsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ActivityDetailPage } from "../pages/ActivityDetailPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { RegistrationPage } from "../pages/RegistrationPage";
import { PasswordResetPage } from "../pages/PasswordResetPage";
import { ProfilePage } from "../pages/ProfilePage";
import { Setup2FAPage } from "../pages/Setup2FAPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import { OnboardingInteressiPage } from "../pages/OnboardingInteressiPage";
import { EntityPublishPage } from "../pages/EntityPublishPage";
import { ComuneDashboardPage } from "../pages/ComuneDashboardPage";
import { ComuneStatistichePage } from "../pages/ComuneStatistichePage";
import { ComuneExportPage } from "../pages/ComuneExportPage";
import { ServiceRequestModal } from "../components/ui/ServiceRequestModal";
import { AdminPOIPage } from "../pages/AdminPOIPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AdminEntitiesPage } from "../pages/AdminEntitiesPage";
import { AdminModerationPage } from "../pages/AdminModerationPage";
import { AdminNotificationsPage } from "../pages/AdminNotificationsPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { TermsPage } from "../pages/TermsPage";
import { getMe, getToken, setToken, UserRole, getHomeMapData, getMyActivities, getMyEvents, getParking, isActivityDeleted, type ServiceRequestCategory } from "../lib/api";
import { getTimeFormat } from "../lib/i18n";
import "../styles/revamp-pages.css";

const fmtHHmm = (hhmm: string): string => {
  if (!hhmm || getTimeFormat() !== "12h") return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return hhmm;
  return `${h % 12 || 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
};

function getSvgCoordinates(lat: number, lng: number, placeName?: string | null): { x: number, y: number } {
  const name = (placeName || "").toLowerCase();
  if (name.includes("duomo")) return { x: 49, y: 53 };
  if (name.includes("buonconsiglio") || name.includes("castello")) return { x: 63, y: 28 };
  if (name.includes("muse")) return { x: 33, y: 70 };
  if (name.includes("belenzani")) return { x: 45, y: 41 };
  if (name.includes("albere")) return { x: 28, y: 57 };
  if (name.includes("doss")) return { x: 73, y: 21 };
  if (name.includes("fiera")) return { x: 55, y: 58 };
  if (name.includes("manci")) return { x: 52, y: 40 };
  if (name.includes("sociale")) return { x: 58, y: 47 };
  if (name.includes("gocciadoro")) return { x: 41, y: 72 };
  if (name.includes("biblioteca")) return { x: 50, y: 34 };
  if (name.includes("gallerie")) return { x: 44, y: 55 };
  if (name.includes("roccabruna")) return { x: 60, y: 56 };

  const x = 2419.35 * lng - 26852.1;
  const y = -5121.951 * lat + 236002.75;
  return {
    x: Math.max(10, Math.min(90, x)),
    y: Math.max(10, Math.min(90, y))
  };
}

function distanceKm(aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return Number.POSITIVE_INFINITY;
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

// Restituisce la chiave i18n dell'etichetta (tradotta poi con t() nel componente).
function areaLabel(score: number) {
  if (score >= 0.78) return { labelKey: "home.area.veryActive", color: "var(--magenta)" };
  if (score >= 0.55) return { labelKey: "home.area.active", color: "var(--orange)" };
  if (score >= 0.36) return { labelKey: "home.area.moderate", color: "var(--amber)" };
  return { labelKey: "home.area.quiet", color: "var(--teal)" };
}

// Locale per date/orari formattati: segue la lingua corrente di i18n.
const dateLocale = (lang?: string) => (lang?.startsWith("en") ? "en-GB" : "it-IT");

// Category multiselect filter bar.
// activeCategories: Set of selected categories; empty Set = "All" (show everything).
// Clicking "All" clears the set. Clicking a category toggles it. If the last
// category is deselected the set reverts to empty (= All).
function FilterBar({ activeCategories, toggleCategory, markers, kind }: {
  activeCategories: Set<string>;
  toggleCategory: (id: string) => void;
  markers: any[];
  kind: string;
}) {
  const { t } = useTranslation();
  // Category pills: exclude "all" and "poi" (poi is handled by KindBar)
  const contentCats = CATEGORIES.filter((c) => c.id !== "all" && c.id !== "poi");
  const allSelected = activeCategories.size === 0;

  // Count non-POI markers per category, respecting current kind filter
  const baseMarkers = (markers || []).filter((m: any) => m.type !== "poi");
  const count = (id: string) => baseMarkers.filter((m: any) => m.cat === id).length;
  const totalCount = baseMarkers.length;

  // When kind is "poi" or "parking", categories don't apply. Rather than
  // unmounting the bar, we freeze it behind frosted glass so it stays in place
  // and visibly reads as "not selectable" instead of vanishing.
  const locked = kind === "poi" || kind === "parking";

  return (
    <div
      className={"filterbar" + (locked ? " is-locked" : "")}
      aria-disabled={locked || undefined}
    >
      <button
        className={"filter-pill" + (allSelected ? " active" : "")}
        style={{ "--fc": C.cyan } as React.CSSProperties}
        onClick={() => toggleCategory("all")}
        tabIndex={locked ? -1 : undefined}
      >
        <Icon name="grid" size={16} />
        {t("categories.all")}
        <span className="cnt">{totalCount}</span>
      </button>
      {contentCats.map((c) => (
        <button
          key={c.id}
          className={"filter-pill" + (activeCategories.has(c.id) ? " active" : "")}
          style={{ "--fc": c.color } as React.CSSProperties}
          onClick={() => toggleCategory(c.id)}
          tabIndex={locked ? -1 : undefined}
        >
          <Icon name={c.icon} size={16} />
          {t(c.labelKey)}
          <span className="cnt">{count(c.id)}</span>
        </button>
      ))}
    </div>
  );
}

// Builds the displacement map for the lens as a RASTER PNG. This matters:
// feImage DOES drive a displacement map inside a `backdrop-filter` in Chromium,
// but only with a raster bitmap — an inline-SVG data-URI whose map is built with
// mix-blend-mode rasterizes wrong (Chromium drops those CSS props). So we paint
// the map pixel-by-pixel on a canvas instead. R encodes horizontal shift, G
// vertical; 128 = no shift. Values ramp out from the centre so the whole pane
// magnifies like a real convex glass lens (uniform, not random wobble).
function buildLensMapDataURL() {
  const W = 256;
  const H = 64;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4;
      const nx = (i / (W - 1)) * 2 - 1; // -1 (left) .. 1 (right)
      const ny = (j / (H - 1)) * 2 - 1; // -1 (top)  .. 1 (bottom)
      img.data[k] = Math.round(128 + nx * 127); // R → x displacement
      img.data[k + 1] = Math.round(128 + ny * 127); // G → y displacement
      img.data[k + 2] = 128; // B neutral
      img.data[k + 3] = 255; // A opaque (required, or the map reads as empty)
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

// SVG filter behind the "liquid glass" lens on the locked category bar. feImage
// paints the bevel/lens map; three feDisplacementMap passes at slightly
// different scales (R/G/B) give a subtle chromatic-aberration fringe like real
// thick glass, recombined with screen blends. No trailing blur — that would
// turn the crisp lens back into frost. Referenced from CSS via
// backdrop-filter: url(#liquidGlass). The displaced map tracks the live MapLibre
// canvas every compositor frame, so it refracts the moving city in real time.
function LiquidGlassFilter() {
  // The map is resolution-independent (stretched to the bar via preserveAspectRatio
  // none), so it only needs building once on the client.
  const [lensMap] = useState(() =>
    typeof document === "undefined" ? "" : buildLensMapDataURL()
  );
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        {/* Region extends past the bar so the displacement samples real map
            pixels near the edges (no transparent rim). The feImage is mapped
            back onto the element box in region-relative %: x=-30%/w=160% →
            18.75%–81.25%; y=-150%/h=400% → 37.5%–62.5%. */}
        <filter
          id="liquidGlass"
          x="-30%" y="-150%" width="160%" height="400%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={lensMap}
            xlinkHref={lensMap}
            x="18.75%" y="37.5%" width="62.5%" height="25%"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={72}
            xChannelSelector="R" yChannelSelector="G" result="dR" />
          <feColorMatrix in="dR" type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cR" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={66}
            xChannelSelector="R" yChannelSelector="G" result="dG" />
          <feColorMatrix in="dG" type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cG" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={60}
            xChannelSelector="R" yChannelSelector="G" result="dB" />
          <feColorMatrix in="dB" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cB" />
          <feBlend in="cR" in2="cG" mode="screen" result="rg" />
          <feBlend in="rg" in2="cB" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}

// Kind filter: single-select type of map content. Keep this in sync with the
// buttons rendered in KindBar — "parking" is a real, selectable kind (it locks
// the category filters, see FilterBar), so it must be part of the union.
type MapKind = "all" | "poi" | "event" | "activity" | "parking";

function KindBar({ kind, setKind }: { kind: MapKind; setKind: (k: MapKind) => void }) {
  const { t } = useTranslation();
  const kinds: { id: MapKind; icon: string; color: string }[] = [
    { id: "all",      icon: "grid",     color: C.cyan    },
    { id: "poi",      icon: "pin",      color: "#f87171" },
    { id: "event",    icon: "calendar", color: "#a78bfa" },
    { id: "activity", icon: "activity", color: "#34d399" },
    { id: "parking",  icon: "parking",  color: "var(--teal)" },
  ];
  return (
    <div className="filterbar kindbar">
      {kinds.map((k) => (
        <button
          key={k.id}
          className={"filter-pill" + (kind === k.id ? " active" : "")}
          style={{ "--fc": k.color } as React.CSSProperties}
          onClick={() => setKind(k.id)}
        >
          <Icon name={k.icon} size={15} />
          {t(`mapKind.${k.id}`)}
        </button>
      ))}
    </div>
  );
}

function MapControls({ zoom, setZoom, is3d, setIs3d, onLocate, onReset }: any) {
  const { t } = useTranslation();
  return (
    <div className="map-controls">
      <button className={"mc-btn" + (is3d ? " on" : "")} onClick={() => setIs3d(!is3d)}><Icon name="cube" size={17} /><span className="mc-label">3D</span></button>
      <button className="mc-btn" onClick={onLocate}><Icon name="locate" size={17} /><span className="mc-label">{t("home.locate")}</span></button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.max(11, +(z - 0.5).toFixed(2)))}><Icon name="minus" size={17} /></button>
      {/* percentuale sul range di zoom della mappa (11–19) */}
      <div className="mc-btn" style={{ fontFamily: "var(--mono)", fontSize: 12, minWidth: 50, pointerEvents: "none" }}>{Math.round(((Math.min(19, Math.max(11, zoom)) - 11) / 8) * 100)}%</div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.min(19, +(z + 0.5).toFixed(2)))}><Icon name="plus" size={17} /></button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={onReset}><Icon name="layers" size={17} /><span className="mc-label">{t("home.reset")}</span></button>
    </div>
  );
}

function Clock() {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const locale = dateLocale(i18n.language);
  const hour12 = getTimeFormat() === "12h";
  const time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12 });
  const date = now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="clock-pill">
      <span className="led live green"></span>
      <span className="t">{time}</span>
      <span className="d">{date}</span>
    </div>
  );
}

function HomeScene({ page, setPage, theme, setTheme, user, setSelectedEventId, setSelectedActivityId, flyToRef, tempMarkerRef }: any) {
  const { t, i18n } = useTranslation();
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<MapKind>("all");
  const [zoom, setZoom] = useState(14.2);
  const locateRef = React.useRef<(() => void) | null>(null);
  const resetRef = React.useRef<(() => void) | null>(null);
  const resetNorthRef = React.useRef<(() => void) | null>(null);
  const [bearing, setBearing] = useState(0);
  const [is3d, setIs3d] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // POI scelto dal popup mappa per creare un'attività (id + nome)
  const [createPoi, setCreatePoi] = useState<{ id: string; title: string } | null>(null);
  // null = modal open no pre-selection, category = open with pre-selected cat, undefined = closed
  const [srCategory, setSrCategory] = useState<ServiceRequestCategory | null | undefined>(undefined);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);

  useEffect(() => { document.documentElement.style.setProperty("--zoom", String(zoom)); }, [zoom]);

  const refreshOwnedIds = async () => {
    if (!user?.id) { setOwnedIds(new Set()); return; }
    const ids = new Set<string>();
    if (user.role === "registered_user") {
      try {
        const res = await getMyActivities();
        (res.items || []).forEach((a: any) => ids.add(a.id));
      } catch (_) {}
    }
    if (user.role === "certified_entity") {
      try {
        const res = await getMyEvents();
        (res.events || []).forEach((e: any) => ids.add(e.id));
      } catch (_) {}
    }
    setOwnedIds(ids);
  };

  useEffect(() => {
    refreshOwnedIds();
  }, [user?.id, user?.role]);

  const toggleCategory = (id: string) => {
    if (id === "all") {
      setActiveCategories(new Set()); // empty = show all
      return;
    }
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // If nothing is selected, revert to "all"
      return next.size === 0 ? new Set() : next;
    });
  };

  const loadMapData = async () => {
    setLoading(true);
    try {
      const data = await getHomeMapData();
      setMapData(data);
    } catch (err) {
      console.warn("Dati mappa temporaneamente non disponibili:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
    const interval = setInterval(loadMapData, 45000); // Poll every 45s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await getParking();
        if (active) setParkingSpots(res.parkings || []);
      } catch (_) {}
    };
    load();
    const iv = setInterval(load, 30000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    const onKey = (e: any) => { if (e.key === "Escape") setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dynamicMarkers = React.useMemo(() => {
    if (!mapData || !mapData.markers) return [];
    const now = Date.now();
    return mapData.markers.filter((m: any) => {
      if (m.latitude == null || m.longitude == null) return false;
      if (m.type === "activity" && isActivityDeleted(m.sourceId || m.id)) return false;
      if (m.type !== "poi" && m.dateTime) {
        try { if (new Date(m.dateTime).getTime() < now) return false; } catch (_) {}
      }
      return true;
    }).map((m: any) => {
      const { x, y } = getSvgCoordinates(m.latitude, m.longitude, m.title);
      
      // I POI non sono eventi: tengono cat "poi" (pin dedicato sulla mappa).
      // Per il resto la tassonomia backend (sport/cultura/musica/arte/
      // gastronomia/studio/altro) passa invariata: le pillole la rispecchiano.
      let cat = m.category || "altro";
      if (m.type === "poi") {
        cat = "poi";
      } else {
        const validCategories = ["sport", "cultura", "musica", "arte", "gastronomia", "studio", "altro"];
        if (!validCategories.includes(cat)) cat = "altro";
      }

      const dtLocale = dateLocale(i18n.language);
      let timeStr = t("home.timeTBD");
      if (m.dateTime) {
        try {
          timeStr = new Date(m.dateTime).toLocaleTimeString(dtLocale, { hour: "2-digit", minute: "2-digit", hour12: getTimeFormat() === "12h" });
        } catch (e) {}
      }

      return {
        id: m.id,
        sourceId: m.sourceId,
        type: m.type,
        cat,
        x,
        y,
        latitude: m.latitude,
        longitude: m.longitude,
        live: m.type === "event" || m.type === "activity",
        title: m.title,
        place: m.location || m.title,
        poiId: m.poiId || null,
        time: timeStr,
        cap: m.total || m.maxPartecipanti || m.capacity || 0,
        going: m.free !== undefined && m.total !== undefined ? m.total - m.free : (m.participantCount || 0),
        date: m.dateTime ? new Date(m.dateTime).toLocaleDateString(dtLocale, { day: "numeric", month: "short" }) : t("home.dateTBD"),
        description: m.description || null,
        raw: m
      };
    });
  }, [mapData, t, i18n.language]);

  const parkingMarkers = React.useMemo(() => {
    return parkingSpots
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: `parking:${p.id}`,
        sourceId: p.id,
        type: "parking",
        cat: "parking",
        latitude: p.latitude,
        longitude: p.longitude,
        live: false,
        title: p.name,
        place: p.address || p.name,
        time: "",
        cap: p.capacity,
        going: p.occupied ?? (p.capacity - (p.free ?? 0)),
        free: p.free,
        date: "",
        description: p.address || null,
        raw: p,
      }));
  }, [parkingSpots]);

  const allMarkers = React.useMemo(() => [...dynamicMarkers, ...parkingMarkers], [dynamicMarkers, parkingMarkers]);

  // Markers filtered by kind — used for category counts in FilterBar.
  const kindMarkers = React.useMemo(() => {
    if (kind === "all") return dynamicMarkers; // parking shown separately
    return dynamicMarkers.filter((m: any) => m.type === kind);
  }, [dynamicMarkers, kind]);

  const dynamicEvents = React.useMemo(() => {
    if (!mapData || !mapData.events) return [];
    const now = Date.now();
    const cutoff = now + 7 * 24 * 60 * 60 * 1000; // 7 days ahead
    return mapData.events.filter((e: any) => {
      const dt = e.dateTime || e.startTime;
      if (dt) {
        try {
          const t = new Date(dt).getTime();
          if (t < now || t > cutoff) return false;
        } catch (_) {}
      }
      return true;
    }).sort((a: any, b: any) => {
      const ta = new Date(a.dateTime || a.startTime || 0).getTime();
      const tb = new Date(b.dateTime || b.startTime || 0).getTime();
      return ta - tb;
    }).slice(0, 7).map((e: any) => {
      let cat = e.category || "altro";
      const validCategories = ["sport", "cultura", "musica", "arte", "gastronomia", "studio", "altro"];
      if (!validCategories.includes(cat)) cat = "altro";

      const gradients: Record<string, string> = {
        cultura: "linear-gradient(135deg,#7c3aed,#4c1d95)",
        musica: "linear-gradient(135deg,#db2777,#831843)",
        sport: "linear-gradient(135deg,#059669,#064e3b)",
        arte: "linear-gradient(135deg,#ea580c,#7c2d12)",
        gastronomia: "linear-gradient(135deg,#d97706,#7c2d12)",
        studio: "linear-gradient(135deg,#0d9488,#134e4a)",
        altro: "linear-gradient(135deg,#0ea5e9,#075985)"
      };

      return {
        id: e.id,
        cat,
        date: e.dateTime ? new Date(e.dateTime).toLocaleDateString(dateLocale(i18n.language), { day: "numeric", month: "short" }) : t("home.dateTBD"),
        start: e.startTime ? fmtHHmm(e.startTime.slice(0, 5)) : "N/D",
        end: e.endTime ? fmtHHmm(e.endTime.slice(0, 5)) : "N/D",
        going: e.participantCount ?? 0,
        cap: e.maxPartecipanti ?? 0,
        title: e.title,
        place: e.location || t("home.placeTBC"),
        description: e.description,
        latitude: e.latitude,
        longitude: e.longitude,
        img: gradients[cat] || gradients.cultura,
        raw: e
      };
    });
  }, [mapData, t, i18n.language]);

  const dynamicAreas = React.useMemo(() => {
    if (!mapData || !mapData.pois) return [];
    const levelMap: Record<string, number> = {
      rosso: 0.68,
      giallo: 0.44,
      verde: 0.16
    };
    const rows = mapData.pois.map((p: any) => {
      const lat = p.latitude ?? p.latitudine;
      const lng = p.longitude ?? p.longitudine;
      const nearbyEvents = (mapData.events || []).filter((e: any) => distanceKm(lat, lng, e.latitude, e.longitude) <= 0.45);
      const nearbyActivities = (mapData.activities || []).filter((a: any) => distanceKm(lat, lng, a.latitude, a.longitude) <= 0.45);
      const eventPressure = nearbyEvents.reduce((acc: number, e: any) => acc + Math.min(0.16, ((e.participantCount || 0) / Math.max(10, e.maxPartecipanti || 40)) * 0.22), 0);
      const activityPressure = nearbyActivities.reduce((acc: number, a: any) => acc + Math.min(0.12, ((a.participantCount || 0) / Math.max(6, a.maxParticipants || 15)) * 0.18), 0);
      const status = p.statoAffollamento || p.crowdingStatus || "verde";
      const level = Math.max(0.05, Math.min(0.98, (levelMap[status] ?? 0.16) + eventPressure + activityPressure));
      const label = areaLabel(level);
      return {
        name: p.nome || p.title,
        cat: p.tipo || "outdoor",
        level,
        label: t(label.labelKey),
        color: label.color,
        status,
        eventsNearby: nearbyEvents.length,
        activitiesNearby: nearbyActivities.length,
        participants: nearbyEvents.reduce((acc: number, e: any) => acc + (e.participantCount || 0), 0)
          + nearbyActivities.reduce((acc: number, a: any) => acc + (a.participantCount || 0), 0),
        latitude: lat,
        longitude: lng,
      };
    });
    const sorted = rows.sort((a: any, b: any) => b.level - a.level);
    return sorted.slice(0, 8);
  }, [mapData, t, i18n.language]);

  const focusOn = (xPct: number, yPct: number) => {
    // pan so the point moves toward center; clamp gently
    const px = Math.max(-22, Math.min(22, (50 - xPct) * 0.7));
    const py = Math.max(-16, Math.min(16, (50 - yPct) * 0.7));
    setPan({ x: px, y: py });
    setZoom((z) => Math.max(z, 1.35));
  };
  
  const openMarkerPopup = (m: any) => {
    focusOn(m.x, m.y);
    setPopup({ markerId: m.id, cat: m.cat, title: m.title, place: m.place,
      when: `${m.date}, ${m.time}`, going: m.going, cap: m.cap });
  };
  
  const openEventPopup = (e: any) => {
    const m = dynamicMarkers.find((mk: any) => mk.sourceId === e.id || mk.id === e.id || mk.id === `event:${e.id}`)
      || dynamicMarkers.find((mk: any) => mk.place === e.place)
      || dynamicMarkers.find((mk: any) => mk.cat === e.cat)
      || dynamicMarkers[0];
    if (m) {
      focusOn(m.x, m.y);
      setPopup({ markerId: m.id, cat: e.cat, title: e.title, place: e.place,
        when: `${e.date}, ${e.start} – ${e.end}`, going: e.going, cap: e.cap });
    }
    setDetail({ type: "event", title: e.title, data: e, accent: catColor(e.cat) });
  };
  
  const closePopup = () => setPopup(null);
  const reset = () => {
    if (resetRef.current) resetRef.current();
    setPan({ x: 0, y: 0 });
    setZoom(14.2);
    setIs3d(false);
    setActiveCategories(new Set());
    setKind("all");
    setPopup(null);
  };
  const locate = () => {
    if (locateRef.current) locateRef.current();
  };

  const innerStyle: React.CSSProperties = {
    position: "absolute", inset: 0,
  };
  const tiltStyle: React.CSSProperties = {
    position: "absolute", inset: 0,
  };

  return (
    <div className="scene">
      {/* MAP */}
      <div className="layer-map">
        <div className="map-wrap" onClick={closePopup}>
          <div className="map-inner" style={innerStyle}>
            <div className="map-tilt" style={tiltStyle}>
              <TrentoMap
                theme={theme}
                markers={allMarkers}
                activeCategories={Array.from(activeCategories)}
                kindFilter={kind}
                onMarkerClick={(m) => m ? openMarkerPopup(m) : closePopup()}
                selectedMarkerId={popup?.markerId}
                zoom={zoom}
                setZoom={setZoom}
                is3d={is3d}
                onLocateRef={locateRef}
                onResetRef={resetRef}
                onResetNorthRef={resetNorthRef}
                onBearingChange={setBearing}
                onFlyToRef={flyToRef}
                onTempMarkerRef={tempMarkerRef}
                canCreateActivity={user?.role === "registered_user"}
                canJoin={user?.role === "registered_user"}
                isAdmin={user?.role === "system_admin" || user?.role === "municipal_admin"}
                ownedIds={ownedIds}
                onCreatePoi={(m) => {
                  setPopup(null);
                  setCreatePoi({ id: m.sourceId || m.id, title: m.title });
                }}
                onOpenDetail={(m) => {
                  setPopup(null);
                  const targetId = m.sourceId || m.id;
                  if (m.type === "activity") {
                    setSelectedActivityId(targetId);
                    setPage("attivita-dettaglio");
                  } else {
                    setSelectedEventId(targetId);
                    setPage("evento-dettaglio");
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="map-grade"></div>
      </div>

      <div className="vignette"></div>

      {/* HEADER */}
      <div className="layer-header">
        <Header
          page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user}
          searchItems={dynamicMarkers}
          onSearchSelect={(m: any) => openMarkerPopup(m)}
        />
      </div>

      {/* FILTER BARS */}
      <LiquidGlassFilter />
      <KindBar kind={kind} setKind={setKind} />
      <FilterBar activeCategories={activeCategories} toggleCategory={toggleCategory} markers={kindMarkers} kind={kind} />
      <Clock />

      {/* WIDGETS */}
      <div className="layer-widgets">
        <div className="col-left">
          <WeatherWidget delay={80} onOpen={setDetail} />
          <AlertsWidget delay={180} onOpen={setDetail} />
          <ParkingWidget delay={280} onOpen={setDetail} />
        </div>
        <div className="col-right">
          <ActiveAreasWidget delay={140} areas={dynamicAreas} onOpen={setDetail} />
          {user?.role !== "system_admin" && user?.role !== "municipal_admin" && (
            <EventsWidget delay={240} onFocus={(e: any) => {
                setSelectedEventId(e.id || e.sourceId);
                setPage("evento-dettaglio");
              }} events={dynamicEvents} onWidgetClick={() => setPage("eventi")} />
          )}
          {user?.role === "registered_user" && (
            <ServiceRequestWidget delay={340} onOpen={(cat) => setSrCategory(cat ?? null)} />
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <MapControls zoom={zoom} setZoom={setZoom} is3d={is3d} setIs3d={setIs3d} onLocate={locate} onReset={reset} />
      <button
        type="button"
        className="compass"
        aria-label={t("home.resetNorth")}
        title={t("home.resetNorth")}
        onClick={() => {
          // Avoid two competing easeTo animations: if 3D is on, just exit it
          // (its effect already flattens pitch + re-orients to north); otherwise
          // reset the bearing from any manual drag-rotation.
          if (is3d) setIs3d(false);
          else resetNorthRef.current?.();
        }}
      >
        <span className="nlabel">N</span>
        <span className="needle" style={{ transform: `rotate(${-bearing}deg)` }}><Icon name="compass" size={26} /></span>
      </button>

      <DetailModal
        open={!!detail}
        type={detail?.type}
        title={detail?.title}
        accent={detail?.accent}
        data={detail?.data}
        onClose={() => setDetail(null)}
        onAction={(action, payload) => {
          if (action === "open-events-page") setPage("eventi");
          if (action === "open-activity-page") setPage("attivita");
          if (action === "show-alert-on-map") {
            setDetail(null);
            const loc = payload?.location;
            if (loc?.longitude != null && loc?.latitude != null) {
              if (flyToRef.current) flyToRef.current(loc.longitude, loc.latitude, 16);
              if (tempMarkerRef.current) tempMarkerRef.current(loc.longitude, loc.latitude);
            }
          }
          if (action === "show-parking-on-map") {
            setDetail(null);
            const lng = payload?.longitude ?? payload?.lng;
            const lat = payload?.latitude ?? payload?.lat;
            if (lng != null && lat != null && flyToRef.current) {
              flyToRef.current(lng, lat, 18);
            }
            if (payload?.id) {
              setPopup({ markerId: `parking:${payload.id}` });
            }
          }
        }}
      />

      {createPoi && (
        <CreateActivityPanel
          poi={createPoi}
          onClose={() => setCreatePoi(null)}
          onCreated={() => { loadMapData(); refreshOwnedIds(); }}
        />
      )}

      {srCategory !== undefined && (
        <ServiceRequestModal
          theme={theme}
          initialCategory={srCategory ?? undefined}
          onClose={() => setSrCategory(undefined)}
        />
      )}

    </div>
  );
}

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function mapBackendRole(ruolo?: string): UserRole {
  if (!ruolo) return "anonymous";
  switch (ruolo) {
    case "AmministratoreDiSistema": return "system_admin";
    case "EnteCertificato": return "certified_entity";
    case "AmministratoreComunale": return "municipal_admin";
    case "UtenteRegistrato": return "registered_user";
    default: return "anonymous";
  }
}

// Deep-link entry for email links and shared URLs. Cloudflare serves index.html
// for every path (not_found_handling=single-page-application), so we read the
// path once at load and open the right page. Without this the SPA always started
// on "home", so the email verification and password-reset links did nothing.
function computeInitialPage(): string {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname;
  if (path.startsWith("/verifica-email")) return "verifica-email";
  // The backend builds /password-reset/:token (token in the path), but
  // PasswordResetPage reads it from ?token= — normalise it into the query.
  const reset = path.match(/^\/password-reset\/([^/?#]+)/);
  if (reset) {
    window.history.replaceState({}, document.title, `/password-reset?token=${reset[1]}`);
    return "password-reset";
  }
  if (path.startsWith("/password-reset")) return "password-reset";
  return "home";
}
const INITIAL_PAGE = computeInitialPage();

export function App() {
  const [page, setPage] = useState(INITIAL_PAGE);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [themeMode, setThemeModeState] = useState(() => {
    const stored = localStorage.getItem("tla:themeMode") || "light";
    return stored === "auto" ? "system" : stored;
  });
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem("tla:themeMode") || "light";
    const mode = stored === "auto" ? "system" : stored;
    if (mode === "light") return "day";
    if (mode === "dark") return "night";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  });
  // Guests carry no fake identity: pages render their own i18n guest labels.
  const [user, setUser] = useState({
    id: null as string | null,
    name: "",
    email: "",
    role: "anonymous" as UserRole,
    avatar: "",
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const flyToRef = React.useRef<((lng: number, lat: number, zoom?: number) => void) | null>(null);
  const tempMarkerRef = React.useRef<((lng: number, lat: number) => void) | null>(null);

  const fetchUser = async () => {
    const token = getToken();
    if (!token) {
      setUser({
        id: null,
        name: "",
        email: "",
        role: "anonymous",
        avatar: "",
      });
      return;
    }

    // Decode the token locally to see if it needs 2FA setup (admin first login)
    const decoded = decodeJwt(token);

    // An expired token must never produce a logged-in UI: drop it and stay guest.
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      setToken(null);
      setUser({ id: null, name: "", email: "", role: "anonymous", avatar: "" });
      return;
    }

    if (decoded && decoded.needs2faSetup) {
      const role = mapBackendRole(decoded.ruolo);
      setUser({
        id: decoded.id,
        name: "Amministratore (Setup 2FA)",
        email: "",
        role,
        avatar: "A",
      });
      // Do not query /me, it is blocked with 403 on the backend until 2FA setup is completed.
      setPage("setup-2fa");
      return;
    }

    try {
      const data: any = await getMe();
      const role = mapBackendRole(data.ruolo);
      const name = data.nomeEnte || (data.nome && data.cognome ? `${data.nome} ${data.cognome}` : (data.email?.split("@")[0] || "Utente"));
      const avatar = data.nomeEnte ? data.nomeEnte.substring(0, 2).toUpperCase() : (data.nome ? data.nome[0].toUpperCase() : "U");
      
      setUser({
        id: data.id,
        name,
        email: data.email,
        role,
        avatar,
      });
    } catch (err: any) {
      console.error("Error loading user profile:", err);
      if (err.code !== "2FA_SETUP_REQUIRED") {
        // Invalid/expired token: clear it and fall back to a real guest state.
        setToken(null);
        setUser({ id: null, name: "", email: "", role: "anonymous", avatar: "" });
      } else if (decoded) {
        // Fallback for 2fa setup state if getMe returns 2FA_SETUP_REQUIRED
        const role = mapBackendRole(decoded.ruolo);
        setUser({
          id: decoded.id,
          name: "Amministratore (Setup 2FA)",
          email: "",
          role,
          avatar: "A",
        });
        setPage("setup-2fa");
      }
    }
  };

  useEffect(() => {
    fetchUser();
    window.addEventListener("tla:user-updated", fetchUser);
    return () => {
      window.removeEventListener("tla:user-updated", fetchUser);
    };
  }, []);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    const mode = newTheme === "day" ? "light" : "dark";
    setThemeModeState(mode);
    localStorage.setItem("tla:themeMode", mode);
  };

  const setThemeMode = (mode: string) => {
    setThemeModeState(mode);
    localStorage.setItem("tla:themeMode", mode);
    if (mode === "light") {
      setThemeState("day");
    } else if (mode === "dark") {
      setThemeState("night");
    } else {
      setThemeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day");
    }
  };

  useEffect(() => {
    if (themeMode !== "auto" && themeMode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? "night" : "day");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const navigate = (nextPage: string) => {
    // The profile page only makes sense with an account: guests get the login modal.
    if (nextPage === "login" || ((nextPage === "profilo" || nextPage === "profilo-saved") && user.role === "anonymous")) {
      setLoginOpen(true);
      return;
    }
    if (nextPage === "registrazione") {
      setRegisterOpen(true);
      return;
    }
    setLoginOpen(false);
    setPage(nextPage);
  };

  // RBAC lato UI: lo stato `page` non deve mai mostrare una vista per cui il
  // ruolo corrente non ha i permessi (il backend rifiuta comunque le API, ma
  // l'interfaccia non deve proprio arrivarci — es. logout mentre si è su una
  // pagina admin, o token scaduto).
  const PAGE_ROLES: Record<string, UserRole[]> = {
    "admin-users": ["system_admin"],
    "admin-poi": ["system_admin"],
    "admin-enti-richieste": ["system_admin"],
    "admin-moderazione": ["system_admin"],
    "admin-notifications": ["system_admin"],
    "comune-dashboard": ["municipal_admin"],
    "comune-statistiche": ["municipal_admin"],
    "comune-export": ["municipal_admin"],
    "ente-pubblica": ["certified_entity"],
  };
  useEffect(() => {
    const allowed = PAGE_ROLES[page];
    if (allowed && !allowed.includes(user.role)) setPage("home");
  }, [page, user.role]);

  // Safety net for state changes that land a guest on the profile page (e.g. logout).
  useEffect(() => {
    if (page === "profilo" && user.role === "anonymous") {
      setPage("home");
      setLoginOpen(true);
    }
  }, [page, user.role]);

  const shared = {
    page,
    setPage: navigate,
    theme,
    setTheme,
    user,
    setUser,
    themeMode,
    setThemeMode,
    selectedEventId,
    setSelectedEventId,
    selectedActivityId,
    setSelectedActivityId,
  };
  return (
    <React.Fragment>
      {page === "eventi"
        ? <EventsPage {...shared} />
        : page === "attivita"
        ? <ActivityPage {...shared} />
        : page === "impostazioni"
        ? <SettingsPage {...shared} />
        : (page === "profilo" || page === "profilo-saved")
        ? <ProfilePage {...shared} initialTab={page === "profilo-saved" ? "saved" : undefined} />
        : page === "attivita-dettaglio"
        ? <ActivityDetailPage {...shared} />
        : page === "evento-dettaglio"
        ? <EventDetailPage {...shared} />
        : page === "registrazione"
        ? <RegistrationPage {...shared} />
        : page === "password-reset"
        ? <PasswordResetPage {...shared} />
        : page === "setup-2fa"
        ? <Setup2FAPage {...shared} />
        : page === "verifica-email"
        ? <VerifyEmailPage {...shared} />
        : page === "onboarding"
        ? <OnboardingInteressiPage {...shared} />
        : page === "ente-pubblica"
        ? <EntityPublishPage {...shared} />
        : page === "comune-dashboard"
        ? <ComuneDashboardPage {...shared} onShowOnMap={(lat: number, lng: number) => {
            navigate("home");
            setTimeout(() => {
              if (flyToRef.current) flyToRef.current(lng, lat, 17);
              if (tempMarkerRef.current) tempMarkerRef.current(lng, lat);
            }, 120);
          }} />
        : page === "comune-statistiche"
        ? <ComuneStatistichePage {...shared} />
        : page === "comune-export"
        ? <ComuneExportPage {...shared} />
        : page === "admin-users"
        ? <AdminUsersPage {...shared} />
        : page === "admin-poi"
        ? <AdminPOIPage {...shared} />
        : page === "admin-enti-richieste"
        ? <AdminEntitiesPage {...shared} />
        : page === "admin-moderazione"
        ? <AdminModerationPage {...shared} />
        : page === "admin-notifications"
        ? <AdminNotificationsPage {...shared} />
        : page === "privacy"
        ? <PrivacyPage {...shared} />
        : page === "termini"
        ? <TermsPage {...shared} />
        : <HomeScene {...shared} flyToRef={flyToRef} tempMarkerRef={tempMarkerRef} />}
      <Toaster />
      <TrentoTweaks theme={theme} />
      {registerOpen && (
        <RegistrationPage
          {...shared}
          isModal
          onClose={() => setRegisterOpen(false)}
          onLogin={() => { setRegisterOpen(false); setLoginOpen(true); }}
        />
      )}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(needs2faSetup, needsOnboarding) => {
          setLoginOpen(false);
          fetchUser();
          setPage(needs2faSetup ? "setup-2fa" : needsOnboarding ? "onboarding" : "home");
        }}
        onRegister={() => {
          setLoginOpen(false);
          navigate("registrazione");
        }}
        onPasswordReset={() => {
          setLoginOpen(false);
          setPage("password-reset");
        }}
      />
    </React.Fragment>
  );
}
