// Parking occupancy proxy (RF: affollamento parcheggi auto/bici).
//
// The Comune di Trento publishes a live registry as JSON. Calling it directly
// from the browser is blocked by CORS, so we fetch it here, normalise it to the
// app's vocabulary (verde/giallo/rosso like the POI crowding states) and cache
// it for a short window to avoid hammering the upstream on every page load.

const logger = require('../lib/logger');

const SOURCE_URL = 'https://parcheggi.comune.trento.it/static/services/registry_parks.json';
const CACHE_TTL_MS = 60 * 1000; // 1 minute — upstream refreshes roughly this often
const FETCH_TIMEOUT_MS = 10_000;

let cache = { at: 0, data: null };

// "POINT(11.113621 46.0702)" → { lat: 46.0702, lng: 11.113621 }
function parseGeom(geom) {
  if (typeof geom !== 'string') return { lat: null, lng: null };
  const m = geom.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return { lat: null, lng: null };
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

// Same traffic-light scale as POI.statoAffollamento for a consistent UI.
function statusFromOccupancy(pct) {
  if (pct == null) return 'verde';
  if (pct < 70) return 'verde';
  if (pct < 90) return 'giallo';
  return 'rosso';
}

function normalize(item) {
  const { lat, lng } = parseGeom(item.geom);
  const capacity = Number(item.capacity) || 0;
  const free = item.freeslots != null ? Number(item.freeslots) : null;
  const occupied = item.busy != null
    ? Number(item.busy)
    : (capacity && free != null ? capacity - free : null);
  const occupancyPct = capacity > 0 && occupied != null
    ? Math.max(0, Math.min(100, Math.round((occupied / capacity) * 100)))
    : null;

  return {
    id: String(item.id),
    name: item.name,
    type: item.type === 'bike' ? 'bike' : 'car',
    capacity,
    free,
    occupied,
    occupancyPct,
    status: statusFromOccupancy(occupancyPct),
    latitude: lat,
    longitude: lng,
    address: item.address || null,
    description: item.description || null,
    link: item.link || null,
    updatedAt: item.updated_at_tm || item.timestamp_tm || null,
  };
}

function publicStatusFromOccupancy(pct) {
  if (pct == null) return 'unknown';
  if (pct >= 98) return 'full';
  if (pct >= 85) return 'almost_full';
  return 'available';
}

function toPublicItem(parking) {
  return {
    id: `parking_trento_${parking.id}`,
    name: parking.name,
    address: parking.address || parking.description || null,
    area: parking.address || parking.description || null,
    latitude: parking.latitude,
    longitude: parking.longitude,
    availableSpaces: parking.free,
    totalSpaces: parking.capacity,
    occupancyPercentage: parking.occupancyPct,
    status: publicStatusFromOccupancy(parking.occupancyPct),
    lastUpdatedAt: parking.updatedAt,
    sourceLabel: 'Comune di Trento parking registry',
    type: parking.type,
    link: parking.link,
  };
}

async function fetchUpstream() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(SOURCE_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getParking() {
  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  let res;
  try {
    res = await fetchUpstream();
  } catch (e) {
    logger.error('parking_fetch_failed', { err: e.message });
    if (cache.data) return cache.data; // serve stale rather than failing
    throw { status: 502, code: 'PARKING_UPSTREAM_UNAVAILABLE', error: 'Dati parcheggi non disponibili al momento.' };
  }

  if (!res.ok) {
    logger.error('parking_fetch_status', { status: res.status });
    if (cache.data) return cache.data;
    throw { status: 502, code: 'PARKING_UPSTREAM_ERROR', error: 'Dati parcheggi non disponibili al momento.' };
  }

  let raw;
  try {
    raw = await res.json();
  } catch (e) {
    logger.error('parking_parse_failed', { err: e.message });
    if (cache.data) return cache.data;
    throw { status: 502, code: 'PARKING_UPSTREAM_MALFORMED', error: 'Dati parcheggi non leggibili.' };
  }

  const list = Array.isArray(raw) ? raw : [];
  const parkings = list.map(normalize).filter((p) => p.name);
  // Cars first, then bikes; alphabetical within each group.
  parkings.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'car' ? -1 : 1));

  const fetchedAt = new Date().toISOString();
  cache = {
    at: Date.now(),
    data: {
      city: 'Trento',
      source: {
        name: 'Comune di Trento parking registry',
        url: SOURCE_URL,
        scrapedAt: fetchedAt,
      },
      items: parkings.map(toPublicItem),
      parkings,
      fetchedAt,
    }
  };
  logger.info('parking_refreshed', { count: parkings.length });
  return cache.data;
}

module.exports = { getParking, _normalize: normalize, _parseGeom: parseGeom, _toPublicItem: toPublicItem };
