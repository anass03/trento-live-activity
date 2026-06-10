import { useEffect, useMemo, useState } from "react";
import { getCityAlertById } from "../../lib/api";
import { Icon, WxIcon } from "./Icon";

type DetailModalProps = {
  open: boolean;
  type: string;
  title: string;
  accent?: string;
  data?: any;
  onClose: () => void;
  onAction?: (action: string, payload?: any) => void;
};

const fmtDate = (value?: string | null) => {
  if (!value) return "Non disponibile";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
};

const pctLabel = (value?: number | null) => (value == null ? "N/D" : `${Math.round(value)}%`);

function Field({ icon, label, value }: any) {
  return (
    <div className="dm-field">
      <span className="dm-field-ic"><Icon name={icon} size={14} /></span>
      <div>
        <div className="dm-field-label">{label}</div>
        <div className="dm-field-value">{value || "Non disponibile"}</div>
      </div>
    </div>
  );
}

function MiniMap({ location }: { location?: any }) {
  if (!location?.latitude || !location?.longitude) {
    return (
      <div className="dm-location-empty">
        <Icon name="pin" size={18} />
        <span>Nessuna posizione precisa disponibile</span>
      </div>
    );
  }
  return (
    <div className="dm-mini-map">
      <span className="dm-map-grid"></span>
      <span className="dm-map-pin" style={{ left: "52%", top: "46%" }}><Icon name="pin" size={16} /></span>
      <span className="dm-map-label">{location.label || `${location.latitude}, ${location.longitude}`}</span>
    </div>
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
const parkingStatusLabel = (item: any, pct?: number | null) => {
  if (item?.status === "full") return "Pieno";
  if (pct == null) return "N/D";
  // Keep the label in step with the colour bands (parkingColor) so an amber bar
  // never reads "Disponibile".
  return pct >= 85 ? "Quasi pieno" : pct >= 60 ? "Moderato" : "Disponibile";
};
const parkingTypeLabel = (item: any) => (item?.type === "bike" ? "Bici" : item?.type === "car" ? "Auto" : null);

function ParkingContent({ data }: any) {
  const items = data?.items || data?.parkings || [];
  const [selected, setSelected] = useState<any>(items[0] || null);
  useEffect(() => setSelected(items[0] || null), [data]);

  if (!items.length) {
    return <div className="widget-empty big">Dati parcheggi momentaneamente non disponibili.</div>;
  }

  const selOcc = parkingOcc(selected);
  const selColor = parkingColor(selOcc);

  return (
    <div className="dm-split">
      <div className="dm-list">
        {items.map((item: any) => {
          const occ = parkingOcc(item);
          const c = parkingColor(occ);
          const typeLbl = parkingTypeLabel(item);
          return (
            <button key={item.id || item.name} className={"dm-list-row" + ((selected?.id || selected?.name) === (item.id || item.name) ? " active" : "")} onClick={() => setSelected(item)}>
              <span>
                <b>{item.name}</b>
                <small>{[typeLbl, item.address || item.area || item.description || "Trento"].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="dm-pill" style={{ color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)`, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{pctLabel(occ)}</span>
            </button>
          );
        })}
      </div>
      <div className="dm-detail">
        <MiniMap location={selected} />
        <div className="dm-occ" style={{ ["--occ" as any]: selColor }}>
          <div className="dm-occ-top">
            <span className="dm-occ-status">{parkingStatusLabel(selected, selOcc)}</span>
            <span className="dm-occ-pct">{pctLabel(selOcc)} <small>occupato</small></span>
          </div>
          <div className="dm-occ-bar"><i style={{ width: `${selOcc ?? 0}%` }}></i></div>
        </div>
        <div className="dm-fields-grid">
          <Field icon="pin" label="Area" value={selected?.address || selected?.area || selected?.description} />
          <Field icon="grid" label="Posti liberi" value={`${selected?.availableSpaces ?? selected?.free ?? "N/D"} / ${selected?.totalSpaces ?? selected?.capacity ?? "N/D"}`} />
          <Field icon="gauge" label="Tipo" value={parkingTypeLabel(selected) || "Parcheggio"} />
          <Field icon="clock" label="Aggiornato" value={fmtDate(selected?.lastUpdatedAt || selected?.updatedAt || data?.fetchedAt)} />
        </div>
        <div className="dm-source">Fonte: {selected?.sourceLabel || data?.source?.name || "Comune di Trento"}</div>
      </div>
    </div>
  );
}

function AreasContent({ data }: any) {
  const areas: any[] = data?.areas || [];
  const [selected, setSelected] = useState<any>(areas[0] || null);
  useEffect(() => setSelected(areas[0] || null), [data]);

  if (!areas.length) {
    return <div className="widget-empty big">Nessuna area monitorata disponibile.</div>;
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
                <small>{a.eventsNearby ?? 0} eventi · {a.participants ?? 0} partecipanti</small>
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
  const current = data?.current || {};
  const daily = data?.daily || [];
  const hourly = data?.hourly || [];
  return (
    <div className="dm-weather">
      <div className="dm-weather-now">
        <WxIcon className="dm-weather-icon" />
        <div>
          <div className="dm-weather-temp">{current.temperature ?? "--"}<sup>&deg;C</sup></div>
          <div className="dm-weather-cond">{current.condition || "Meteo non disponibile"}</div>
          <div className="dm-source">Fonte: {data?.source?.name || "Open-Meteo"} - {fmtDate(data?.source?.fetchedAt)}</div>
        </div>
      </div>
      <div className="dm-fields-grid">
        <Field icon="drop" label="Umidita" value={current.humidity != null ? `${current.humidity}%` : "N/D"} />
        <Field icon="wind" label="Vento" value={current.windSpeed != null ? `${current.windSpeed} km/h` : "N/D"} />
        <Field icon="cloud" label="Copertura" value={current.cloudCover != null ? `${current.cloudCover}%` : "N/D"} />
        <Field icon="clock" label="Rilevazione" value={fmtDate(current.time)} />
      </div>
      <div className="dm-section-title">Prossime ore</div>
      <div className="dm-hourly">
        {hourly.length ? hourly.slice(0, 8).map((h: any) => (
          <div key={h.time} className="dm-hour-cell">
            <span>{new Date(h.time).toLocaleTimeString("it-IT", { hour: "2-digit" })}</span>
            <b>{h.temperature ?? "--"}&deg;</b>
            <small>{h.precipitationProbability ?? 0}% pioggia</small>
          </div>
        )) : <div className="widget-empty">Previsione oraria non disponibile.</div>}
      </div>
      <div className="dm-section-title">Giorni</div>
      <div className="dm-list compact">
        {daily.length ? daily.map((d: any) => (
          <div key={d.date} className="dm-list-static">
            <span><b>{new Date(d.date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric" })}</b><small>{d.condition}</small></span>
            <span className="dm-pill">{d.temperatureMax ?? "--"}&deg; / {d.temperatureMin ?? "--"}&deg;</span>
          </div>
        )) : <div className="widget-empty">Previsione giornaliera non disponibile.</div>}
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

  if (!data?.items?.length) return <div className="widget-empty big">Nessun avviso citta disponibile.</div>;

  return (
    <div className="dm-split">
      <div className="dm-list">
        {data.items.map((alert: any) => (
          <button key={alert.id} className={"dm-list-row sev-" + alert.severity + (selectedId === alert.id ? " active" : "")} onClick={() => setSelectedId(alert.id)}>
            <span>
              <b>{alert.title}</b>
              <small>{alert.summary}</small>
            </span>
            <span className="dm-pill">{alert.severity}</span>
          </button>
        ))}
      </div>
      <div className="dm-detail">
        <MiniMap location={selected?.location} />
        <div className="dm-section-title">{selected?.title}</div>
        <p className="dm-text">{selected?.description || selected?.summary || "Dettaglio in caricamento..."}</p>
        <div className="dm-fields-grid">
          <Field icon="warn" label="Severita" value={selected?.severity} />
          <Field icon="grid" label="Categoria" value={selected?.category} />
          <Field icon="clock" label="Pubblicato" value={fmtDate(selected?.publishedAt)} />
          <Field icon="clock" label="Aggiornato" value={fmtDate(selected?.updatedAt)} />
        </div>
        <div className="dm-source">Fonte: {selected?.source?.name || selected?.sourceName || data?.source?.name}</div>
        {selected?.location && (
          <button className="dm-primary" onClick={() => onAction?.("show-alert-on-map", selected)}>
            <Icon name="pin" size={15} />Mostra sulla mappa
          </button>
        )}
      </div>
    </div>
  );
}

function AreaContent({ data }: any) {
  return (
    <div>
      <div className="dm-area-score">
        <span>{Math.round((data?.level || 0) * 100)}</span>
        <div>
          <b>{data?.label || "Attivita non disponibile"}</b>
          <small>Indice basato su affollamento POI, eventi vicini, partecipanti e stato in tempo reale.</small>
        </div>
      </div>
      <div className="dm-fields-grid">
        <Field icon="pin" label="Area" value={data?.name} />
        <Field icon="activity" label="Eventi vicini" value={data?.eventsNearby ?? 0} />
        <Field icon="users" label="Partecipanti stimati" value={data?.participants ?? 0} />
        <Field icon="gauge" label="Stato POI" value={data?.status || data?.label} />
      </div>
      <p className="dm-text">Le zone tranquille vengono ordinate sotto le aree con attivita reale, cosi una zona poco movimentata non puo guidare la classifica quando sono presenti eventi o affollamento altrove.</p>
    </div>
  );
}

function EventContent({ data, onAction }: any) {
  return (
    <div>
      <div className="dm-fields-grid">
        <Field icon="pin" label="Luogo" value={data?.place || data?.location} />
        <Field icon="clock" label="Quando" value={data?.when || `${data?.date || "Oggi"}, ${data?.start || ""} ${data?.end ? `- ${data.end}` : ""}`} />
        <Field icon="users" label="Partecipanti" value={`${data?.going ?? data?.participantCount ?? 0} / ${data?.cap ?? data?.maxPartecipanti ?? "N/D"}`} />
        <Field icon="grid" label="Categoria" value={data?.cat || data?.category} />
      </div>
      <p className="dm-text">{data?.description || "Scheda evento con informazioni principali, provenienza mappa e azioni rapide."}</p>
      <button className="dm-primary" onClick={() => onAction?.("open-events-page", data)}>
        <Icon name="arrow" size={15} />Apri in Eventi
      </button>
    </div>
  );
}

function ActivityContent({ data, onAction }: any) {
  return (
    <div>
      <div className="dm-fields-grid">
        <Field icon="pin" label="Luogo" value={data?.loc || data?.location} />
        <Field icon="clock" label="Durata" value={data?.dur ? `${data.dur} min` : data?.dateTime} />
        <Field icon="star" label="Valutazione" value={data?.rating ? `${data.rating} (${data.reviews || 0})` : "N/D"} />
        <Field icon="users" label="Partecipanti" value={`${data?.going ?? data?.participantCount ?? 0} / ${data?.cap ?? data?.maxParticipants ?? "N/D"}`} />
      </div>
      <p className="dm-text">{data?.desc || data?.description || "Dettaglio attivita con dati utili per decidere se partecipare."}</p>
      <button className="dm-primary" onClick={() => onAction?.("open-activity-page", data)}>
        <Icon name="arrow" size={15} />Apri attivita
      </button>
    </div>
  );
}

function GenericContent({ data }: any) {
  const entries = useMemo(() => Object.entries(data || {}).filter(([, value]) => typeof value !== "object"), [data]);
  return (
    <div className="dm-list compact">
      {entries.length ? entries.map(([key, value]) => (
        <div className="dm-list-static" key={key}>
          <span><b>{key}</b></span>
          <span className="dm-pill">{String(value)}</span>
        </div>
      )) : <div className="widget-empty">Nessun dato disponibile.</div>}
    </div>
  );
}

export function DetailModal({ open, type, title, accent = "var(--accent)", data, onClose, onAction }: DetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const content =
    type === "parking" ? <ParkingContent data={data} /> :
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
          <button className="detail-modal-close" onClick={onClose} aria-label="Chiudi">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="detail-modal-body">{content}</div>
      </div>
    </div>
  );
}
