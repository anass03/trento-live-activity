const SOURCE = {
  name: 'Comune di Trento - normalized civic alerts',
  url: 'https://www.comune.trento.it/',
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };

const ALERTS = [
  {
    id: 'alert_traffic_manci',
    title: 'Lavori in Via Manci',
    summary: 'Carreggiata ridotta e possibili rallentamenti fino alla sera.',
    description: 'Intervento programmato sulla sede stradale in Via Manci. Sono possibili rallentamenti, deviazioni locali e temporanee limitazioni di sosta nelle aree adiacenti.',
    severity: 'high',
    category: 'traffic',
    source: SOURCE,
    location: { label: 'Via Manci, Trento', latitude: 46.0709, longitude: 11.1235 },
    publishedAt: '2026-06-09T08:00:00+02:00',
    updatedAt: '2026-06-09T10:30:00+02:00',
  },
  {
    id: 'alert_event_duomo',
    title: 'Evento in Piazza Duomo',
    summary: "Viabilita modificata nell'area centrale dalle 20:30.",
    description: 'Per un evento pubblico in Piazza Duomo sono previste modifiche temporanee alla viabilita pedonale e veicolare. Si consiglia di raggiungere il centro a piedi o con trasporto pubblico.',
    severity: 'medium',
    category: 'event',
    source: SOURCE,
    location: { label: 'Piazza Duomo, Trento', latitude: 46.0677, longitude: 11.1215 },
    publishedAt: '2026-06-09T12:00:00+02:00',
    updatedAt: '2026-06-09T12:45:00+02:00',
  },
  {
    id: 'alert_weather_yellow',
    title: 'Allerta meteo gialla',
    summary: 'Possibili rovesci e vento moderato in serata.',
    description: "Scenario meteo variabile con possibilita di rovesci localizzati. Prestare attenzione nelle aree verdi, sui percorsi ciclabili e durante eventi all'aperto.",
    severity: 'low',
    category: 'weather',
    source: { name: 'Open-Meteo forecast context', url: 'https://open-meteo.com/' },
    location: { label: 'Trento', latitude: 46.0679, longitude: 11.1211 },
    publishedAt: '2026-06-09T15:00:00+02:00',
    updatedAt: '2026-06-09T16:00:00+02:00',
  },
  {
    id: 'alert_bus_line_5',
    title: 'Linea 5 ripristinata',
    summary: 'Servizio tornato regolare dopo una breve interruzione.',
    description: 'La linea urbana 5 e tornata al normale percorso. Le paline potrebbero mostrare ritardi residui durante il riallineamento del servizio.',
    severity: 'info',
    category: 'transport',
    source: SOURCE,
    location: null,
    publishedAt: '2026-06-09T09:20:00+02:00',
    updatedAt: '2026-06-09T09:45:00+02:00',
  },
];

const severityRank = { high: 4, medium: 3, low: 2, info: 1 };

function summarize(alert) {
  return {
    id: alert.id,
    title: alert.title,
    summary: alert.summary,
    severity: alert.severity,
    category: alert.category,
    sourceName: alert.source.name,
    publishedAt: alert.publishedAt,
    updatedAt: alert.updatedAt,
    hasLocation: !!alert.location,
  };
}

function buildSnapshot() {
  const scrapedAt = new Date().toISOString();
  const items = ALERTS
    .slice()
    .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
    .map((alert) => ({ ...alert, source: { ...alert.source } }));

  return {
    city: 'Trento',
    source: { ...SOURCE, scrapedAt },
    items: items.map(summarize),
    details: items,
  };
}

async function listTrentoAlerts() {
  if (!cache.data || Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), data: buildSnapshot() };
  }
  return {
    city: cache.data.city,
    source: cache.data.source,
    items: cache.data.items,
  };
}

async function getAlert(alertId) {
  if (!cache.data || Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), data: buildSnapshot() };
  }
  const alert = cache.data.details.find((item) => item.id === alertId);
  if (!alert) {
    throw { status: 404, code: 'NOT_FOUND', error: 'Alert not found' };
  }
  return alert;
}

module.exports = { listTrentoAlerts, getAlert, _summarize: summarize };
