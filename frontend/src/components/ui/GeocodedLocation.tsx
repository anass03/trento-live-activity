import { useEffect, useState } from 'react';

// Matches "46.0664, 11.1216" style strings produced by locationFor() on the backend
const COORD_RE = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

const geocodeCache = new Map<string, string>();

// Client-side geocoding proxied through our backend (proper User-Agent, shared cache).
// Only used for the live map picker — all stored data is pre-geocoded server-side.
export async function reverseGeocode(coordStr: string): Promise<string> {
  if (geocodeCache.has(coordStr)) return geocodeCache.get(coordStr)!;
  const [lat, lon] = coordStr.split(',').map((s) => s.trim());
  const res = await fetch(`/api/map/geocode?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`geocode HTTP ${res.status}`);
  const data = await res.json();
  const result: string = data.address || coordStr;
  geocodeCache.set(coordStr, result);
  return result;
}

interface Props {
  value: string | null | undefined;
  fallback?: string;
}

export function GeocodedLocation({ value, fallback = 'Non specificato' }: Props) {
  const [display, setDisplay] = useState<string>(() => {
    if (!value) return fallback;
    if (geocodeCache.has(value)) return geocodeCache.get(value)!;
    return COORD_RE.test(value) ? '…' : value;
  });

  useEffect(() => {
    if (!value || !COORD_RE.test(value)) {
      setDisplay(value || fallback);
      return;
    }
    if (geocodeCache.has(value)) {
      setDisplay(geocodeCache.get(value)!);
      return;
    }
    let cancelled = false;
    reverseGeocode(value)
      .then((name) => { if (!cancelled) setDisplay(name); })
      .catch(() => { if (!cancelled) setDisplay(value); });
    return () => { cancelled = true; };
  }, [value, fallback]);

  return <span>{display}</span>;
}
