/* ===========================================================
   Trento Live Activity — App
   =========================================================== */
import React, { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { TrentoMap } from "../components/map/TrentoMap";
import { ActiveAreasWidget, AlertsWidget, EventsWidget, MapLabels, MarkersLayer, ParkingWidget, WeatherWidget } from "../components/redesign/widgets";
import { TrentoTweaks } from "../components/redesign/TrentoTweaks";
import { Icon } from "../components/ui/Icon";
import { CATEGORIES, MARKERS } from "../data/redesignData";
import { ActivityPage } from "../pages/ActivitiesPage";
import { EventsPage } from "../pages/EventsPage";
import { SettingsPage } from "../pages/SettingsPage";

function FilterBar({ active, setActive }: any) {
  const count = (id) => (id === "all" ? MARKERS.length : MARKERS.filter((m) => m.cat === id).length);
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
      <button className="mc-btn" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}><Icon name="minus" size={17} /></button>
      <div className="mc-btn" style={{ fontFamily: "var(--mono)", fontSize: 12, minWidth: 50, pointerEvents: "none" }}>{Math.round(zoom * 100)}%</div>
      <button className="mc-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}><Icon name="plus" size={17} /></button>
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

function HomeScene({ page, setPage, theme, setTheme }: any) {
  const [active, setActive] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [is3d, setIs3d] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState(null);

  useEffect(() => { document.documentElement.style.setProperty("--zoom", String(zoom)); }, [zoom]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setPopup(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusOn = (xPct, yPct) => {
    // pan so the point moves toward center; clamp gently
    const px = Math.max(-22, Math.min(22, (50 - xPct) * 0.7));
    const py = Math.max(-16, Math.min(16, (50 - yPct) * 0.7));
    setPan({ x: px, y: py });
    setZoom((z) => Math.max(z, 1.35));
  };
  const openMarkerPopup = (m) => {
    focusOn(m.x, m.y);
    setPopup({ markerId: m.id, cat: m.cat, title: m.title, place: m.place,
      when: `${m.date}, ${m.time}`, going: m.going, cap: m.cap });
  };
  const openEventPopup = (e) => {
    const m = MARKERS.find((mk) => mk.place === e.place) || MARKERS.find((mk) => mk.cat === e.cat) || MARKERS[0];
    focusOn(m.x, m.y);
    setPopup({ markerId: m.id, cat: e.cat, title: e.title, place: e.place,
      when: `${e.date}, ${e.start} – ${e.end}`, going: e.going, cap: e.cap });
  };
  const closePopup = () => setPopup(null);
  const reset = () => { setPan({ x: 0, y: 0 }); setZoom(1); setIs3d(false); setActive("all"); setPopup(null); };
  const locate = () => focusOn(49, 50);

  const innerStyle: React.CSSProperties = {
    position: "absolute", inset: 0,
    transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`,
    transformOrigin: "center center",
    transition: "transform 850ms cubic-bezier(.2,.8,.3,1)",
  };
  const tiltStyle: React.CSSProperties = {
    position: "absolute", inset: 0,
    transform: is3d ? "perspective(1500px) rotateX(34deg) scale(1.08)" : "perspective(1500px) rotateX(0deg)",
    transformOrigin: "center 56%",
    transition: "transform 850ms cubic-bezier(.2,.8,.3,1)",
  };

  return (
    <div className="scene">
      {/* MAP */}
      <div className="layer-map">
        <div className="map-wrap" onClick={closePopup}>
          <div className="map-inner" style={innerStyle}>
            <div className="map-tilt" style={tiltStyle}>
              <TrentoMap />
              <MapLabels />
            </div>
            <MarkersLayer active={active} onFocus={openMarkerPopup} popup={popup} onClosePopup={closePopup} />
          </div>
        </div>
        <div className="map-grade"></div>
      </div>

      <div className="vignette"></div>

      {/* HEADER */}
      <div className="layer-header"><Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} /></div>

      {/* FILTER BAR */}
      <FilterBar active={active} setActive={setActive} />
      <Clock />

      {/* WIDGETS */}
      <div className="layer-widgets">
        <div className="col-left">
          <WeatherWidget delay={80} />
          <AlertsWidget delay={180} />
          <ParkingWidget delay={280} />
        </div>
        <div className="col-right">
          <ActiveAreasWidget delay={140} />
          <EventsWidget delay={240} onFocus={openEventPopup} />
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

export function App() {
  const [page, setPage] = useState("attivita");
  const [theme, setTheme] = useState("night");

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const shared = { page, setPage, theme, setTheme };
  return (
    <React.Fragment>
      {page === "eventi"
        ? <EventsPage {...shared} />
        : page === "attivita"
        ? <ActivityPage {...shared} />
        : page === "impostazioni"
        ? <SettingsPage {...shared} />
        : <HomeScene {...shared} />}
      <TrentoTweaks theme={theme} />
    </React.Fragment>
  );
}
