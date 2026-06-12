import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Header } from "../components/layout/Header";
import { Icon } from "../components/ui/Icon";
import { createEvent, getPOIs, reverseGeocode, POI } from "../lib/api";

const PUBLISH_CATEGORIES = [
  { id: "cultura",  icon: "landmark", color: "var(--violet)" },
  { id: "musica",   icon: "music",    color: "var(--magenta)" },
  { id: "sport",    icon: "run",      color: "var(--green)" },
  { id: "cibo",     color: "var(--amber)",   icon: "food" },
  { id: "outdoor",  color: "var(--teal)",    icon: "bike" },
  { id: "famiglia", color: "var(--cyan)",    icon: "family" },
];

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const isDarkTheme = (theme: string) => theme === "dark" || theme === "night";

/* Mini-mappa per piazzare il pin dell'evento: un click posiziona/sposta il marker. */
function PinPickerMap({ theme, pin, onPin }: {
  theme: "light" | "dark" | "auto";
  pin: { lat: number; lng: number } | null;
  onPin: (p: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDarkTheme(theme) ? DARK_STYLE : LIGHT_STYLE,
      center: TRENTO_CENTER,
      zoom: 13,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => {
      onPinRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  useEffect(() => {
    mapRef.current?.setStyle(isDarkTheme(theme) ? DARK_STYLE : LIGHT_STYLE);
  }, [theme]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!pin) { markerRef.current?.remove(); markerRef.current = null; return; }
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#8b5cf6" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([pin.lng, pin.lat]);
    }
  }, [pin]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 260, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border-soft)", cursor: "crosshair" }}
    />
  );
}

export function EntityPublishPage({ page, setPage, theme, setTheme, user }: any) {
  const { t } = useTranslation();
  const [cat, setCat] = useState("cultura");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [locationMode, setLocationMode] = useState<"poi" | "pin">("poi");
  const [poiId, setPoiId] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  // Indirizzo leggibile del pin: l'ente ragiona per vie, non per coordinate.
  const [pinAddress, setPinAddress] = useState<string | null>(null);
  useEffect(() => {
    if (!pin) { setPinAddress(null); return; }
    let alive = true;
    reverseGeocode(pin.lat, pin.lng)
      .then((r) => { if (alive) setPinAddress(r.address); })
      .catch(() => { if (alive) setPinAddress(null); });
    return () => { alive = false; };
  }, [pin?.lat, pin?.lng]);
  const [pois, setPois] = useState<POI[]>([]);
  const [when, setWhen] = useState(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [cap, setCap] = useState("50");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPOIs()
      .then((data) => setPois(data))
      .catch((err) => console.error("Failed to load POIs:", err));
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    if (!title || !desc) {
      setError(t("ente.publish.requiredFieldsError"));
      return;
    }
    if (locationMode === "poi" && !poiId) {
      setError(t("ente.publish.selectPoiError"));
      return;
    }
    if (locationMode === "pin" && !pin) {
      setError(t("ente.publish.placePinError"));
      return;
    }

    setLoading(true);
    try {
      const selectedPoi = locationMode === "poi" ? pois.find((p) => p.id === poiId) : null;
      await createEvent({
        titolo: title,
        descrizione: desc,
        categoria: cat,
        data: when,
        orarioInizio: startTime,
        orarioFine: endTime,
        poiId: locationMode === "poi" ? poiId : undefined,
        latitudine: locationMode === "pin" ? pin!.lat : selectedPoi?.latitudine,
        longitudine: locationMode === "pin" ? pin!.lng : selectedPoi?.longitudine,
        maxPartecipanti: Number(cap),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPage("eventi");
      }, 1500);
    } catch (err: any) {
      setError(err.message || t("ente.publish.publishError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="revamp-legal-scene">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} user={user} />
      <div className="revamp-legal-wrap">
        <div className="revamp-legal-card anim-in" style={{ "--accent": "var(--violet)", maxWidth: "680px" } as React.CSSProperties}>
          <h1>{t("ente.publish.eventTitle")}</h1>
          <p>{t("ente.publish.eventSubtitle")}</p>

          {error && (
            <div className="revamp-status-pill danger" style={{ width: "100%", padding: "10px 0", justifyContent: "center", margin: "20px 0" }}>
              <Icon name="warn" size={12} /> {error}
            </div>
          )}

          {success ? (
            <div className="revamp-status-pill success" style={{ width: "100%", padding: "16px 0", justifyContent: "center", margin: "20px 0" }}>
              <Icon name="check" size={14} /> {t("ente.publish.eventSuccess")}
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <h3 className="revamp-detail-section-title">{t("ente.publish.step1")}</h3>
              <div className="s-interests" style={{ marginBottom: 24 }}>
                {PUBLISH_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={"s-int-chip" + (cat === item.id ? " on" : "")}
                    style={{ "--ic": item.color } as React.CSSProperties}
                    onClick={() => setCat(item.id)}
                  >
                    <Icon name={item.icon} size={14} /> {t(`ente.publish.categories.${item.id}`)}
                  </button>
                ))}
              </div>

              <h3 className="revamp-detail-section-title">{t("ente.publish.step2")}</h3>
              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("ente.publish.titleLabel")}</label>
                <input
                  type="text"
                  className="revamp-form-input"
                  placeholder={t("ente.publish.titlePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ paddingLeft: 14 }}
                  required
                />
              </div>

              <div className="revamp-form-group">
                <label className="revamp-form-label">{t("ente.publish.descLabel")}</label>
                <textarea
                  className="revamp-textarea"
                  placeholder={t("ente.publish.descPlaceholder")}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                />
              </div>

              <h3 className="revamp-detail-section-title">{t("ente.publish.step3Location")}</h3>
              <div style={{ display: "flex", gap: "10px", marginBottom: 14 }}>
                <button
                  type="button"
                  className={`s-rpill ${locationMode === "poi" ? "on" : ""}`}
                  onClick={() => setLocationMode("poi")}
                  style={{ flex: 1, padding: "10px 0", justifyContent: "center" }}
                >
                  <Icon name="landmark" size={15} /> {t("ente.publish.locationModePoi")}
                </button>
                <button
                  type="button"
                  className={`s-rpill ${locationMode === "pin" ? "on" : ""}`}
                  onClick={() => setLocationMode("pin")}
                  style={{ flex: 1, padding: "10px 0", justifyContent: "center" }}
                >
                  <Icon name="pin" size={15} /> {t("ente.publish.locationModePin")}
                </button>
              </div>

              {locationMode === "poi" ? (
                <div className="revamp-form-group">
                  <label className="revamp-form-label">{t("ente.publish.poiLabel")}</label>
                  <select
                    className="revamp-select"
                    value={poiId}
                    onChange={(e) => setPoiId(e.target.value)}
                    style={{ height: "38px", width: "100%", padding: "0 10px" }}
                  >
                    <option value="">{t("ente.publish.poiPlaceholder")}</option>
                    {pois.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="revamp-form-group">
                  <label className="revamp-form-label">
                    {t("ente.publish.pinMapLabel")}
                    {pin && (
                      <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400 }}>
                        {pinAddress || `(${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)})`}
                      </span>
                    )}
                  </label>
                  <PinPickerMap theme={theme} pin={pin} onPin={setPin} />
                </div>
              )}

              <h3 className="revamp-detail-section-title" style={{ marginTop: 24 }}>{t("ente.publish.step4DateTime")}</h3>
              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">{t("ente.publish.dateLabel")}</label>
                  <input
                    type="date"
                    className="revamp-form-input"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">{t("ente.publish.capacityLabel")}</label>
                  <input
                    type="number"
                    className="revamp-form-input"
                    placeholder="50"
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
              </div>

              <div className="revamp-form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">{t("ente.publish.startLabel")}</label>
                  <input
                    type="time"
                    className="revamp-form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
                <div className="revamp-form-group" style={{ marginBottom: 0 }}>
                  <label className="revamp-form-label">{t("ente.publish.endLabel")}</label>
                  <input
                    type="time"
                    className="revamp-form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ paddingLeft: 14 }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="revamp-form-btn" style={{ "--accent": "var(--violet)" } as React.CSSProperties} disabled={loading}>
                {loading ? t("ente.publish.publishing") : t("ente.publish.publishEvent")}{" "}
                {!loading && <Icon name="sparkle" size={16} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
