/* ===========================================================
   Trento Live Activity — App
   =========================================================== */
import React, { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { TrentoMap } from "../components/map/TrentoMap";
import { ActiveAreasWidget, AlertsWidget, EventsWidget, MapLabels, MarkersLayer, ParkingWidget, WeatherWidget } from "../components/redesign/widgets";
import { TrentoTweaks } from "../components/redesign/TrentoTweaks";
import { Icon } from "../components/ui/Icon";
import { CATEGORIES, MARKERS, EVENTS, AREAS } from "../data/redesignData";
import { ActivityPage } from "../pages/ActivitiesPage";
import { EventsPage } from "../pages/EventsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { ActivityDetailPage } from "../pages/ActivityDetailPage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { LoginPage } from "../pages/LoginPage";
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
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { getMe, getToken, setToken, logout as apiLogout, login as apiLogin, UserRole, getHomeMapData } from "../lib/api";
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

function FilterBar({ active, setActive, markers }: any) {
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
          {c.label}
          <span className="cnt">{count(c.id)}</span>
        </button>
      ))}
    </div>
  );
}

function MapControls({ zoom, setZoom, is3d, setIs3d, onLocate, onReset }: any) {
  return (
    <div className="map-controls">
      <button className={"mc-btn" + (is3d ? " on" : "")} onClick={() => setIs3d(!is3d)}><Icon name="cube" size={17} />3D</button>
      <button className="mc-btn" onClick={onLocate}><Icon name="locate" size={17} />Posizione</button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.max(11, +(z - 0.5).toFixed(2)))}><Icon name="minus" size={17} /></button>
      <div className="mc-btn" style={{ fontFamily: "var(--mono)", fontSize: 12, minWidth: 50, pointerEvents: "none" }}>{Math.round(zoom * 10)}%</div>
      <button className="mc-btn" onClick={() => setZoom((z: number) => Math.min(19, +(z + 0.5).toFixed(2)))}><Icon name="plus" size={17} /></button>
      <div className="mc-div"></div>
      <button className="mc-btn" onClick={onReset}><Icon name="layers" size={17} />Reset</button>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="clock-pill">
      <span className="led live green"></span>
      <span className="t">{time}</span>
      <span className="d">{date}</span>
    </div>
  );
}

function HomeScene({ page, setPage, theme, setTheme, user }: any) {
  const [active, setActive] = useState("all");
  const [zoom, setZoom] = useState(14.2);
  const locateRef = React.useRef<(() => void) | null>(null);
  const resetRef = React.useRef<(() => void) | null>(null);
  const [is3d, setIs3d] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.documentElement.style.setProperty("--zoom", String(zoom)); }, [zoom]);
  
  const loadMapData = async () => {
    setLoading(true);
    try {
      const data = await getHomeMapData();
      setMapData(data);
    } catch (err) {
      console.error("Errore nel recupero dei dati mappa dal backend:", err);
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
    if (!mapData || !mapData.markers) return MARKERS;
    return mapData.markers.map((m: any) => {
      const { x, y } = getSvgCoordinates(m.latitude ?? 46.067, m.longitude ?? 11.121, m.title);
      
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

      let timeStr = "12:00";
      if (m.dateTime) {
        try {
          timeStr = new Date(m.dateTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        } catch (e) {}
      }

      return {
        id: m.id,
        cat,
        x,
        y,
        live: m.type === "event" || m.type === "activity",
        title: m.title,
        place: m.title,
        time: timeStr,
        cap: m.total || 50,
        going: m.free !== undefined && m.total !== undefined ? m.total - m.free : 25,
        date: m.dateTime ? new Date(m.dateTime).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "Oggi",
        raw: m
      };
    });
  }, [mapData]);

  const dynamicEvents = React.useMemo(() => {
    if (!mapData || !mapData.events) return EVENTS;
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
        date: "Oggi",
        start: e.startTime ? e.startTime.slice(0, 5) : "15:00",
        end: e.endTime ? e.endTime.slice(0, 5) : "18:00",
        going: e.participantCount ?? 0,
        cap: e.maxPartecipanti ?? 50,
        title: e.title,
        place: e.location || "Trento",
        img: gradients[cat] || gradients.cultura
      };
    });
  }, [mapData]);

  const dynamicAreas = React.useMemo(() => {
    if (!mapData || !mapData.pois) return AREAS;
    const colorMap: Record<string, string> = {
      rosso: "var(--red)",
      giallo: "var(--amber)",
      verde: "var(--teal)"
    };
    const labelMap: Record<string, string> = {
      rosso: "Molto attiva",
      giallo: "Attiva",
      verde: "Tranquilla"
    };
    const levelMap: Record<string, number> = {
      rosso: 0.9,
      giallo: 0.6,
      verde: 0.25
    };
    return mapData.pois.slice(0, 8).map((p: any) => ({
      name: p.nome,
      cat: p.tipo || "outdoor",
      level: levelMap[p.statoAffollamento] || 0.25,
      label: labelMap[p.statoAffollamento] || "Tranquilla",
      color: colorMap[p.statoAffollamento] || "var(--teal)"
    }));
  }, [mapData]);

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
    const m = dynamicMarkers.find((mk: any) => mk.place === e.place) || dynamicMarkers.find((mk: any) => mk.cat === e.cat) || dynamicMarkers[0];
    focusOn(m.x, m.y);
    setPopup({ markerId: m.id, cat: e.cat, title: e.title, place: e.place,
      when: `${e.date}, ${e.start} – ${e.end}`, going: e.going, cap: e.cap });
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
          <WeatherWidget delay={80} />
          <AlertsWidget delay={180} />
          <ParkingWidget delay={280} />
        </div>
        <div className="col-right">
          <ActiveAreasWidget delay={140} areas={dynamicAreas} />
          <EventsWidget delay={240} onFocus={openEventPopup} events={dynamicEvents} />
        </div>
      </div>

      {/* CONTROLS */}
      <MapControls zoom={zoom} setZoom={setZoom} is3d={is3d} setIs3d={setIs3d} onLocate={locate} onReset={reset} />
      <div className="compass">
        <span className="nlabel">N</span>
        <span className="needle"><Icon name="compass" size={26} /></span>
      </div>

    </div>
  );
}

function RoleSimulationWidget({ user, setUser, setPage }: any) {
  const [loading, setLoading] = useState(false);
  const handleSimulate = async (newRole: string) => {
    setLoading(true);
    try {
      if (newRole === "anonymous") {
        await apiLogout();
        setPage("home");
      } else {
        let email = "";
        if (newRole === "registered_user") email = "cittadino@example.com";
        else if (newRole === "certified_entity") email = "ente@example.com";
        else if (newRole === "municipal_admin") email = "comune@example.com";
        else if (newRole === "system_admin") email = "admin@example.com";

        await apiLogin(email, "password123");
        
        if (newRole === "municipal_admin") setPage("comune-dashboard");
        else if (newRole === "system_admin") setPage("admin-users");
        else if (newRole === "certified_entity") setPage("ente-pubblica");
        else setPage("home");
      }
    } catch (err) {
      console.error("Failed to simulate role:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-role-widget anim-in" style={{
      position: "fixed",
      bottom: "26px",
      left: "28px",
      zIndex: 9999,
      pointerEvents: "auto",
      padding: "8px 14px",
      borderRadius: "999px",
      background: "linear-gradient(150deg, var(--bar-1), var(--bar-2))",
      border: "1px solid var(--border-soft)",
      backdropFilter: "blur(22px)",
      boxShadow: "var(--controls-shadow), inset 0 1px 0 var(--inset-hi)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {loading ? "Caricamento..." : "Simula Ruolo:"}
      </span>
      <select
        className="revamp-select"
        value={user?.role || "anonymous"}
        disabled={loading}
        onChange={(e) => handleSimulate(e.target.value)}
        style={{
          height: "28px",
          border: "none",
          background: "var(--chip-fill)",
          borderRadius: "6px",
          color: "var(--text-primary)",
          fontSize: "12.5px",
          fontWeight: 600,
          outline: "none",
          padding: "0 6px",
        }}
      >
        <option value="anonymous">Ospite (Anonimo)</option>
        <option value="registered_user">Utente Registrato</option>
        <option value="certified_entity">Ente Certificato</option>
        <option value="municipal_admin">Admin Comunale</option>
        <option value="system_admin">Admin Sistema</option>
      </select>
    </div>
  );
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
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem("tla:themeMode") || "dark";
  });
  const [theme, setThemeState] = useState(() => {
    const mode = localStorage.getItem("tla:themeMode") || "dark";
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
    } catch (err) {
      console.error("Error loading user profile:", err);
      setToken(null);
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
    if (themeMode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? "night" : "day");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const shared = {
    page,
    setPage,
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
        : page === "login"
        ? <LoginPage {...shared} />
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
        : page === "placeholder"
        ? <PlaceholderPage {...shared} />
        : <HomeScene {...shared} />}
      <TrentoTweaks theme={theme} />
      <RoleSimulationWidget user={user} setUser={setUser} setPage={setPage} />
    </React.Fragment>
  );
}
