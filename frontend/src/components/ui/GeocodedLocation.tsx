import { useEffect, useState } from "react";
import { reverseGeocode } from "../../lib/api";

// Matches "46.0664, 11.1216" strings produced by the backend's locationFor()
const COORD_RE = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

const geocodeCache = new Map<string, string>();

async function geocodeCoordString(coordStr: string): Promise<string> {
  if (geocodeCache.has(coordStr)) return geocodeCache.get(coordStr)!;
  const [latStr, lonStr] = coordStr.split(",").map((s) => s.trim());
  const { address } = await reverseGeocode(parseFloat(latStr), parseFloat(lonStr));
  const result = address || coordStr;
  geocodeCache.set(coordStr, result);
  return result;
}

interface Props {
  value: string | null | undefined;
  fallback?: string;
}

export function GeocodedLocation({ value, fallback = "Non specificato" }: Props) {
  const [display, setDisplay] = useState<string>(() => {
    if (!value) return fallback;
    if (geocodeCache.has(value)) return geocodeCache.get(value)!;
    return COORD_RE.test(value) ? "…" : value;
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
    geocodeCoordString(value)
      .then((name) => { if (!cancelled) setDisplay(name); })
      .catch(() => { if (!cancelled) setDisplay(value); });
    return () => { cancelled = true; };
  }, [value, fallback]);

  return <span>{display}</span>;
}
