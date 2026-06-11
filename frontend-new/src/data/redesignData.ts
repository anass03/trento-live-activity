/* ===========================================================
   Trento Live Activity — data
   Shared data module
   =========================================================== */
import i18n from "../lib/i18n";

// category color tokens (match styles.css)
export const C = {
    cyan: "#38bdf8", teal: "#2dd4bf", violet: "#a78bfa",
    magenta: "#f472b6", green: "#34d399", amber: "#fbbf24",
    orange: "#fb923c", red: "#f87171",
};

// Le etichette sono chiavi i18n ("categories.*" in locales/{it,en}/common.json):
// i componenti React le traducono con t(c.labelKey); per i moduli non-React
// resta catLabel(), che traduce al volo con la lingua corrente.
export const CATEGORIES: any[] = [
    { id: "all",      labelKey: "categories.all",      color: C.cyan,    icon: "grid" },
    { id: "cultura",  labelKey: "categories.cultura",  color: C.violet,  icon: "landmark" },
    { id: "musica",   labelKey: "categories.musica",   color: C.magenta, icon: "music" },
    { id: "sport",    labelKey: "categories.sport",    color: C.green,   icon: "run" },
    { id: "cibo",     labelKey: "categories.cibo",     color: C.amber,   icon: "food" },
    { id: "outdoor",  labelKey: "categories.outdoor",  color: C.teal,    icon: "bike" },
    { id: "famiglia", labelKey: "categories.famiglia", color: C.cyan,    icon: "family" },
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
export const catLabelKey = (id: string) => (CATEGORIES.find((c) => c.id === id) || {}).labelKey || "";
// Traduzione runtime nella lingua corrente (per codice non-React, es. popup mappa).
export const catLabel = (id: string) => {
    const key = catLabelKey(id);
    return key ? i18n.t(key) : "";
};

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
