/* ===========================================================
   Trento Live Activity — data
   Shared data module
   =========================================================== */
// category color tokens (match styles.css)
export const C = {
    cyan: "#38bdf8", teal: "#2dd4bf", violet: "#a78bfa",
    magenta: "#f472b6", green: "#34d399", amber: "#fbbf24",
    orange: "#fb923c", red: "#f87171",
};

export const CATEGORIES: any[] = [
    { id: "all",      label: "Tutti",        color: C.cyan,    icon: "grid" },
    { id: "cultura",  label: "Cultura",      color: C.violet,  icon: "landmark" },
    { id: "musica",   label: "Musica",       color: C.magenta, icon: "music" },
    { id: "sport",    label: "Sport",        color: C.green,   icon: "run" },
    { id: "cibo",     label: "Cibo & Drink", color: C.amber,   icon: "food" },
    { id: "outdoor",  label: "Outdoor",      color: C.teal,    icon: "bike" },
    { id: "famiglia", label: "Famiglia",     color: C.cyan,    icon: "family" },
];
export const catColor = (id: string) => (CATEGORIES.find((c) => c.id === id) || {}).color || C.cyan;
export const catLabel = (id: string) => (CATEGORIES.find((c) => c.id === id) || {}).label || "";

  // Activity markers — x/y are % within the map (left%, top%)
export const MARKERS: any[] = [
    { id: "m1",  cat: "musica",   x: 49, y: 50, live: true,  title: "Concerto in Piazza", place: "Piazza Duomo",                time: "21:00" },
    { id: "m2",  cat: "cultura",  x: 63, y: 31, live: true,  title: "Visita guidata al Castello", place: "Castello del Buonconsiglio", time: "15:30" },
    { id: "m3",  cat: "cultura",  x: 33, y: 67, live: false, title: "Mostra: Universo MUSE", place: "MUSE",                       time: "10:00" },
    { id: "m4",  cat: "cibo",     x: 46, y: 44, live: true,  title: "Aperitivo sotto le stelle", place: "Via Belenzani",          time: "18:30" },
    { id: "m5",  cat: "sport",    x: 30, y: 60, live: false, title: "Corsa al parco", place: "Parco delle Albere",                time: "07:30" },
    { id: "m6",  cat: "famiglia", x: 55, y: 58, live: false, title: "Mercato di quartiere", place: "Piazza Fiera",                time: "09:00" },
    { id: "m7",  cat: "outdoor",  x: 24, y: 42, live: false, title: "Bici lungo l'Adige", place: "Lungadige Leopardi",            time: "16:00" },
    { id: "m8",  cat: "cibo",     x: 52, y: 40, live: true,  title: "Street food festival", place: "Via Manci",                   time: "12:00" },
    { id: "m9",  cat: "musica",   x: 58, y: 47, live: false, title: "Jazz dal vivo", place: "Teatro Sociale",                     time: "22:00" },
    { id: "m10", cat: "sport",    x: 41, y: 72, live: false, title: "Yoga al tramonto", place: "Parco Gocciadoro",                time: "19:00" },
    { id: "m11", cat: "famiglia", x: 50, y: 34, live: false, title: "Laboratorio per bambini", place: "Biblioteca Comunale",      time: "16:30" },
    { id: "m12", cat: "outdoor",  x: 71, y: 24, live: false, title: "Trekking urbano", place: "Doss Trento",                      time: "08:00" },
    { id: "m13", cat: "cultura",  x: 44, y: 55, live: false, title: "Mostra fotografica", place: "Le Gallerie",                   time: "11:00" },
    { id: "m14", cat: "musica",   x: 53, y: 64, live: true,  title: "DJ set urbano", place: "Piazza Fiera",                       time: "23:00" },
    { id: "m15", cat: "famiglia", x: 36, y: 54, live: false, title: "Picnic in famiglia", place: "Parco delle Albere",           time: "12:30" },
    { id: "m16", cat: "cibo",     x: 60, y: 56, live: false, title: "Degustazione vini", place: "Palazzo Roccabruna",            time: "17:30" },
];

  // Map place labels
export const PLACES: any[] = [
    { name: "TRENTO",                       x: 50, y: 9,  major: true },
    { name: "Piazza Duomo",                 x: 49, y: 53 },
    { name: "Castello del Buonconsiglio",   x: 63, y: 28 },
    { name: "MUSE",                         x: 33, y: 70 },
    { name: "Via Belenzani",                x: 45, y: 41 },
    { name: "Parco delle Albere",           x: 28, y: 57 },
    { name: "Doss Trento",                  x: 73, y: 21 },
    { name: "Fiume Adige",                  x: 15, y: 50, river: true },
];

export const WEATHER = {
    loc: "Trento, IT",
    temp: 22,
    cond: "Parzialmente sereno",
    high: 24, low: 13,
    rain: 30, wind: 12, humidity: 54,
    hourly: [
      { h: "15", t: 22, p: 0.66 },
      { h: "16", t: 23, p: 0.78 },
      { h: "17", t: 23, p: 0.78 },
      { h: "18", t: 22, p: 0.66 },
      { h: "19", t: 21, p: 0.55 },
      { h: "20", t: 19, p: 0.42 },
    ],
};

export const ALERTS: any[] = [
    { id: "a1", sev: "red",   color: C.red,   icon: "cone",    title: "Lavori in Via Manci", desc: "Carreggiata ridotta fino alle 20:00", tag: "Urgente" },
    { id: "a2", sev: "amber", color: C.amber, icon: "calendar",title: "Evento in Piazza Duomo", desc: "Viabilità modificata dalle 20:30", tag: "Medio" },
    { id: "a3", sev: "blue",  color: C.cyan,  icon: "cloud",   title: "Allerta meteo gialla", desc: "Possibili rovesci in serata", tag: "Info" },
    { id: "a4", sev: "green", color: C.green, icon: "bus",     title: "Linea 5 ripristinata", desc: "Servizio tornato regolare", tag: "Risolto" },
    { id: "a5", sev: "amber", color: C.amber, icon: "cone",    title: "Senso unico in Via Roma", desc: "Deviazione consigliata in centro", tag: "Medio" },
    { id: "a6", sev: "blue",  color: C.cyan,  icon: "bus",     title: "Navetta gratuita centro", desc: "In servizio ogni 15 minuti", tag: "Info" },
    { id: "a7", sev: "red",   color: C.red,   icon: "warn",    title: "Limitazioni al traffico", desc: "Targhe alterne dalle 08:00", tag: "Urgente" },
    { id: "a8", sev: "green", color: C.green, icon: "calendar",title: "Mercato in Piazza Fiera", desc: "Banchi attivi fino alle 14:00", tag: "Attivo" },
];

export const PARKING = {
    avg: 62,
    list: [
      { name: "Trento Centro", free: 128, total: 350 },
      { name: "Piazza Fiera",  free: 72,  total: 200 },
      { name: "Ex Zuffo",      free: 45,  total: 120 },
      { name: "Salè",          free: 18,  total: 80  },
      { name: "Autosilo Buonconsiglio", free: 95, total: 220 },
      { name: "Piazza Venezia", free: 30,  total: 90  },
      { name: "Monte Baldo",    free: 64,  total: 140 },
    ],
};

export const AREAS: any[] = [
    { name: "Piazza Duomo",              cat: "musica",  level: 0.94, label: "Molto attiva", color: C.magenta },
    { name: "Via Belenzani",             cat: "cibo",    level: 0.78, label: "Attiva",       color: C.orange },
    { name: "Castello del Buonconsiglio",cat: "cultura", level: 0.62, label: "Attiva",       color: C.amber },
    { name: "MUSE",                      cat: "cultura", level: 0.45, label: "Moderata",     color: C.amber },
    { name: "Parco delle Albere",        cat: "outdoor", level: 0.28, label: "Tranquilla",   color: C.teal },
    { name: "Piazza Fiera",              cat: "musica",  level: 0.58, label: "Attiva",       color: C.orange },
    { name: "Via Roma",                  cat: "cibo",    level: 0.40, label: "Moderata",     color: C.amber },
    { name: "Lungadige",                 cat: "outdoor", level: 0.20, label: "Tranquilla",   color: C.teal },
];

export const EVENTS: any[] = [
    { id: "e1", cat: "cultura",  date: "Oggi", start: "15:30", end: "16:30", going: 14,  cap: 22,  title: "Visita guidata al Castello", place: "Castello del Buonconsiglio", img: "linear-gradient(135deg,#7c3aed,#4c1d95)" },
    { id: "e2", cat: "musica",   date: "Oggi", start: "17:00", end: "19:00", going: 86,  cap: 120, title: "Musica dal vivo in Piazza",  place: "Piazza Duomo",               img: "linear-gradient(135deg,#db2777,#831843)" },
    { id: "e3", cat: "cibo",     date: "Oggi", start: "18:30", end: "20:30", going: 9,   cap: 30,  title: "Aperitivo sotto le stelle",  place: "Via Belenzani",              img: "linear-gradient(135deg,#d97706,#7c2d12)" },
    { id: "e4", cat: "cultura",  date: "Oggi", start: "21:00", end: "23:00", going: 140, cap: 200, title: "Trento Film Festival",       place: "Teatro Sociale",             img: "linear-gradient(135deg,#0891b2,#0c4a6e)" },
    { id: "e5", cat: "sport",    date: "Oggi", start: "07:30", end: "08:30", going: 22,  cap: 40,  title: "Corsa mattutina al parco",   place: "Parco Gocciadoro",           img: "linear-gradient(135deg,#059669,#064e3b)" },
    { id: "e6", cat: "famiglia", date: "Oggi", start: "16:30", end: "17:30", going: 12,  cap: 20,  title: "Laboratorio per bambini",    place: "Biblioteca Comunale",        img: "linear-gradient(135deg,#0ea5e9,#075985)" },
    { id: "e7", cat: "outdoor",  date: "Oggi", start: "09:00", end: "12:00", going: 18,  cap: 25,  title: "Trekking al Doss Trento",    place: "Doss Trento",                img: "linear-gradient(135deg,#0d9488,#134e4a)" },
];

// enrich markers with participants + date for the event popup
const _cap = [12, 18, 22, 30, 40, 16, 25];
const _ratio = [0.35, 0.62, 0.88, 0.45, 0.7, 0.25, 0.95];
MARKERS.forEach((m, i) => {
    m.cap = _cap[i % _cap.length];
    m.going = Math.max(1, Math.round(m.cap * _ratio[i % _ratio.length]));
    m.date = "Oggi";
  });
