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
export const CAT_ICON: Record<string, string> = {
    musica: "music",
    cultura: "landmark",
    sport: "run",
    cibo: "food",
    outdoor: "bike",
    famiglia: "family",
};
export const catColor = (id: string) => (CATEGORIES.find((c) => c.id === id) || {}).color || C.cyan;
export const catLabel = (id: string) => (CATEGORIES.find((c) => c.id === id) || {}).label || "";

export const MARKERS: any[] = [];

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

export const WEATHER = null;
export const ALERTS: any[] = [];
export const PARKING = { avg: 0, list: [] };
export const AREAS: any[] = [];
export const EVENTS: any[] = [];
