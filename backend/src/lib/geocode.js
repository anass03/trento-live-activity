// Server-side reverse geocoding via Nominatim.
// Advantages over client-side: proper User-Agent header, controlled rate limiting,
// result stored in DB so the frontend never needs to call Nominatim at all.

const cache = new Map();
let lastCallMs = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reverse-geocode (lat, lon) → human-readable address string, or null on failure.
 * Respects Nominatim's 1 req/s policy via a simple last-call timestamp.
 */
async function reverseGeocode(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
  if (cache.has(key)) return cache.get(key);

  // Throttle: wait until at least 1.1 s have passed since the last request.
  const wait = 1100 - (Date.now() - lastCallMs);
  if (wait > 0) await sleep(wait);
  lastCallMs = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18&accept-language=it`;
    const res = await fetch(url, {
      headers: {
        // Node.js (unlike browsers) can set User-Agent — required by Nominatim policy.
        'User-Agent': 'TrentoLiveActivity/1.0 (university project)',
        'Accept-Language': 'it',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const addr = data.address ?? {};
    const road = addr.road || addr.pedestrian || addr.footway || addr.path
      || addr.neighbourhood || addr.quarter || addr.suburb || '';
    const num = addr.house_number ? ` ${addr.house_number}` : '';
    const place = addr.village || addr.town || addr.city || addr.municipality
      || addr.county || addr.state || '';
    const result = road ? `${road}${num}` : (place || null);

    if (result) cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

module.exports = { reverseGeocode };
