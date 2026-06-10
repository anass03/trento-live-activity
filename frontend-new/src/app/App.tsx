/* ===========================================================
   Trento Live Activity — App
   =========================================================== */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { TrentoMap } from "../components/map/TrentoMap";
import { ActiveAreasWidget, AlertsWidget, EventsWidget, MapLabels, MarkersLayer, ParkingWidget, WeatherWidget } from "../components/redesign/widgets";
import { TrentoTweaks } from "../components/redesign/TrentoTweaks";
import { LoginModal } from "../components/auth/LoginModal";
import { Icon } from "../components/ui/Icon";
import { DetailModal } from "../components/ui/DetailModal";
import { Toaster, showToast } from "../components/ui/Toaster";
import { onForegroundMessage } from "../lib/firebase";
import { CATEGORIES, MARKERS, catColor } from "../data/redesignData";
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
import { AdminPOIPage } from "../pages/AdminPOIPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AdminEntitiesPage } from "../pages/AdminEntitiesPage";
import { AdminModerationPage } from "../pages/AdminModerationPage";
import { AdminNotificationsPage } from "../pages/AdminNotificationsPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { TermsPage } from "../pages/TermsPage";
import { getMe, getToken, setToken, UserRole, getHomeMapData } from "../lib/api";
import "../styles/revamp-pages.css";

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

function FilterBar({ active, setActive, markers }: any) {
  const { t } = useTranslation();
  const displayMarkers = markers || MARKERS;
  const count = (id: string) => (id === "all" ? displayMarkers.length : displayMarkers.filter((m: any) => m.cat === id).length);
  return (
    <div className="filterbar">
      {CATEGORIES.map((c) => (
        <button key={c.id}
          className={"filter-pill" + (active === c.id ? " active" : "")}
          style={{ "--fc": c.color }}
          onClick={() => setActive(c.id)}>
          <Icon name={c.icon} size={16} />
          {t(c.labelKey)}
          <span className="cnt">{count(c.id)}</span>
        </button>
      ))}
    </div>
  );
}

function MapControls({ zoom, setZoom, is3d, setIs3d, onLocate, onReset }: any) {
  const { t } = useTranslation();
  return (
    <div className="map-controls">
      <button className={"mc-btn" + (is3d ? " on" : "")} onClick={() => setIs3d(!is3d)}><Icon name="cube" size={17} />3D</button>
      <button className="mc-btn" onClick={onLocate}><Icon name="locate" size={17} />{t("home.locate")}</button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.max(11, +(z - 0.5).toFixed(2)))}><Icon name="minus" size={17} /></button>
      <div className="mc-btn" style={{ fontFamily: "var(--mono)", fontSize: 12, minWidth: 50, pointerEvents: "none" }}>{Math.round(zoom * 10)}%</div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.min(19, +(z + 0.5).toFixed(2)))}><Icon name="plus" size={17} /></button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={onReset}><Icon name="layers" size={17} />{t("home.reset")}</button>
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
  const time = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="clock-pill">
      <span className="led live green"></span>
      <span className="t">{time}</span>
      <span className="d">{date}</span>
    </div>
  );
}

function HomeScene({ page, setPage, theme, setTheme, user }: any) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState("all");
  const [zoom, setZoom] = useState(14.2);
  const locateRef = React.useRef<(() => void) | null>(null);
  const resetRef = React.useRef<(() => void) | null>(null);
  const [is3d, setIs3d] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.documentElement.style.setProperty("--zoom", String(zoom)); }, [zoom]);
  
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
    const onKey = (e: any) => { if (e.key === "Escape") setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dynamicMarkers = React.useMemo(() => {
    if (!mapData || !mapData.markers) return [];
    return mapData.markers.filter((m: any) => m.latitude != null && m.longitude != null).map((m: any) => {
      const { x, y } = getSvgCoordinates(m.latitude, m.longitude, m.title);
      
      let cat = m.category || "cultura";
      if (cat === "poi") cat = "outdoor";
      if (cat === "parking") cat = "outdoor";
      if (cat === "ciclismo" || cat === "verde" || cat === "sport") cat = "sport";
      if (cat === "teatro" || cat === "cinema" || cat === "museo") cat = "cultura";
      if (cat === "biblioteca" || cat === "studio" || cat === "aula_studio") cat = "cultura";
      
      const validCategories = ["musica", "cultura", "sport", "cibo", "outdoor", "famiglia"];
      if (!validCategories.includes(cat)) {
        cat = "cultura";
      }

      let timeStr = "Orario da definire";
      if (m.dateTime) {
        try {
          timeStr = new Date(m.dateTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
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
        time: timeStr,
        cap: m.total || m.maxPartecipanti || m.capacity || 0,
        going: m.free !== undefined && m.total !== undefined ? m.total - m.free : (m.participantCount || 0),
        date: m.dateTime ? new Date(m.dateTime).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "Data da definire",
        description: m.description || null,
        raw: m
      };
    });
  }, [mapData]);

  const dynamicEvents = React.useMemo(() => {
    if (!mapData || !mapData.events) return [];
    return mapData.events.slice(0, 7).map((e: any) => {
      let cat = e.category || "cultura";
      const validCategories = ["musica", "cultura", "sport", "cibo", "outdoor", "famiglia"];
      if (!validCategories.includes(cat)) {
        cat = "cultura";
      }
      
      const gradients: Record<string, string> = {
        cultura: "linear-gradient(135deg,#7c3aed,#4c1d95)",
        musica: "linear-gradient(135deg,#db2777,#831843)",
        cibo: "linear-gradient(135deg,#d97706,#7c2d12)",
        sport: "linear-gradient(135deg,#059669,#064e3b)",
        outdoor: "linear-gradient(135deg,#0d9488,#134e4a)",
        famiglia: "linear-gradient(135deg,#0ea5e9,#075985)"
      };

      return {
        id: e.id,
        cat,
        date: e.dateTime ? new Date(e.dateTime).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "Data da definire",
        start: e.startTime ? e.startTime.slice(0, 5) : "N/D",
        end: e.endTime ? e.endTime.slice(0, 5) : "N/D",
        going: e.participantCount ?? 0,
        cap: e.maxPartecipanti ?? 0,
        title: e.title,
        place: e.location || "Luogo da confermare",
        description: e.description,
        latitude: e.latitude,
        longitude: e.longitude,
        img: gradients[cat] || gradients.cultura,
        raw: e
      };
    });
  }, [mapData]);

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
    setActive("all");
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
                markers={dynamicMarkers}
                activeFilter={active}
                onMarkerClick={(m) => m ? openMarkerPopup(m) : closePopup()}
                selectedMarkerId={popup?.markerId}
                zoom={zoom}
                setZoom={setZoom}
                is3d={is3d}
                onLocateRef={locateRef}
                onResetRef={resetRef}
              />
            </div>
          </div>
        </div>
        <div className="map-grade"></div>
      </div>

      <div className="vignette"></div>

      {/* HEADER */}
      <div className="layer-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} /></div>

      {/* FILTER BAR */}
      <FilterBar active={active} setActive={setActive} markers={dynamicMarkers} />
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
          <EventsWidget delay={240} onFocus={openEventPopup} events={dynamicEvents} onWidgetClick={() => setPage("eventi")} />
        </div>
      </div>

      {/* CONTROLS */}
      <MapControls zoom={zoom} setZoom={setZoom} is3d={is3d} setIs3d={setIs3d} onLocate={locate} onReset={reset} />
      <div className="compass">
        <span className="nlabel">N</span>
        <span className="needle"><Icon name="compass" size={26} /></span>
      </div>

      <DetailModal
        open={!!detail}
        type={detail?.type}
        title={detail?.title}
        accent={detail?.accent}
        data={detail?.data}
        onClose={() => setDetail(null)}
        onAction={(action) => {
          if (action === "open-events-page") setPage("eventi");
          if (action === "open-activity-page") setPage("attivita");
        }}
      />

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

export function App() {
  const [page, setPage] = useState("home");
  const [loginOpen, setLoginOpen] = useState(false);
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
  const [user, setUser] = useState({
    id: null as string | null,
    name: "Ospite",
    email: "ospite@example.com",
    role: "anonymous" as UserRole,
    avatar: "O",
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const fetchUser = async () => {
    const token = getToken();
    if (!token) {
      setUser({
        id: null,
        name: "Ospite",
        email: "ospite@example.com",
        role: "anonymous",
        avatar: "O",
      });
      return;
    }

    // Decode the token locally to see if it needs 2FA setup (admin first login)
    const decoded = decodeJwt(token);
    if (decoded && decoded.needs2faSetup) {
      const role = mapBackendRole(decoded.ruolo);
      setUser({
        id: decoded.id,
        name: "Amministratore (Setup 2FA)",
        email: "admin@example.com",
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
        setToken(null);
      } else if (decoded) {
        // Fallback for 2fa setup state if getMe returns 2FA_SETUP_REQUIRED
        const role = mapBackendRole(decoded.ruolo);
        setUser({
          id: decoded.id,
          name: "Amministratore (Setup 2FA)",
          email: "admin@example.com",
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
    if (nextPage === "login") {
      setLoginOpen(true);
      return;
    }
    setLoginOpen(false);
    setPage(nextPage);
  };

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
    setSelectedActivityId
  };
  return (
    <React.Fragment>
      {page === "eventi"
        ? <EventsPage {...shared} />
        : page === "attivita"
        ? <ActivityPage {...shared} />
        : page === "impostazioni"
        ? <SettingsPage {...shared} />
        : page === "profilo"
        ? <ProfilePage {...shared} />
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
        ? <ComuneDashboardPage {...shared} />
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
        : <HomeScene {...shared} />}
      <TrentoTweaks theme={theme} />
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={(needs2faSetup) => {
          setLoginOpen(false);
          fetchUser();
          setPage(needs2faSetup ? "setup-2fa" : "home");
        }}
        onRegister={() => {
          setLoginOpen(false);
          setPage("registrazione");
        }}
        onPasswordReset={() => {
          setLoginOpen(false);
          setPage("password-reset");
        }}
      />
    </React.Fragment>
  );
}
