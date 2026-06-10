const logger = require('../lib/logger');

const TRENTO = {
  city: 'Trento',
  latitude: 46.0679,
  longitude: 11.1211,
  timezone: 'Europe/Rome',
};

const SOURCE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

let cache = { at: 0, data: null };

const WEATHER_LABELS = {
  0: 'Sereno',
  1: 'Prevalentemente sereno',
  2: 'Parzialmente nuvoloso',
  3: 'Nuvoloso',
  45: 'Nebbia',
  48: 'Nebbia con brina',
  51: 'Pioviggine leggera',
  53: 'Pioviggine',
  55: 'Pioviggine intensa',
  61: 'Pioggia leggera',
  63: 'Pioggia',
  65: 'Pioggia intensa',
  71: 'Neve leggera',
  73: 'Neve',
  75: 'Neve intensa',
  80: 'Rovesci leggeri',
  81: 'Rovesci',
  82: 'Rovesci intensi',
  95: 'Temporale',
  96: 'Temporale con grandine',
  99: 'Temporale forte con grandine',
};

function condition(code) {
  return WEATHER_LABELS[Number(code)] || 'Condizioni variabili';
}

function buildUrl() {
  const qs = new URLSearchParams({
    latitude: String(TRENTO.latitude),
    longitude: String(TRENTO.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
    ].join(','),
    timezone: TRENTO.timezone,
    forecast_days: '3',
    forecast_hours: '12',
  });
  return `${SOURCE_URL}?${qs.toString()}`;
}

function fallbackWeather(reason) {
  const fetchedAt = new Date().toISOString();
  return {
    city: TRENTO.city,
    latitude: TRENTO.latitude,
    longitude: TRENTO.longitude,
    source: {
      name: 'Open-Meteo',
      url: 'https://open-meteo.com/',
      fetchedAt,
    },
    current: {
      temperature: null,
      apparentTemperature: null,
      humidity: null,
      condition: 'Dati meteo temporaneamente non disponibili',
      weatherCode: null,
      cloudCover: null,
      precipitation: null,
      rain: null,
      showers: null,
      windSpeed: null,
      windDirection: null,
      windGusts: null,
      isDay: true,
      time: fetchedAt,
    },
    daily: [],
    hourly: [],
    unavailable: true,
    fallbackReason: reason,
  };
}

function normalize(raw) {
  const fetchedAt = new Date().toISOString();
  const current = raw.current || {};
  const hourly = raw.hourly || {};
  const daily = raw.daily || {};

  const hourlyRows = Array.isArray(hourly.time) ? hourly.time.slice(0, 12).map((time, index) => ({
    time,
    temperature: hourly.temperature_2m?.[index] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    weatherCode: hourly.weather_code?.[index] ?? null,
    condition: condition(hourly.weather_code?.[index]),
    windSpeed: hourly.wind_speed_10m?.[index] ?? null,
  })) : [];

  const dailyRows = Array.isArray(daily.time) ? daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code?.[index] ?? null,
    condition: condition(daily.weather_code?.[index]),
    temperatureMax: daily.temperature_2m_max?.[index] ?? null,
    temperatureMin: daily.temperature_2m_min?.[index] ?? null,
    precipitationProbabilityMax: daily.precipitation_probability_max?.[index] ?? null,
    sunrise: daily.sunrise?.[index] ?? null,
    sunset: daily.sunset?.[index] ?? null,
  })) : [];

  return {
    city: TRENTO.city,
    latitude: raw.latitude ?? TRENTO.latitude,
    longitude: raw.longitude ?? TRENTO.longitude,
    timezone: raw.timezone || TRENTO.timezone,
    source: {
      name: 'Open-Meteo',
      url: buildUrl(),
      fetchedAt,
    },
    current: {
      temperature: current.temperature_2m ?? null,
      apparentTemperature: current.apparent_temperature ?? null,
      humidity: current.relative_humidity_2m ?? null,
      condition: condition(current.weather_code),
      weatherCode: current.weather_code ?? null,
      cloudCover: current.cloud_cover ?? null,
      precipitation: current.precipitation ?? null,
      rain: current.rain ?? null,
      showers: current.showers ?? null,
      windSpeed: current.wind_speed_10m ?? null,
      windDirection: current.wind_direction_10m ?? null,
      windGusts: current.wind_gusts_10m ?? null,
      isDay: current.is_day === 1,
      time: current.time || fetchedAt,
    },
    daily: dailyRows,
    hourly: hourlyRows,
    unavailable: false,
  };
}

async function fetchWeather() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Open-Meteo responded ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getTrentoWeather() {
  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const raw = await fetchWeather();
    cache = { at: Date.now(), data: normalize(raw) };
    return cache.data;
  } catch (error) {
    logger.error('weather_fetch_failed', { err: error.message });
    if (cache.data) return { ...cache.data, stale: true };
    return fallbackWeather(error.message);
  }
}

module.exports = { getTrentoWeather, _normalize: normalize, _condition: condition };
