import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCityAlertById } from "../../lib/api";
import { getTimeFormat } from "../../lib/i18n";
import { Icon, WxIcon } from "./Icon";
import { MiniMap } from "../map/MiniMap";

type DetailModalProps = {
  open: boolean;
  type: string;
  title: string;
  accent?: string;
  data?: any;
  onClose: () => void;
  onAction?: (action: string, payload?: any) => void;
};

const fmtDate = (value?: string | null, unavailable = "N/A", locale = "it-IT") => {
  if (!value) return unavailable;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};

const pctLabel = (value?: number | null, nd = "N/D") => (value == null ? nd : `${Math.round(value)}%`);

function Field({ icon, label, value }: any) {
  const { t } = useTranslation();
  return (
    <div className="dm-field">
      <span className="dm-field-ic"><Icon name={icon} size={14} /></span>
      <div>
        <div className="dm-field-label">{label}</div>
        <div className="dm-field-value">{value || t("detail.parking.unavailable")}</div>
      </div>
    </div>
  );
}

// Posizione nel popup: micro-mappa reale (maplibre) se ci sono coordinate,
// altrimenti l'empty-state — mai una mappa finta.
function LocationMap({ location, markerColor }: { location?: any; markerColor?: string }) {
  const { t } = useTranslation();
  if (location?.latitude == null || location?.longitude == null) {
    return (
      <div className="dm-location-empty">
        <Icon name="pin" size={18} />
        <span>{t("detail.noLocation")}</span>
      </div>
    );
  }
  return (
    <MiniMap
      latitude={location.latitude}
      longitude={location.longitude}
      label={location.label || location.name || location.address || null}
      markerColor={markerColor}
    />
  );
}

// Occupancy → traffic-light colour. Near-full and full read red, matching the
// site palette and the home parking widget.
const parkingOcc = (item: any) => {
  const total = item?.totalSpaces ?? item?.capacity ?? 0;
  const free = item?.availableSpaces ?? item?.free ?? null;
  return item?.occupancyPercentage ?? item?.occupancyPct ?? (total && free != null ? Math.round((1 - free / total) * 100) : null);
};
const parkingColor = (pct?: number | null) => {
  if (pct == null) return "var(--text-muted)";
  if (pct >= 85) return "var(--red)";
  if (pct >= 60) return "var(--amber)";
  return "var(--green)";
};
const parkingStatusLabel = (item: any, pct: number | null | undefined, labels: { full: string; nd: string; almostFull: string; moderate: string; available: string }) => {
  if (item?.status === "full") return labels.full;
  if (pct == null) return labels.nd;
  // Keep the label in step with the colour bands (parkingColor) so an amber bar
  // never reads "Disponibile".
  return pct >= 85 ? labels.almostFull : pct >= 60 ? labels.moderate : labels.available;
};
const parkingTypeLabel = (item: any, lblBike: string, lblCar: string) => (item?.type === "bike" ? lblBike : item?.type === "car" ? lblCar : null);

function ParkingContent({ data, onAction }: any) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  const items = data?.items || data?.parkings || [];
  const [selected, setSelected] = useState<any>(items[0] || null);
  useEffect(() => setSelected(items[0] || null), [data]);

  if (!items.length) {
    return <div className="widget-empty big">{t("detail.parking.empty")}</div>;
  }

  const selOcc = parkingOcc(selected);
  const selColor = parkingColor(selOcc);
  const nd = t("detail.parking.unavailable");
  const statusLabels = {
    full: t("detail.parking.statusFull"),
    nd,
    almostFull: t("detail.parking.statusAlmostFull"),
    moderate: t("detail.parking.statusModerate"),
    available: t("detail.parking.statusAvailable"),
  };
  const lblBike = t("detail.parking.typeBike");
  const lblCar = t("detail.parking.typeCar");

  return (
    <div className="dm-split">
      <div className="dm-list">
        {items.map((item: any) => {
          const occ = parkingOcc(item);
          const c = parkingColor(occ);
          const typeLbl = parkingTypeLabel(item, lblBike, lblCar);
          return (
            <button key={item.id || item.name} className={"dm-list-row" + ((selected?.id || selected?.name) === (item.id || item.name) ? " active" : "")} onClick={() => setSelected(item)}>
              <span>
                <b>{item.name}</b>
                <small>{[typeLbl, item.address || item.area || item.description || t("detail.parking.defaultArea")].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="dm-pill" style={{ color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)`, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{pctLabel(occ, nd)}</span>
            </button>
          );
        })}
      </div>
      <div className="dm-detail">
        <LocationMap location={selected} markerColor="#2dd4bf" />
        <div className="dm-occ" style={{ ["--occ" as any]: selColor }}>
          <div className="dm-occ-top">
            <span className="dm-occ-status">{parkingStatusLabel(selected, selOcc, statusLabels)}</span>
            <span className="dm-occ-pct">{pctLabel(selOcc, nd)} <small>{t("detail.parking.occupied")}</small></span>
          </div>
          <div className="dm-occ-bar"><i style={{ width: `${selOcc ?? 0}%` }}></i></div>
        </div>
        <div className="dm-fields-grid">
          <Field icon="pin" label={t("detail.parking.area")} value={selected?.address || selected?.area || selected?.description} />
          <Field icon="grid" label={t("detail.parking.freeSpots")} value={`${selected?.availableSpaces ?? selected?.free ?? nd} / ${selected?.totalSpaces ?? selected?.capacity ?? nd}`} />
          <Field icon="gauge" label={t("detail.parking.type")} value={parkingTypeLabel(selected, lblBike, lblCar) || t("detail.parking.typeFallback")} />
          <Field icon="clock" label={t("detail.parking.updated")} value={fmtDate(selected?.lastUpdatedAt || selected?.updatedAt || data?.fetchedAt, t("detail.parking.unavailable"), dtLocale)} />
        </div>
        <div className="dm-source">{t("common.source")}: {selected?.sourceLabel || data?.source?.name || t("detail.parking.defaultSource")}</div>
        {(selected?.latitude != null || selected?.lat != null) && (
          <button className="dm-primary" onClick={() => onAction?.("show-parking-on-map", selected)}>
            <Icon name="pin" size={15} />{t("detail.alerts.showOnMap")}
          </button>
        )}
      </div>
    </div>
  );
}

function AreasContent({ data }: any) {
  const { t } = useTranslation();
  const areas: any[] = data?.areas || [];
  const [selected, setSelected] = useState<any>(areas[0] || null);
  useEffect(() => setSelected(areas[0] || null), [data]);

  if (!areas.length) {
    return <div className="widget-empty big">{t("detail.areas.empty")}</div>;
  }

  return (
    <div className="dm-split">
      <div className="dm-list">
        {areas.map((a: any, i: number) => {
          const isActive = (selected?.name) === a.name;
          return (
            <button key={a.name || i} className={"dm-list-row" + (isActive ? " active" : "")} onClick={() => setSelected(a)}>
              <span>
                <b>{String(i + 1).padStart(2, "0")} · {a.name}</b>
                <small>{t("detail.areas.rowMeta", { events: a.eventsNearby ?? 0, participants: a.participants ?? 0 })}</small>
              </span>
              <span className="dm-pill" style={{ color: a.color, borderColor: `color-mix(in srgb, ${a.color} 45%, transparent)`, background: `color-mix(in srgb, ${a.color} 16%, transparent)` }}>{a.label}</span>
            </button>
          );
        })}
      </div>
      <div className="dm-detail">
        <AreaContent data={selected} />
      </div>
    </div>
  );
}

function WeatherContent({ data }: any) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  const current = data?.current || {};
  const daily = data?.daily || [];
  const hourly = data?.hourly || [];
  const unavailable = t("detail.parking.unavailable");
  return (
    <div className="dm-weather">
      <div className="dm-weather-now">
        <WxIcon className="dm-weather-icon" />
        <div>
          <div className="dm-weather-temp">{current.temperature ?? "--"}<sup>&deg;C</sup></div>
          <div className="dm-weather-cond">
            {current.weatherCode != null
              ? t(`wx.${current.weatherCode}` as any, { defaultValue: current.condition || t("detail.weather.unavailable") })
              : (current.condition || t("detail.weather.unavailable"))}
          </div>
          <div className="dm-source">{t("common.source")}: {data?.source?.name || "Open-Meteo"} - {fmtDate(data?.source?.fetchedAt, unavailable, dtLocale)}</div>
        </div>
      </div>
      <div className="dm-fields-grid">
        <Field icon="drop" label={t("detail.weather.humidity")} value={current.humidity != null ? `${current.humidity}%` : unavailable} />
        <Field icon="wind" label={t("detail.weather.wind")} value={current.windSpeed != null ? `${current.windSpeed} km/h` : unavailable} />
        <Field icon="cloud" label={t("detail.weather.cover")} value={current.cloudCover != null ? `${current.cloudCover}%` : unavailable} />
        <Field icon="clock" label={t("detail.weather.reading")} value={fmtDate(current.time, unavailable, dtLocale)} />
      </div>
      <div className="dm-section-title">{t("detail.weather.nextHours")}</div>
      <div className="dm-hourly">
        {hourly.length ? hourly.slice(0, 8).map((h: any) => (
          <div key={h.time} className="dm-hour-cell">
            <span>{new Date(h.time).toLocaleTimeString(dtLocale, { hour: "2-digit", hour12: getTimeFormat() === "12h" })}</span>
            <b>{h.temperature ?? "--"}&deg;</b>
            <small>{t("detail.weather.rainPct", { pct: h.precipitationProbability ?? 0 })}</small>
          </div>
        )) : <div className="widget-empty">{t("detail.weather.emptyHourly")}</div>}
      </div>
      <div className="dm-section-title">{t("detail.weather.days")}</div>
      <div className="dm-list compact">
        {daily.length ? daily.map((d: any) => (
          <div key={d.date} className="dm-list-static">
            <span><b>{new Date(d.date).toLocaleDateString(dtLocale, { weekday: "long", day: "numeric" })}</b><small>{d.weatherCode != null ? t(`wx.${d.weatherCode}` as any, { defaultValue: d.condition }) : d.condition}</small></span>
            <span className="dm-pill">{d.temperatureMax ?? "--"}&deg; / {d.temperatureMin ?? "--"}&deg;</span>
          </div>
        )) : <div className="widget-empty">{t("detail.weather.emptyDaily")}</div>}
      </div>
    </div>
  );
}

function AlertsContent({ data, onAction }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(data?.items?.[0]?.id || null);
  const [details, setDetails] = useState<Record<string, any>>({});
  const selected = selectedId ? details[selectedId] || data?.items?.find((a: any) => a.id === selectedId) : null;

  useEffect(() => {
    setSelectedId(data?.items?.[0]?.id || null);
    setDetails({});
  }, [data]);

  useEffect(() => {
    if (!selectedId || details[selectedId]) return;
    let alive = true;
    getCityAlertById(selectedId)
      .then((detail) => {
        if (alive) setDetails((prev) => ({ ...prev, [selectedId]: detail }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [selectedId, details]);

  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  const unavailable = t("detail.parking.unavailable");

  if (!data?.items?.length) return <div className="widget-empty big">{t("detail.alerts.empty")}</div>;

  return (
    <div className="dm-split">
      <div className="dm-list">
        {data.items.map((alert: any) => (
          <button key={alert.id} className={"dm-list-row sev-" + alert.severity + (selectedId === alert.id ? " active" : "")} onClick={() => setSelectedId(alert.id)}>
            <span>
              <b>{alert.title}</b>
              <small>{alert.summary}</small>
            </span>
            <span className="dm-pill">{t(`alertSeverity.${alert.severity}` as any, { defaultValue: alert.severity })}</span>
          </button>
        ))}
      </div>
      <div className="dm-detail">
        <LocationMap location={selected?.location} markerColor="#fbbf24" />
        <div className="dm-section-title">{selected?.title}</div>
        <p className="dm-text">{selected?.description || selected?.summary || t("detail.alerts.loadingDetail")}</p>
        <div className="dm-fields-grid">
          <Field icon="warn" label={t("detail.alerts.severity")} value={selected?.severity ? t(`alertSeverity.${selected.severity}` as any, { defaultValue: selected.severity }) : undefined} />
          <Field icon="grid" label={t("detail.alerts.category")} value={selected?.category} />
          <Field icon="clock" label={t("detail.alerts.published")} value={fmtDate(selected?.publishedAt, unavailable, dtLocale)} />
          <Field icon="clock" label={t("detail.alerts.updated")} value={fmtDate(selected?.updatedAt, unavailable, dtLocale)} />
        </div>
        <div className="dm-source">{t("common.source")}: {selected?.source?.name || selected?.sourceName || data?.source?.name}</div>
        {selected?.location && (
          <button className="dm-primary" onClick={() => onAction?.("show-alert-on-map", selected)}>
            <Icon name="pin" size={15} />{t("detail.alerts.showOnMap")}
          </button>
        )}
      </div>
    </div>
  );
}

function AreaContent({ data }: any) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="dm-area-score">
        <span>{Math.round((data?.level || 0) * 100)}</span>
        <div>
          <b>{data?.label || t("detail.area.noActivity")}</b>
          <small>{t("detail.area.scoreHint")}</small>
        </div>
      </div>
      <div className="dm-fields-grid">
        <Field icon="pin" label={t("detail.area.area")} value={data?.name} />
        <Field icon="activity" label={t("detail.area.nearbyEvents")} value={data?.eventsNearby ?? 0} />
        <Field icon="users" label={t("detail.area.estParticipants")} value={data?.participants ?? 0} />
        <Field icon="gauge" label={t("detail.area.poiStatus")} value={data?.status ? t(`crowdStatus.${data.status}` as any, { defaultValue: data.status }) : data?.label} />
      </div>
    </div>
  );
}

function EventContent({ data, onAction }: any) {
  const { t } = useTranslation();
  const unavailable = t("detail.parking.unavailable");
  return (
    <div>
      <div className="dm-fields-grid">
        <Field icon="pin" label={t("detail.event.place")} value={data?.place || data?.location} />
        <Field icon="clock" label={t("detail.event.when")} value={data?.when || `${data?.date || t("events.today")}, ${data?.start || ""} ${data?.end ? `- ${data.end}` : ""}`} />
        <Field icon="users" label={t("detail.event.participants")} value={`${data?.going ?? data?.participantCount ?? 0} / ${data?.cap ?? data?.maxPartecipanti ?? unavailable}`} />
        <Field icon="grid" label={t("detail.event.category")} value={data?.cat || data?.category} />
      </div>
      <p className="dm-text">{data?.description || t("detail.event.fallbackDesc")}</p>
      <button className="dm-primary" onClick={() => onAction?.("open-events-page", data)}>
        <Icon name="arrow" size={15} />{t("detail.event.open")}
      </button>
    </div>
  );
}

function ActivityContent({ data, onAction }: any) {
  const { t } = useTranslation();
  const unavailable = t("detail.parking.unavailable");
  return (
    <div>
      <div className="dm-fields-grid">
        <Field icon="pin" label={t("detail.activity.place")} value={data?.loc || data?.location} />
        <Field icon="clock" label={t("detail.activity.duration")} value={data?.dur ? `${data.dur} min` : data?.dateTime} />
        <Field icon="star" label={t("detail.activity.rating")} value={data?.rating ? `${data.rating} (${data.reviews || 0})` : unavailable} />
        <Field icon="users" label={t("detail.activity.participants")} value={`${data?.going ?? data?.participantCount ?? 0} / ${data?.cap ?? data?.maxParticipants ?? unavailable}`} />
      </div>
      <p className="dm-text">{data?.desc || data?.description || t("detail.activity.fallbackDesc")}</p>
      <button className="dm-primary" onClick={() => onAction?.("open-activity-page", data)}>
        <Icon name="arrow" size={15} />{t("detail.activity.open")}
      </button>
    </div>
  );
}

function GenericContent({ data }: any) {
  const { t } = useTranslation();
  const entries = useMemo(() => Object.entries(data || {}).filter(([, value]) => typeof value !== "object"), [data]);
  return (
    <div className="dm-list compact">
      {entries.length ? entries.map(([key, value]) => (
        <div className="dm-list-static" key={key}>
          <span><b>{key}</b></span>
          <span className="dm-pill">{String(value)}</span>
        </div>
      )) : <div className="widget-empty">{t("detail.generic.empty")}</div>}
    </div>
  );
}

export function DetailModal({ open, type, title, accent = "var(--accent)", data, onClose, onAction }: DetailModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const content =
    type === "parking" ? <ParkingContent data={data} onAction={onAction} /> :
    type === "weather" ? <WeatherContent data={data} /> :
    type === "alerts" ? <AlertsContent data={data} onAction={onAction} /> :
    type === "areas" ? <AreasContent data={data} /> :
    type === "area" ? <AreaContent data={data} /> :
    type === "event" ? <EventContent data={data} onAction={onAction} /> :
    type === "activity" ? <ActivityContent data={data} onAction={onAction} /> :
    <GenericContent data={data} />;

  return (
    <div className="detail-modal-scrim" onMouseDown={onClose}>
      <div
        className="detail-modal"
        style={{ "--dm-accent": accent } as any}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="detail-modal-head">
          <div>
            <div className="detail-modal-kicker">{type}</div>
            <h2 id="detail-modal-title">{title}</h2>
          </div>
          <button className="detail-modal-close" onClick={onClose} aria-label={t("detail.closeAria")}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="detail-modal-body">{content}</div>
      </div>
    </div>
  );
}
