/* ===========================================================
   Trento Live Activity — App
   =========================================================== */
function Header({ page, setPage, theme, setTheme }) {
  const nav = [
    { id: "home", label: "Home", icon: "home" },
    { id: "eventi", label: "Eventi", icon: "calendar" },
    { id: "attivita", label: "Attività", icon: "activity" },
    { id: "impostazioni", label: "Impostazioni", icon: "settings" },
  ];
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-logo">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 21V11l4-3 4 3v10" stroke="#7dd3fc" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M13 21V8l3-2 3 2v13" stroke="#a78bfa" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M3 21h18" stroke="#7dd3fc" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="16" cy="9.5" r="1" fill="#f472b6" />
            <path d="M9 21v-4h0" stroke="#7dd3fc" strokeWidth="1.7" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Trento <span className="live">Live</span> Activity</div>
          <div className="brand-sub">Smart City · Tempo reale</div>
        </div>
      </div>

      <div className="nav">
        {nav.map((n) => (
          <button key={n.id} className={"nav-item" + (page === n.id ? " active" : "")} onClick={() => setPage(n.id)}>
            <Icon name={n.icon} size={17} />{n.label}
          </button>
        ))}
      </div>

      <div className="header-right">
        <div className="search-bar">
          <Icon name="search" size={16} style={{ opacity: 0.6 }} />
          <input placeholder="Cerca luoghi, eventi…" />
          <kbd>⌘K</kbd>
        </div>
        <button className="icon-btn"><Icon name="bell" size={18} /><span className="badge"></span></button>
        <button className="theme-toggle" onClick={() => setTheme(theme === "day" ? "night" : "day")} aria-label="Cambia tema" title="Giorno / Notte">
          <span className="tt-thumb"></span>
          <span className={"tt-ic" + (theme === "night" ? " on" : "")}><Icon name="moon" size={15} /></span>
          <span className={"tt-ic" + (theme === "day" ? " on" : "")}><Icon name="sun" size={15} /></span>
        </button>
        <div className="avatar">MR</div>
      </div>
    </div>
  );
}

function FilterBar({ active, setActive }) {
  const { CATEGORIES, MARKERS } = window.TLA;
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

function MapControls({ zoom, setZoom, is3d, setIs3d, onLocate, onReset }) {
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

function HomeScene({ page, setPage, theme, setTheme }) {
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
    const { MARKERS } = window.TLA;
    const m = MARKERS.find((mk) => mk.place === e.place) || MARKERS.find((mk) => mk.cat === e.cat) || MARKERS[0];
    focusOn(m.x, m.y);
    setPopup({ markerId: m.id, cat: e.cat, title: e.title, place: e.place,
      when: `${e.date}, ${e.start} – ${e.end}`, going: e.going, cap: e.cap });
  };
  const closePopup = () => setPopup(null);
  const reset = () => { setPan({ x: 0, y: 0 }); setZoom(1); setIs3d(false); setActive("all"); setPopup(null); };
  const locate = () => focusOn(49, 50);

  const innerStyle = {
    position: "absolute", inset: 0,
    transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`,
    transformOrigin: "center center",
    transition: "transform 850ms cubic-bezier(.2,.8,.3,1)",
  };
  const tiltStyle = {
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

function App() {
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
        : <HomeScene {...shared} />}
      <TrentoTweaks theme={theme} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
