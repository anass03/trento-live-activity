import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { CrowdingStatus, MapMarker, MarkerType } from '../../lib/api';

const TRENTO_CENTER: L.LatLngExpression = [46.0679, 11.1211];

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
  green: '#53e198',
  yellow: '#d1be58',
  orange: '#ee9144',
  red: '#df5e5e',
};

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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] || char));
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function popupContent(marker: MapMarker) {
  const { level, status } = normalizedCrowd(marker);
  const dateText = marker.type === 'event' ? formatDateTime(marker.dateTime) : '';
  const description = marker.description || 'Informazione disponibile sulla mappa cittadina.';

  return `
    <article class="leaflet-glass-popup-card">
      <div class="leaflet-popup-kicker">
        <span>${escapeHtml(typeLabel[marker.type])}</span>
        <span>${Math.round(level)}/100</span>
      </div>
      <h3>${escapeHtml(marker.title)}</h3>
      <p>${escapeHtml(description)}</p>
      <dl>
        <div><dt>Categoria</dt><dd>${escapeHtml(marker.category || typeLabel[marker.type])}</dd></div>
        <div><dt>Affollamento</dt><dd class="crowd-${status}">${escapeHtml(crowdLabel[status])}</dd></div>
        ${dateText ? `<div><dt>Quando</dt><dd>${escapeHtml(dateText)}</dd></div>` : ''}
      </dl>
      ${marker.isCertified ? '<span class="leaflet-certified-badge">Evento certificato</span>' : ''}
    </article>
  `;
}

function markerIcon(marker: MapMarker) {
  const { status, color } = normalizedCrowd(marker);
  return L.divIcon({
    className: 'map-pin-shell',
    html: `
      <span class="map-pin map-pin-${status}" style="--pin-color:${color}">
        <span class="map-pin-core"></span>
      </span>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const status: CrowdingStatus = count > 12 ? 'red' : count > 7 ? 'orange' : count > 3 ? 'yellow' : 'green';
  return L.divIcon({
    className: 'map-cluster-shell',
    html: `<span class="map-cluster map-cluster-${status}">${count}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

export function MapCanvas({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const glowLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterLayerRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: TRENTO_CENTER,
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    glowLayerRef.current = L.layerGroup().addTo(map);
    clusterLayerRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 44,
      iconCreateFunction: clusterIcon,
    }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      glowLayerRef.current = null;
      clusterLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const glowLayer = glowLayerRef.current;
    const clusterLayer = clusterLayerRef.current;
    if (!map || !glowLayer || !clusterLayer) return;

    glowLayer.clearLayers();
    clusterLayer.clearLayers();

    markers.forEach((marker) => {
      const latLng: L.LatLngExpression = [marker.latitude, marker.longitude];
      const { level, color, status } = normalizedCrowd(marker);
      const outerRadius = 115 + level * 3.6;
      const innerRadius = 54 + level * 1.65;

      L.circle(latLng, {
        radius: outerRadius,
        stroke: false,
        fillColor: color,
        fillOpacity: 0.08 + level / 900,
        interactive: false,
        className: `crowd-glow-path crowd-glow-${status}`,
      }).addTo(glowLayer);
      L.circle(latLng, {
        radius: innerRadius,
        stroke: false,
        fillColor: color,
        fillOpacity: 0.12 + level / 760,
        interactive: false,
        className: `crowd-glow-path crowd-glow-core crowd-glow-${status}`,
      }).addTo(glowLayer);

      const point = L.marker(latLng, {
        icon: markerIcon(marker),
        title: marker.title,
        keyboard: true,
      }).bindPopup(popupContent(marker), {
        className: 'map-popup',
        closeButton: true,
        maxWidth: 300,
        minWidth: 240,
      });

      clusterLayer.addLayer(point);
    });

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 15, { animate: true });
    } else if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 15, animate: true });
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  }, [markers]);

  async function handleCreateActivity(e: FormEvent) {
    e.preventDefault();
    if (!pinned) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await createActivity({ ...form, poiId: pinned.sourceId ?? undefined });
      setFormMsg({ ok: true, text: 'Attività creata!' });
      setShowForm(false);
      setForm(defaultForm());
    } catch (err) {
      setFormMsg({ ok: false, text: err instanceof Error ? err.message : 'Errore nella creazione.' });
    } finally {
      setSubmitting(false);
    }
  }

  const showNavigate = !showForm && displayed && detailPath(displayed);

  return (
    <section className="map-area glass-panel" aria-label="Map Zone" data-testid="map-zone">
      <div ref={containerRef} className="leaflet-map" />
      <div className="map-density-legend glass-card" aria-label="Scala affollamento">
        <span><i className="legend-green" />Basso</span>
        <span><i className="legend-yellow" />Medio</span>
        <span><i className="legend-orange" />Intenso</span>
        <span><i className="legend-red" />Molto alto</span>
      </div>
    </section>
  );
}
