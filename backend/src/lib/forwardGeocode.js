// Forward geocoding (address → coordinates), server-side.
//
// Primary provider: Google Maps Geocoding API when MAPS_API_KEY is configured.
// Fallback: OpenStreetMap Nominatim (free, no key) — also used as the default in
// local/dev where no Google key is set. Results are cached in-process so repeated
// lookups (e.g. re-running the POI seed) don't hit the network twice.

const logger = require('./logger');

const cache = new Map();
let lastNominatimMs = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function viaGoogle(address, key) {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json'
    + `?address=${encodeURIComponent(address)}&key=${key}&region=it&language=it`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    logger.warn('geocode_google_no_result', { address, status: data.status });
    return null;
  }
  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formatted: r.formatted_address,
    provider: 'google',
  };
}

async function viaNominatim(address) {
  // Respect Nominatim's 1 req/s usage policy.
  const wait = 1100 - (Date.now() - lastNominatimMs);
  if (wait > 0) await sleep(wait);
  lastNominatimMs = Date.now();

  const url = 'https://nominatim.openstreetmap.org/search'
    + `?format=json&limit=1&accept-language=it&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TrentoLiveActivity/1.0 (university project)', 'Accept-Language': 'it' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    formatted: data[0].display_name,
    provider: 'nominatim',
  };
}

/**
 * Geocode a free-form address. Returns { lat, lng, formatted, provider } or null.
 * Google is tried first when a key is present, Nominatim is the fallback.
 */
async function forwardGeocode(address) {
  if (!address || typeof address !== 'string') return null;
  const key = address.trim();
  if (cache.has(key)) return cache.get(key);

  const apiKey = process.env.MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  let result = null;
  try {
    if (apiKey) result = await viaGoogle(key, apiKey);
    if (!result) result = await viaNominatim(key);
  } catch (e) {
    logger.warn('geocode_failed', { address: key, err: e.message });
    result = null;
  }

  if (result) cache.set(key, result);
  return result;
}

module.exports = { forwardGeocode };
