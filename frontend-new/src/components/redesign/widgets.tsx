/* ===========================================================
   Trento Live Activity — widgets, markers, labels
   =========================================================== */
import { useEffect, useState } from "react";
import { CAT_ICON, MARKERS, PLACES, catColor, catLabel } from "../../data/redesignData";
import { Icon, WxIcon } from "../ui/Icon";
import { getCityAlerts, getParking, getTrentoWeather } from "../../lib/api";

/* mouse-follow radial glow */
export function useGlow() {
  const onMove = (e: any) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return onMove;
}

/* generic glass widget shell */
export function Widget({ title, accent, upd, children, style, delay, onClick, className }: any) {
  const onMove = useGlow();
  return (
    <div
      className={"widget anim-in" + (onClick ? " clickable" : "") + (className ? ` ${className}` : "")}
      style={{ "--accent": accent, animationDelay: (delay || 0) + "ms", ...style }}
      onMouseMove={onMove}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: any) => { if (e.key === "Enter" || e.key === " ") onClick(e); } : undefined}
    >
      <div className="widget-inner">
        {title && (
          <div className="widget-head">
            <div className="widget-title"><span className="title-accent">●</span>{title}</div>
            {upd && <div className="upd"><span className="led live green" style={{ "--led-color": "var(--green)" }}></span>{upd}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- MAP LABELS ---------------- */
export function MapLabels() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
      {PLACES.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x + "%", top: p.y + "%",
          transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
          fontFamily: p.river ? "var(--mono)" : "var(--font)",
          fontSize: p.major ? 15 : p.river ? 10.5 : 11.5,
          fontWeight: p.major ? 700 : 600,
          letterSpacing: p.major ? "0.22em" : p.river ? "0.18em" : "0.02em",
          color: p.major ? "var(--map-label-major)" : p.river ? "var(--map-label-river)" : "var(--map-label)",
          textTransform: p.river ? "uppercase" : "none",
          textShadow: "var(--map-label-shadow)",
          transformOrigin: "center",
          fontStyle: p.river ? "italic" : "normal",
        }}>{p.name}</div>
      ))}
    </div>
  );
}

/* ---------------- EVENT POPUP ---------------- */
function EventPopup({ data, color, placeBelow, onClose }: any) {
  const pct = data.cap > 0 ? Math.min(100, Math.round((data.going / data.cap) * 100)) : 0;
  return (
    <div className={"event-popup" + (placeBelow ? " below" : "")} style={{ "--ec": color }} onClick={(e) => e.stopPropagation()}>
      <div className="ep-head">
        <div className="ep-cat"><span className="ep-cat-ic"><Icon name={CAT_ICON[data.cat] || "grid"} size={12} /></span>{catLabel(data.cat)}</div>
        <div className="ep-title">{data.title}</div>
        <button className="ep-close" onClick={onClose} aria-label="Chiudi"><Icon name="x" size={13} /></button>
      </div>
      <div className="ep-body">
        <div className="ep-field">
          <span className="ep-fic"><Icon name="pin" size={14} /></span>
          <div className="ep-ftext"><div className="ep-flbl">Luogo</div><div className="ep-fval">{data.place}</div></div>
        </div>
        <div className="ep-field">
          <span className="ep-fic"><Icon name="clock" size={14} /></span>
          <div className="ep-ftext"><div className="ep-flbl">Quando</div><div className="ep-fval">{data.when}</div></div>
        </div>
        <div className="ep-part">
          <div className="ep-part-l">
            <div className="ep-flbl">Partecipanti</div>
            <div className="ep-part-bar"><i style={{ width: pct + "%" }}></i></div>
          </div>
          <div className="ep-part-n"><b>{data.going}</b>{data.cap > 0 ? ` / ${data.cap}` : ""}</div>
        </div>
        <button className="ep-cta"><Icon name="ticket" size={15} /> Partecipa</button>
      </div>
    </div>
  );
}

/* ---------------- MARKERS ---------------- */
export function MarkersLayer({ active, onFocus, popup, onClosePopup, markers }: any) {
  const displayMarkers = markers || MARKERS;
  return (
    <div className="markers-layer">
      {displayMarkers.map((m: any) => {
        const dim = active !== "all" && active !== m.cat;
        const selected = popup && popup.markerId === m.id;
        const softdim = popup && !selected && !dim;
        const color = catColor(m.cat);
        return (
          <div key={m.id}
            className={"marker" + (m.live ? " live" : "") + (dim ? " dimmed" : "") + (softdim ? " softdim" : "") + (selected ? " selected" : "")}
            style={{ left: m.x + "%", top: m.y + "%", "--mc": color }}
            onClick={(e) => { e.stopPropagation(); onFocus && onFocus(m); }}>
            <div className="marker-dot"><Icon name={CAT_ICON[m.cat] || "grid"} size={17} /></div>
            {!selected && (
              <div className="marker-tip" style={{ "--mc": color }}>
                <div className="tip-cat">{catLabel(m.cat)}</div>
                <div className="tip-title">{m.title}</div>
                <div className="tip-meta">
                  <Icon name="clock" size={12} style={{ opacity: 0.7 }} />{m.time}
                  <span style={{ opacity: 0.4 }}>·</span>
                  <Icon name="pin" size={12} style={{ opacity: 0.7 }} />{m.place}
                </div>
              </div>
            )}
            {selected && (
              <EventPopup data={popup} color={color} placeBelow={m.y < 40}
                onClose={(e: any) => { e.stopPropagation(); onClosePopup && onClosePopup(); }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- WEATHER ---------------- */
export function WeatherWidget({ delay, onOpen }: any) {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      try {
        const data = await getTrentoWeather();
        if (active) setWeather(data);
      } catch (err) {
        console.warn("Meteo temporaneamente non disponibile:", err);
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const current = weather?.current;
  const daily = weather?.daily?.[0];
  const hourly = weather?.hourly?.length
    ? weather.hourly.slice(0, 6).map((h: any) => ({
      h: new Date(h.time).toLocaleTimeString("it-IT", { hour: "2-digit" }),
      t: h.temperature != null ? Math.round(h.temperature) : "--",
      p: Math.max(0.12, Math.min(1, (h.precipitationProbability ?? 0) / 100)),
    }))
    : [];
  const hasWeather = current?.temperature != null;
  const display = {
    loc: weather?.city ? `${weather.city}, IT` : "Trento, IT",
    temp: hasWeather ? String(Math.round(current.temperature)) : "--",
    cond: current?.condition || "Meteo temporaneamente non disponibile",
    high: daily?.temperatureMax != null ? String(Math.round(daily.temperatureMax)) : "--",
    low: daily?.temperatureMin != null ? String(Math.round(daily.temperatureMin)) : "--",
    rain: daily?.precipitationProbabilityMax ?? "--",
    wind: current?.windSpeed != null ? String(Math.round(current.windSpeed)) : "--",
    hourly,
  };

  return (
    <Widget title="Meteo" accent="var(--cyan)" upd={weather?.unavailable ? "Non disponibile" : "Open-Meteo"} delay={delay}
      onClick={() => onOpen && onOpen({ type: "weather", title: "Meteo a Trento", data: weather })}>
      <div className="wx-main">
        <WxIcon className="wx-icon" />
        <div className="wx-temp">{display.temp}<sup>°C</sup></div>
        <div className="wx-cond">{display.cond}</div>
        <div className="wx-loc"><Icon name="pin" size={13} style={{ opacity: 0.6 }} />{display.loc}</div>
      </div>
      <div className="wx-stats">
        <div className="wx-stat"><div className="lbl">Max / Min</div><div className="val">{display.high}° <span>/ {display.low}°</span></div></div>
        <div className="wx-stat"><div className="lbl">Pioggia</div><div className="val">{display.rain}<span>%</span></div></div>
        <div className="wx-stat"><div className="lbl">Vento</div><div className="val">{display.wind}<span> km/h</span></div></div>
      </div>
      <div className="wx-hourly">
        {display.hourly.length === 0 && <div className="widget-empty compact">Meteo temporaneamente non disponibile.</div>}
        {display.hourly.map((h: any, i: number) => (
          <div className="wx-hour" key={i}>
            <div className="t">{h.t}°</div>
            <div className="bar"><i style={{ height: 8 + h.p * 22 }}></i></div>
            <div className="h">{h.h}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

/* ---------------- ALERTS ---------------- */
export function AlertsWidget({ delay, onOpen }: any) {
  const [alertsData, setAlertsData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const loadAlerts = async () => {
      try {
        const data = await getCityAlerts();
        if (active) setAlertsData(data);
      } catch (err) {
        console.warn("Avvisi città temporaneamente non disponibili:", err);
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const ledClass: any = { red: "red", amber: "amber", blue: "blue", green: "green" };
  const sevMap: any = {
    high: { sev: "red", color: "var(--red)", icon: "cone", tag: "Urgente" },
    medium: { sev: "amber", color: "var(--amber)", icon: "calendar", tag: "Medio" },
    low: { sev: "blue", color: "var(--cyan)", icon: "cloud", tag: "Info" },
    info: { sev: "green", color: "var(--green)", icon: "bus", tag: "Info" },
  };
  const displayAlerts = alertsData?.items?.length
    ? alertsData.items.map((a: any) => ({ ...a, ...(sevMap[a.severity] || sevMap.info), desc: a.summary }))
    : [];
  const modalAlertsData = alertsData || { city: "Trento", items: [] };

  return (
    <Widget title="Avvisi città" accent="var(--amber)" upd={displayAlerts.length + " attivi"} delay={delay}
      onClick={() => onOpen && onOpen({ type: "alerts", title: "Avvisi città", data: modalAlertsData })}>
      <div className="widget-scroll" style={{ maxHeight: 150 }}>
        {displayAlerts.length === 0 && <div className="widget-empty big">Avvisi città temporaneamente non disponibili.</div>}
        {displayAlerts.map((a: any) => (
          <div className="alert-row" key={a.id} style={{ "--ac": a.color }} onClick={(e) => { e.stopPropagation(); onOpen && onOpen({ type: "alerts", title: "Avvisi città", data: modalAlertsData }); }}>
            <div className="alert-ic"><Icon name={a.icon} size={17} /></div>
            <div className="alert-body">
              <div className="alert-top">
                <span className={"led " + ledClass[a.sev] + (a.sev === "red" || a.sev === "amber" ? " live" : "")}></span>
                <span className="alert-title">{a.title}</span>
                <span className="alert-tag">{a.tag}</span>
              </div>
              <div className="alert-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="widget-foot">
        <button className="link-btn"><span>Vedi tutti gli avvisi ({displayAlerts.length})</span> <Icon name="arrow" size={15} /></button>
      </div>
    </Widget>
  );
}

/* ---------------- PARKING ---------------- */
function ParkingRing({ pct }: any) {
  const R = 37, C = 2 * Math.PI * R;
  const off = C * (1 - pct / 100);
  return (
    <div className="pk-ring">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <defs>
          <linearGradient id="pkg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" /><stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={R} fill="none" style={{ stroke: "var(--track-fill)" }} strokeWidth="7" />
        <circle cx="42" cy="42" r={R} fill="none" stroke="url(#pkg)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
          transform="rotate(-90 42 42)"
          style={{ filter: "drop-shadow(0 0 7px rgba(45,212,191,0.45))", transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.3,1)" }} />
      </svg>
      <div className="pct" style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
        lineHeight: "1.1"
      }}>
        <b style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.03em" }}>{pct}%</b>
        <div className="pctlbl" style={{
          fontFamily: "var(--mono)",
          fontSize: "7.2px",
          letterSpacing: "0.08em",
          color: "var(--text-faint)",
          textTransform: "uppercase",
          marginTop: "1px"
        }}>Occupato</div>
      </div>
    </div>
  );
}

// Display preference for the parking widget: 'both' | 'car' | 'bike'.
// Stored client-side so it works for anonymous visitors too (mirrors the theme).
function getParkingPref(): string {
  try { return localStorage.getItem("tla:parkingPref") || "both"; } catch { return "both"; }
}

function ParkingSection({ label, icon, items, color }: any) {
  if (!items.length) return null;
  return (
    <div className="pk-section">
      <div className="pk-section-label"><Icon name={icon} size={12} />{label}<span className="pk-section-count">{items.length}</span></div>
      {items.map((p: any, i: number) => {
        const occ = p.total > 0 ? 1 - p.free / p.total : 0;
        const col = color(p.free, p.total);
        return (
          <div className="pk-item" key={i}>
            <div className="pk-name">
              <span className="led" style={{ "--led-color": col } as any}></span>{p.name}
            </div>
            <div className="pk-bar"><i style={{ width: (occ * 100) + "%", background: col, boxShadow: `0 0 8px ${col}` }}></i></div>
            <div className="pk-count"><b>{p.free}</b> / {p.total}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ParkingWidget({ delay, onOpen }: any) {
  const [parking, setParking] = useState<any>(null);
  const [pref, setPref] = useState<string>(getParkingPref);

  // Live-sync with the Settings control (same tab via custom event, other tabs via storage).
  useEffect(() => {
    const sync = () => setPref(getParkingPref());
    window.addEventListener("tla:parkingpref", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("tla:parkingpref", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadParking = async () => {
      try {
        const res = await getParking();
        if (active && res && res.parkings) {
          const list = res.parkings.map((p) => ({
            name: p.name,
            free: p.free ?? 0,
            total: p.capacity,
            occupied: p.occupied ?? (p.capacity - (p.free ?? 0)),
            status: p.status,
            type: p.type === "bike" ? "bike" : "car",
          }));
          setParking({ list, raw: res });
        }
      } catch (err) {
        console.warn("Parcheggi temporaneamente non disponibili:", err);
      }
    };
    loadParking();
    const interval = setInterval(loadParking, 30000); // refresh every 30s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const displayParking = parking || { list: [] };

  const color = (free: number, total: number) => {
    const occ = total > 0 ? 1 - free / total : 0;
    return occ >= 0.85 ? "var(--red)" : occ >= 0.6 ? "var(--amber)" : "var(--green)";
  };

  const showCar = pref !== "bike";
  const showBike = pref !== "car";
  const cars = displayParking.list.filter((p: any) => p.type === "car");
  const bikes = displayParking.list.filter((p: any) => p.type === "bike");
  const shown = [...(showCar ? cars : []), ...(showBike ? bikes : [])];

  // Average occupancy across the currently-shown areas (capacity-weighted).
  const cap = shown.reduce((acc: number, p: any) => acc + p.total, 0);
  const free = shown.reduce((acc: number, p: any) => acc + p.free, 0);
  const avg = cap > 0 ? Math.round(((cap - free) / cap) * 100) : 0;

  const scopeLabel = pref === "car" ? "aree auto" : pref === "bike" ? "aree bici" : "aree auto e bici";

  return (
    <Widget title="Parcheggi" accent="var(--teal)" upd={parking?.raw?.source?.scrapedAt ? "Cache live" : "Non disponibile"} delay={delay}
      onClick={() => onOpen && onOpen({ type: "parking", title: "Parcheggi Trento", data: parking?.raw || { city: "Trento", items: [] } })}>
      <div className="pk-top">
        <ParkingRing pct={avg} />
        <div className="pk-summary">
          <div className="big">Occupazione media</div>
          <div className="sub">{shown.length} {scopeLabel} monitorate in tempo reale nel centro di Trento.</div>
        </div>
      </div>
      <div className="pk-list widget-scroll" style={{ maxHeight: 150 }}>
        {displayParking.list.length === 0 && <div className="widget-empty">Dati parcheggi momentaneamente non disponibili.</div>}
        {displayParking.list.length > 0 && shown.length === 0 && <div className="widget-empty">Nessun parcheggio per il filtro selezionato.</div>}
        {showCar && <ParkingSection label="Auto" icon="car" items={cars} color={color} />}
        {showBike && <ParkingSection label="Bici" icon="bike" items={bikes} color={color} />}
      </div>
    </Widget>
  );
}

/* ---------------- ACTIVE AREAS ---------------- */
export function ActiveAreasWidget({ delay, areas, onOpen }: any) {
  const displayAreas = (areas || []).slice().sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
  // Clicking the widget chrome opens the full ranked list (not just the top area);
  // clicking a row drills into that specific area.
  const openSummary = () => {
    onOpen && onOpen({ type: "areas", title: "Aree più attive", accent: "var(--magenta)", data: { areas: displayAreas } });
  };
  return (
    <Widget title="Aree più attive" accent="var(--magenta)" upd={displayAreas.length ? "Live" : "Nessuna"} delay={delay} onClick={openSummary}>
      <div className="widget-scroll" style={{ maxHeight: 232 }}>
        {displayAreas.length === 0 && <div className="widget-empty">Nessuna area monitorata disponibile.</div>}
        {displayAreas.map((a: any, i: number) => (
          <div className="area-row clickable-row" key={i} onClick={(event) => { event.stopPropagation(); onOpen && onOpen({ type: "area", title: a.name, accent: a.color, data: a }); }}>
            <div className={"area-rank" + (i === 0 ? " top" : "")}>{String(i + 1).padStart(2, "0")}</div>
            <div className="area-body">
              <div className="area-name">{a.name}</div>
              <div className="area-meta">
                <div className="area-bar"><i style={{ width: (a.level * 100) + "%", background: `linear-gradient(90deg, color-mix(in srgb, ${a.color} 55%, transparent), ${a.color})`, boxShadow: `0 0 8px ${a.color}66` }}></i></div>
                <div className="area-lbl" style={{ color: a.color }}>{a.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

/* ---------------- EVENTS ---------------- */
export function EventsWidget({ delay, onFocus, events, onWidgetClick }: any) {
  const displayEvents = events || [];
  return (
    <Widget title="Prossimi eventi" accent="var(--cyan)" upd={displayEvents.length + " oggi"} delay={delay} onClick={onWidgetClick}>
      <div className="widget-scroll" style={{ maxHeight: 300, margin: "0 -10px", padding: "0 10px" }}>
        {displayEvents.length === 0 && <div className="widget-empty big">Nessun evento disponibile al momento.</div>}
        {displayEvents.map((e: any) => (
          <div className="ev-row" key={e.id} style={{ "--ec": catColor(e.cat) }} onClick={(event) => { event.stopPropagation(); onFocus && onFocus(e); }}>
            <div className="ev-thumb" style={{ background: e.img }}><div className="ev-dot"></div></div>
            <div className="ev-body">
              <div className="ev-time">{e.start} – {e.end}</div>
              <div className="ev-title">{e.title}</div>
              <div className="ev-loc"><Icon name="pin" size={12} style={{ opacity: 0.6 }} />{e.place}</div>
            </div>
            <div className="ev-go"><Icon name="chevron" size={16} /></div>
          </div>
        ))}
      </div>
    </Widget>
  );
}
