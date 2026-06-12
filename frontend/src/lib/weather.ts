// Open-Meteo: API gratuita senza chiave per dati meteo correnti.
// Doc WMO weather_code: https://open-meteo.com/en/docs

export type WeatherMood = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';

export interface WeatherSnapshot {
  mood: WeatherMood;
  temperature: number;
  windKmh: number;
  fetchedAt: number;
}

const CACHE_KEY = 'tla:weather:trento';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minuti

// Mappa WMO weather_code → mood UI.
function moodFromCode(code: number): WeatherMood {
  if (code === 0) return 'sunny';
  if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  if ([95, 96, 99].includes(code)) return 'stormy';
  return 'cloudy';
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
  // Cache locale per evitare di interrogare l'API ad ogni navigazione.
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: WeatherSnapshot = JSON.parse(raw);
      if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;
    }
  } catch { /* cache best-effort */ }

  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=46.0679&longitude=11.1211' +
    '&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FRome';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Open-Meteo non disponibile');
  const json = await resp.json();
  const current = json.current ?? {};
  const snapshot: WeatherSnapshot = {
    mood: moodFromCode(Number(current.weather_code ?? 3)),
    temperature: Math.round(Number(current.temperature_2m ?? 0)),
    windKmh: Number(current.wind_speed_10m ?? 0),
    fetchedAt: Date.now(),
  };
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* ignore */ }
  return snapshot;
}
