/* ===========================================================
   Trento Live Activity — widgets, markers, labels
   =========================================================== */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CAT_ICON, PLACES, catColor, catLabel } from "../../data/redesignData";
import { type ServiceRequestCategory } from "../../lib/api";
import { Icon, WxIcon } from "../ui/Icon";
import { getCityAlerts, getParking, getTrentoWeather } from "../../lib/api";
import { getTimeFormat } from "../../lib/i18n";

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
  const { t } = useTranslation();
  const pct = data.cap > 0 ? Math.min(100, Math.round((data.going / data.cap) * 100)) : 0;
  return (
    <div className={"event-popup" + (placeBelow ? " below" : "")} style={{ "--ec": color }} onClick={(e) => e.stopPropagation()}>
      <div className="ep-head">
        <div className="ep-cat"><span className="ep-cat-ic"><Icon name={CAT_ICON[data.cat] || "grid"} size={12} /></span>{catLabel(data.cat)}</div>
        <div className="ep-title">{data.title}</div>
        <button className="ep-close" onClick={onClose} aria-label={t("widgets.popup.close")}><Icon name="x" size={13} /></button>
      </div>
      <div className="ep-body">
        <div className="ep-field">
          <span className="ep-fic"><Icon name="pin" size={14} /></span>
          <div className="ep-ftext"><div className="ep-flbl">{t("widgets.popup.place")}</div><div className="ep-fval">{data.place}</div></div>
        </div>
        <div className="ep-field">
          <span className="ep-fic"><Icon name="clock" size={14} /></span>
          <div className="ep-ftext"><div className="ep-flbl">{t("widgets.popup.when")}</div><div className="ep-fval">{data.when}</div></div>
        </div>
        <div className="ep-part">
          <div className="ep-part-l">
            <div className="ep-flbl">{t("widgets.popup.participants")}</div>
            <div className="ep-part-bar"><i style={{ width: pct + "%" }}></i></div>
          </div>
          <div className="ep-part-n"><b>{data.going}</b>{data.cap > 0 ? ` / ${data.cap}` : ""}</div>
        </div>
        <button className="ep-cta"><Icon name="ticket" size={15} /> {t("widgets.popup.join")}</button>
      </div>
    </div>
  );
}

/* ---------------- MARKERS ---------------- */
export function MarkersLayer({ active, onFocus, popup, onClosePopup, markers }: any) {
  // Solo marker reali: senza dati API non si mostra nulla (niente placeholder).
  const displayMarkers = markers || [];
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
  const { t, i18n } = useTranslation();
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
      h: new Date(h.time).toLocaleTimeString(i18n.language.startsWith("en") ? "en-GB" : "it-IT", { hour: "2-digit", hour12: getTimeFormat() === "12h" }),
      t: h.temperature != null ? Math.round(h.temperature) : "--",
      p: Math.max(0.12, Math.min(1, (h.precipitationProbability ?? 0) / 100)),
    }))
    : [];
  const hasWeather = current?.temperature != null;
  const display = {
    loc: weather?.city ? `${weather.city}, IT` : "Trento, IT",
    temp: hasWeather ? String(Math.round(current.temperature)) : "--",
    cond: current?.weatherCode != null
      ? t(`wx.${current.weatherCode}` as any, { defaultValue: current?.condition || t("widgets.weather.condUnavailable") })
      : (current?.condition || t("widgets.weather.condUnavailable")),
    high: daily?.temperatureMax != null ? String(Math.round(daily.temperatureMax)) : "--",
    low: daily?.temperatureMin != null ? String(Math.round(daily.temperatureMin)) : "--",
    rain: daily?.precipitationProbabilityMax ?? "--",
    wind: current?.windSpeed != null ? String(Math.round(current.windSpeed)) : "--",
    hourly,
  };

  return (
    <Widget title={t("widgets.weather.title")} accent="var(--cyan)" upd={weather?.unavailable ? t("widgets.weather.unavailable") : "Open-Meteo"} delay={delay}
      onClick={() => onOpen && onOpen({ type: "weather", title: t("widgets.weather.modalTitle"), data: weather })}>
      <div className="wx-main">
        <WxIcon className="wx-icon" />
        <div className="wx-temp">{display.temp}<sup>°C</sup></div>
        <div className="wx-cond">{display.cond}</div>
        <div className="wx-loc"><Icon name="pin" size={13} style={{ opacity: 0.6 }} />{display.loc}</div>
      </div>
      <div className="wx-stats">
        <div className="wx-stat"><div className="lbl">{t("widgets.weather.maxMin")}</div><div className="val">{display.high}° <span>/ {display.low}°</span></div></div>
        <div className="wx-stat"><div className="lbl">{t("widgets.weather.rain")}</div><div className="val">{display.rain}<span>%</span></div></div>
        <div className="wx-stat"><div className="lbl">{t("widgets.weather.wind")}</div><div className="val">{display.wind}<span> km/h</span></div></div>
      </div>
      <div className="wx-hourly">
        {display.hourly.length === 0 && <div className="widget-empty compact">{t("widgets.weather.emptyHourly")}</div>}
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
  const { t } = useTranslation();
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
    high: { sev: "red", color: "var(--red)", icon: "cone", tag: t("widgets.alerts.tagUrgent") },
    medium: { sev: "amber", color: "var(--amber)", icon: "calendar", tag: t("widgets.alerts.tagMedium") },
    low: { sev: "blue", color: "var(--cyan)", icon: "cloud", tag: t("widgets.alerts.tagInfo") },
    info: { sev: "green", color: "var(--green)", icon: "bus", tag: t("widgets.alerts.tagInfo") },
  };
  const displayAlerts = alertsData?.items?.length
    ? alertsData.items.map((a: any) => ({ ...a, ...(sevMap[a.severity] || sevMap.info), desc: a.summary }))
    : [];
  const modalAlertsData = alertsData || { city: "Trento", items: [] };

  return (
    <Widget title={t("widgets.alerts.title")} accent="var(--amber)" upd={t("widgets.alerts.active", { count: displayAlerts.length })} delay={delay}
      onClick={() => onOpen && onOpen({ type: "alerts", title: t("widgets.alerts.title"), data: modalAlertsData })}>
      <div className="widget-scroll" style={{ maxHeight: 150 }}>
        {displayAlerts.length === 0 && <div className="widget-empty big">{t("widgets.alerts.empty")}</div>}
        {displayAlerts.map((a: any) => (
          <div className="alert-row" key={a.id} style={{ "--ac": a.color }} onClick={(e) => { e.stopPropagation(); onOpen && onOpen({ type: "alerts", title: t("widgets.alerts.title"), data: modalAlertsData }); }}>
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
        <button className="link-btn"><span>{t("widgets.alerts.seeAll", { count: displayAlerts.length })}</span> <Icon name="arrow" size={15} /></button>
      </div>
    </Widget>
  );
}

/* ---------------- PARKING ---------------- */
function ParkingRing({ pct, occupiedLabel }: any) {
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
        }}>{occupiedLabel}</div>
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
  const { t } = useTranslation();
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

  const scopeLabel = pref === "car" ? t("widgets.parking.scopeCar") : pref === "bike" ? t("widgets.parking.scopeBike") : t("widgets.parking.scopeBoth");

  return (
    <Widget title={t("widgets.parking.title")} accent="var(--teal)" upd={parking?.raw?.source?.scrapedAt ? t("widgets.parking.cacheLive") : t("widgets.parking.unavailable")} delay={delay}
      onClick={() => onOpen && onOpen({ type: "parking", title: t("widgets.parking.modalTitle"), data: parking?.raw || { city: "Trento", items: [] } })}>
      <div className="pk-top">
        <ParkingRing pct={avg} occupiedLabel={t("widgets.parking.occupied")} />
        <div className="pk-summary">
          <div className="big">{t("widgets.parking.avgOccupancy")}</div>
          <div className="sub">{t("widgets.parking.monitored", { count: shown.length, scope: scopeLabel })}</div>
        </div>
      </div>
      <div className="pk-list widget-scroll" style={{ maxHeight: 150 }}>
        {displayParking.list.length === 0 && <div className="widget-empty">{t("widgets.parking.empty")}</div>}
        {displayParking.list.length > 0 && shown.length === 0 && <div className="widget-empty">{t("widgets.parking.emptyFilter")}</div>}
        {showCar && <ParkingSection label={t("widgets.parking.cars")} icon="car" items={cars} color={color} />}
        {showBike && <ParkingSection label={t("widgets.parking.bikes")} icon="bike" items={bikes} color={color} />}
      </div>
    </Widget>
  );
}

/* ---------------- ACTIVE AREAS ---------------- */
export function ActiveAreasWidget({ delay, areas, onOpen }: any) {
  const { t } = useTranslation();
  const displayAreas = (areas || []).slice().sort((a: any, b: any) => (b.level || 0) - (a.level || 0));
  const openSummary = () => {
    onOpen && onOpen({ type: "areas", title: t("widgets.areas.title"), accent: "var(--magenta)", data: { areas: displayAreas } });
  };
  return (
    <Widget title={t("widgets.areas.title")} accent="var(--magenta)" upd={displayAreas.length ? t("widgets.areas.live") : t("widgets.areas.none")} delay={delay} onClick={openSummary}>
      <div className="widget-scroll" style={{ maxHeight: 232 }}>
        {displayAreas.length === 0 && <div className="widget-empty">{t("widgets.areas.empty")}</div>}
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

/* ---------------- SERVICE REQUEST ---------------- */

const SR_CAT_ICON: Record<string, string> = {
  parcheggio_auto: "car", parcheggio_bici: "bike", sport: "activity",
  studio: "bookmark", verde: "leaf", cultura: "ticket", ciclismo: "bike", altro: "settings",
};
const SR_QUICK: ServiceRequestCategory[] = ["parcheggio_auto", "sport", "verde", "studio"];

export function ServiceRequestWidget({ delay, onOpen }: { delay?: number; onOpen: (cat?: ServiceRequestCategory) => void }) {
  const { t } = useTranslation();
  return (
    <Widget title={t("serviceRequest.widgetTitle")} accent="var(--violet)" delay={delay}>
      <p style={{ fontSize: 11.5, color: "var(--text-faint)", margin: "0 0 10px", lineHeight: 1.45 }}>
        {t("serviceRequest.widgetDesc")}
      </p>
      <div className="sr-cat-grid">
        {SR_QUICK.map((cat) => (
          <button
            key={cat}
            className="sr-cat-pill"
            style={{ "--accent": "var(--violet)" } as React.CSSProperties}
            onClick={(e) => { e.stopPropagation(); onOpen(cat); }}
          >
            <Icon name={SR_CAT_ICON[cat]} size={13} />
            <span>{t(`serviceRequest.categories.${cat}`)}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="sr-cat-pill" style={{ "--accent": "var(--violet)", width: "100%", justifyContent: "space-between" } as React.CSSProperties}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="grid" size={13} />
            {t("serviceRequest.widgetAll")}
          </span>
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </Widget>
  );
}

/* ---------------- EVENTS ---------------- */
export function EventsWidget({ delay, onFocus, events, onWidgetClick }: any) {
  const { t } = useTranslation();
  const displayEvents = events || [];
  return (
    <Widget title={t("widgets.events.title")} accent="var(--cyan)" upd={t("widgets.events.upcoming", { count: displayEvents.length })} delay={delay} onClick={onWidgetClick}>
      <div className="widget-scroll" style={{ maxHeight: 300, margin: "0 -10px", padding: "0 10px" }}>
        {displayEvents.length === 0 && <div className="widget-empty big">{t("widgets.events.empty")}</div>}
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
