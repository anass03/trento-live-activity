import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl, {
  type GeoJSONSource,
  type LayerSpecification,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AppUser } from '../../data/mockUser';
import { createActivity, type CrowdingStatus, type MapMarker, type MarkerType } from '../../lib/api';

const TRENTO_CENTER: [number, number] = [11.1211, 46.0679];
const CITY_STYLE = 'https://tiles.openfreemap.org/styles/bright';
const OPENFREEMAP_VECTOR_SOURCE = 'https://tiles.openfreemap.org/planet';
const HEAT_SOURCE_ID = 'trento-crowd-heat';
const POINT_SOURCE_ID = 'trento-crowd-points';
const BUILDING_SOURCE_ID = 'trento-3d-buildings';

const typeLabel: Record<MarkerType, string> = {
  poi: 'POI',
  activity: 'Attività',
  event: 'Evento',
};

const crowdLabel: Record<CrowdingStatus, string> = {
  green: 'Basso',
  yellow: 'Medio',
  orange: 'Intenso',
  red: 'Molto alto',
};

const crowdColor: Record<CrowdingStatus, string> = {
  green: '#2f9e72',
  yellow: '#c9a227',
  orange: '#d97706',
  red: '#c2413f',
};

type MarkerProperties = {
  id: string;
  type: MarkerType;
  title: string;
  crowdLevel: number;
  crowdingStatus: CrowdingStatus;
  isCertified: boolean;
  sourceId: string;
  category: string;
  description: string;
  dateTime: string;
};

type MarkerFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: MarkerProperties;
    geometry: { type: 'Point'; coordinates: [number, number] };
  }>;
};

type PopupState = {
  props: MarkerProperties;
  lngLat: [number, number]; // [lng, lat]
  locked: boolean;
};

const crowdColorExpression = [
  'interpolate',
  ['linear'],
  ['get', 'crowdLevel'],
  0,
  crowdColor.green,
  34,
  crowdColor.yellow,
  62,
  crowdColor.orange,
  82,
  crowdColor.red,
];

function fallbackCrowdLevel(status: CrowdingStatus) {
  return { green: 20, yellow: 50, orange: 72, red: 92 }[status];
}

function crowdStatusForLevel(level: number): CrowdingStatus {
  if (level >= 82) return 'red';
  if (level >= 62) return 'orange';
  if (level >= 34) return 'yellow';
  return 'green';
}

function normalizedCrowd(marker: MapMarker) {
  const level = Math.min(100, Math.max(0, marker.crowdLevel ?? fallbackCrowdLevel(marker.crowdingStatus)));
  const status = marker.crowdingStatus ?? crowdStatusForLevel(level);
  return { level, status, color: crowdColor[status] };
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function markerCollection(markers: MapMarker[]): MarkerFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: markers
      .filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
      .map((marker) => {
        const { level, status } = normalizedCrowd(marker);
        return {
          type: 'Feature',
          properties: {
            id: marker.id,
            type: marker.type,
            title: marker.title,
            crowdLevel: level,
            crowdingStatus: status,
            isCertified: marker.isCertified,
            sourceId: marker.sourceId,
            category: marker.category || typeLabel[marker.type],
            description: marker.description || 'Informazione disponibile sulla mappa cittadina.',
            dateTime: marker.dateTime || '',
          },
          geometry: {
            type: 'Point',
            coordinates: [marker.longitude, marker.latitude],
          },
        };
      }),
  };
}

function firstSymbolLayerId(map: MapLibreMap) {
  return map.getStyle().layers?.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;
}

function add3dBuildings(map: MapLibreMap) {
  const labelLayerId = firstSymbolLayerId(map);
  const sourceId = BUILDING_SOURCE_ID;

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'vector',
      url: OPENFREEMAP_VECTOR_SOURCE,
    });
  }

  if (map.getLayer('trento-buildings-3d')) return;

  map.addLayer(
    {
      id: 'trento-buildings-3d',
      source: sourceId,
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 14.4,
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'render_height'],
          0,
          '#dfe6ec',
          80,
          '#c9d3dc',
          220,
          '#9fb0bf',
        ],
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14.4,
          0,
          15.5,
          ['get', 'render_height'],
        ],
        'fill-extrusion-base': ['case', ['>=', ['zoom'], 16], ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.76,
      },
    },
    labelLayerId,
  );
}

function addMarkerSources(map: MapLibreMap, data: MarkerFeatureCollection) {
  if (!map.getSource(HEAT_SOURCE_ID)) {
    map.addSource(HEAT_SOURCE_ID, { type: 'geojson', data });
  }
  if (!map.getSource(POINT_SOURCE_ID)) {
    map.addSource(POINT_SOURCE_ID, {
      type: 'geojson',
      data,
      cluster: true,
      clusterMaxZoom: 15,
      clusterRadius: 42,
    });
  }
}

function addMarkerLayers(map: MapLibreMap) {
  const labelLayerId = firstSymbolLayerId(map);
  const layers: LayerSpecification[] = [
    {
      id: 'trento-crowd-heat',
      type: 'heatmap',
      source: HEAT_SOURCE_ID,
      maxzoom: 17,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'crowdLevel'], 0, 0.08, 100, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 17, 1.75],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 12, 18, 16, 44, 18, 72],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.45, 17, 0.25],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(47,158,114,0)',
          0.26,
          crowdColor.green,
          0.48,
          crowdColor.yellow,
          0.7,
          crowdColor.orange,
          1,
          crowdColor.red,
        ],
      },
    },
    {
      id: 'trento-crowd-glow',
      type: 'circle',
      source: HEAT_SOURCE_ID,
      paint: {
        'circle-color': crowdColorExpression as any,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12,
          ['interpolate', ['linear'], ['get', 'crowdLevel'], 0, 14, 100, 44],
          17,
          ['interpolate', ['linear'], ['get', 'crowdLevel'], 0, 54, 100, 170],
        ],
        'circle-blur': 1,
        'circle-opacity': ['interpolate', ['linear'], ['get', 'crowdLevel'], 0, 0.08, 100, 0.24],
      },
    },
    {
      id: 'trento-marker-clusters',
      type: 'circle',
      source: POINT_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], crowdColor.green, 4, crowdColor.yellow, 8, crowdColor.orange, 14, crowdColor.red],
        'circle-radius': ['step', ['get', 'point_count'], 18, 4, 22, 8, 27, 14, 32],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#f8fafc',
        'circle-opacity': 0.96,
      },
    },
    {
      id: 'trento-cluster-count',
      type: 'symbol',
      source: POINT_SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 13,
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#f8fafc',
      },
    },
    {
      id: 'trento-unclustered-glow',
      type: 'circle',
      source: POINT_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': crowdColorExpression as any,
        'circle-radius': 16,
        'circle-blur': 0.72,
        'circle-opacity': 0.38,
      },
    },
    {
      id: 'trento-unclustered-point',
      type: 'circle',
      source: POINT_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': crowdColorExpression as any,
        'circle-radius': 7,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#f8fafc',
        'circle-opacity': 0.98,
      },
    },
  ];

  layers.forEach((layer) => {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer, layer.id.includes('crowd') ? labelLayerId : undefined);
    }
  });
}

function fitMapToMarkers(map: MapLibreMap, markers: MapMarker[]) {
  const validMarkers = markers.filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude));

  if (validMarkers.length === 0) {
    map.easeTo({ center: TRENTO_CENTER, zoom: 14.7, pitch: 64, bearing: -22, duration: 650 });
    return;
  }

  if (validMarkers.length === 1) {
    map.easeTo({
      center: [validMarkers[0].longitude, validMarkers[0].latitude],
      zoom: 16,
      pitch: 66,
      bearing: -24,
      duration: 900,
    });
    return;
  }

  const bounds = validMarkers.reduce(
    (currentBounds, marker) => currentBounds.extend([marker.longitude, marker.latitude]),
    new maplibregl.LngLatBounds(
      [validMarkers[0].longitude, validMarkers[0].latitude],
      [validMarkers[0].longitude, validMarkers[0].latitude],
    ),
  );

  map.fitBounds(bounds, {
    padding: { top: 92, right: 64, bottom: 92, left: 64 },
    maxZoom: 15.8,
    pitch: 64,
    bearing: -22,
    duration: 900,
  });
}

type PoiForm = { tipo: string; data: string; orarioInizio: string; orarioFine: string; maxPartecipanti: number };
const defaultForm = (): PoiForm => ({ tipo: 'sport', data: '', orarioInizio: '', orarioFine: '', maxPartecipanti: 10 });
const ACTIVITY_TYPES = ['sport', 'cultura', 'musica', 'arte', 'gastronomia', 'studio'];

export function MapCanvas({ markers, user }: { markers: MapMarker[]; user?: AppUser }) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isLoadedRef = useRef(false);
  const latestMarkersRef = useRef(markers);
  const data = useMemo(() => markerCollection(markers), [markers]);

  // React popup state
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  // Refs so map event handlers (stale closures) always see current values
  const popupStateRef = useRef<PopupState | null>(null);
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedInRef = useRef(false);
  const navigateRef = useRef(navigate);

  // Create-activity form state
  const [activePoi, setActivePoi] = useState<{ id: string; title: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PoiForm>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const isLoggedIn = !!user && user.role !== 'anonymous';

  // Keep refs in sync with latest render values
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { isLoggedInRef.current = isLoggedIn; }, [isLoggedIn]);
  useEffect(() => { latestMarkersRef.current = markers; }, [markers]);

  function closePopup() {
    popupStateRef.current = null;
    setPopup(null);
  }

  function resetView() {
    if (mapRef.current) fitMapToMarkers(mapRef.current, latestMarkersRef.current);
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activePoi) return;
    setFormError(null);
    setFormLoading(true);
    try {
      await createActivity({ ...form, poiId: activePoi.id });
      setFormSuccess('Attività creata!');
      setForm(defaultForm());
      setTimeout(() => { setShowForm(false); setActivePoi(null); setFormSuccess(null); }, 1800);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setFormLoading(false);
    }
  }

  // Map initialisation — runs once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CITY_STYLE,
      center: TRENTO_CENTER,
      zoom: 14.7,
      minZoom: 12,
      maxZoom: 19,
      pitch: 64,
      maxPitch: 78,
      bearing: -22,
      canvasContextAttributes: { antialias: true },
      attributionControl: false,
      renderWorldCopies: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    const handleLoad = () => {
      map.setLight({
        anchor: 'viewport',
        color: '#eef3f7',
        intensity: 0.38,
        position: [1.15, 180, 42],
      });
      add3dBuildings(map);
      addMarkerSources(map, markerCollection(latestMarkersRef.current));
      addMarkerLayers(map);
      fitMapToMarkers(map, latestMarkersRef.current);

      // ── Cluster click: expand ──────────────────────────────────────────────
      const handleClusterClick = async (event: MapLayerMouseEvent) => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['trento-marker-clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const geometry = features[0]?.geometry;
        if (typeof clusterId !== 'number' || geometry.type !== 'Point') return;
        const source = map.getSource(POINT_SOURCE_ID) as GeoJSONSource | undefined;
        const zoom = await source?.getClusterExpansionZoom(clusterId);
        if (zoom) map.easeTo({ center: geometry.coordinates as [number, number], zoom, pitch: 66, duration: 550 });
      };

      // ── Hover: show popup (un-locked) ──────────────────────────────────────
      const handleMouseEnter = (event: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        // Don't override a locked popup with a hover popup
        if (popupStateRef.current?.locked) return;
        const props = feature.properties as MarkerProperties;
        const lngLat = feature.geometry.coordinates as [number, number];
        const newState: PopupState = { props, lngLat, locked: false };
        popupStateRef.current = newState;
        setPopup(newState);
        const pt = map.project(lngLat);
        setPopupPos({ x: pt.x, y: pt.y });
      };

      // ── Mouse leave: hide hover popup ──────────────────────────────────────
      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        if (!popupStateRef.current?.locked) {
          popupStateRef.current = null;
          setPopup(null);
        }
      };

      // ── Single / double click on a marker ─────────────────────────────────
      const handlePointClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const props = feature.properties as MarkerProperties;
        const lngLat = feature.geometry.coordinates as [number, number];

        // If a double-click is in progress the first click already set the
        // timer; cancel it so the dblclick handler can navigate cleanly.
        if (singleClickTimerRef.current) {
          clearTimeout(singleClickTimerRef.current);
          singleClickTimerRef.current = null;
          return;
        }

        singleClickTimerRef.current = setTimeout(() => {
          singleClickTimerRef.current = null;
          const current = popupStateRef.current;

          if (current?.locked && current.props.id === props.id) {
            // Already locked on this marker → navigate on single click
            if (props.type !== 'poi') {
              navigateRef.current(`/${props.type === 'event' ? 'eventi' : 'attivita'}/${props.id}`);
            }
          } else {
            // First click → lock the popup
            const newState: PopupState = { props, lngLat, locked: true };
            popupStateRef.current = newState;
            setPopup(newState);
            const pt = map.project(lngLat);
            setPopupPos({ x: pt.x, y: pt.y });
          }
        }, 230);
      };

      // ── Double click: navigate immediately (no lock step) ─────────────────
      const handlePointDblClick = (event: MapLayerMouseEvent) => {
        event.preventDefault(); // prevent map zoom
        if (singleClickTimerRef.current) {
          clearTimeout(singleClickTimerRef.current);
          singleClickTimerRef.current = null;
        }
        const feature = event.features?.[0];
        if (!feature) return;
        const props = feature.properties as MarkerProperties;
        if (props.type !== 'poi') {
          navigateRef.current(`/${props.type === 'event' ? 'eventi' : 'attivita'}/${props.id}`);
        }
      };

      // ── Click on map background: dismiss locked popup ─────────────────────
      const handleMapClick = (e: MapMouseEvent) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['trento-unclustered-point'] });
        if (hits.length === 0 && popupStateRef.current?.locked) {
          popupStateRef.current = null;
          setPopup(null);
        }
      };

      // ── Map move/zoom: keep popup anchored to its marker ──────────────────
      const handleMapMove = () => {
        const state = popupStateRef.current;
        if (state) {
          const pt = map.project(state.lngLat);
          setPopupPos({ x: pt.x, y: pt.y });
        }
      };

      map.on('click', 'trento-marker-clusters', handleClusterClick);
      map.on('mouseenter', 'trento-unclustered-point', handleMouseEnter);
      map.on('mouseleave', 'trento-unclustered-point', handleMouseLeave);
      map.on('click', 'trento-unclustered-point', handlePointClick);
      map.on('dblclick', 'trento-unclustered-point', handlePointDblClick);
      map.on('click', handleMapClick);
      map.on('move', handleMapMove);

      isLoadedRef.current = true;
    };

    map.on('load', handleLoad);
    mapRef.current = map;

    return () => {
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }
      map.off('load', handleLoad);
      map.remove();
      mapRef.current = null;
      isLoadedRef.current = false;
    };
  }, []);

  // Update sources when markers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    (map.getSource(HEAT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(data);
    (map.getSource(POINT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(data);
    fitMapToMarkers(map, markers);
  }, [data, markers]);

  const canNavigate = popup && popup.props.type !== 'poi';

  return (
    <section className="map-area map-area-3d" aria-label="Map Zone 3D" data-testid="map-zone">
      <div ref={containerRef} className="maplibre-map" />

      {/* ── React popup overlay ─────────────────────────────────────────── */}
      {popup && (
        <div
          className="map-react-popup-anchor"
          style={{ left: popupPos.x, top: popupPos.y }}
        >
          <article
            className={`map-react-popup maplibre-city-popup-card${popup.locked ? ' map-react-popup--locked' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="maplibre-popup-kicker">
              <span>{typeLabel[popup.props.type]}</span>
              <span className={`crowd-${popup.props.crowdingStatus}`}>
                {crowdLabel[popup.props.crowdingStatus]} · {Math.round(popup.props.crowdLevel)}/100
              </span>
              <button
                className="maplibregl-popup-close-button map-popup-close-btn"
                type="button"
                aria-label="Chiudi"
                onClick={closePopup}
              >
                ×
              </button>
            </div>

            <h3>{popup.props.title}</h3>
            <p>{popup.props.description}</p>

            <dl>
              <div><dt>Categoria</dt><dd>{popup.props.category}</dd></div>
              {popup.props.dateTime && (
                <div><dt>Quando</dt><dd>{formatDateTime(popup.props.dateTime)}</dd></div>
              )}
            </dl>

            {popup.props.isCertified && (
              <span className="maplibre-certified-badge">Evento certificato</span>
            )}

            <div className="map-popup-actions">
              {popup.props.type === 'poi' && isLoggedIn && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setActivePoi({ id: popup!.props.sourceId, title: popup!.props.title });
                    setShowForm(true);
                    closePopup();
                  }}
                >
                  ➕ Crea attività qui
                </button>
              )}
              {canNavigate && (
                <button
                  className="detail-link"
                  type="button"
                  onClick={() => navigate(`/${popup!.props.type === 'event' ? 'eventi' : 'attivita'}/${popup!.props.id}`)}
                >
                  Apri dettaglio →
                </button>
              )}
            </div>

            {canNavigate && (
              <p className="map-popup-hint">
                {popup.locked
                  ? 'Clic sul marker per aprire · Clic altrove per chiudere'
                  : 'Clic per bloccare · Doppio clic per aprire'}
              </p>
            )}
          </article>
        </div>
      )}

      {/* ── Create-activity form panel ──────────────────────────────────── */}
      {activePoi && showForm && (
        <div className="map-create-activity-panel glass-card">
          <h3>Crea attività — {activePoi.title}</h3>
          <form onSubmit={handleCreateActivity}>
            <label>
              <span>Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              <span>Data</span>
              <input type="date" required value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            </label>
            <label>
              <span>Inizio</span>
              <input type="time" required value={form.orarioInizio} onChange={(e) => setForm((f) => ({ ...f, orarioInizio: e.target.value }))} />
            </label>
            <label>
              <span>Fine</span>
              <input type="time" required value={form.orarioFine} onChange={(e) => setForm((f) => ({ ...f, orarioFine: e.target.value }))} />
            </label>
            <label>
              <span>Max partecipanti (2–50)</span>
              <input
                type="number"
                min={2}
                max={50}
                required
                value={form.maxPartecipanti}
                onChange={(e) => setForm((f) => ({ ...f, maxPartecipanti: Number(e.target.value) }))}
              />
            </label>
            {formError && <p className="form-error">{formError}</p>}
            {formSuccess && <p className="form-success">{formSuccess}</p>}
            <div className="filter-actions">
              <button className="primary-button" type="submit" disabled={formLoading}>
                {formLoading ? '...' : 'Crea'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setActivePoi(null); }}>
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="map-3d-hud" aria-hidden="true">
        <strong>Vista 3D Trento</strong>
        <span>Trascina per muovere, ruota con bussola o tasto destro</span>
      </div>
      <button className="map-reset-view" type="button" onClick={resetView}>
        Reimposta vista
      </button>
      <div className="map-density-legend" aria-label="Scala affollamento">
        <span><i className="legend-green" />Basso</span>
        <span><i className="legend-yellow" />Medio</span>
        <span><i className="legend-orange" />Intenso</span>
        <span><i className="legend-red" />Molto alto</span>
      </div>
    </section>
  );
}
