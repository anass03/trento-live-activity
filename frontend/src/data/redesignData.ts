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
// Le categorie rispecchiano la tassonomia del backend (EVENT_CATEGORIES +
// ACTIVITY_TYPES): sport, cultura, musica, arte, gastronomia, studio, altro.
// Pillole inventate (cibo/outdoor/famiglia) facevano sembrare i filtri rotti
// perché nessun contenuto reale le usava.
export const CATEGORIES: any[] = [
    { id: "all",         labelKey: "categories.all",         color: C.cyan,    icon: "grid" },
    { id: "cultura",     labelKey: "categories.cultura",     color: C.violet,  icon: "landmark" },
    { id: "musica",      labelKey: "categories.musica",      color: C.magenta, icon: "music" },
    { id: "sport",       labelKey: "categories.sport",       color: C.green,   icon: "run" },
    { id: "arte",        labelKey: "categories.arte",        color: C.orange,  icon: "sparkle" },
    { id: "gastronomia", labelKey: "categories.gastronomia", color: C.amber,   icon: "food" },
    { id: "studio",      labelKey: "categories.studio",      color: C.teal,    icon: "bookmark" },
    { id: "altro",       labelKey: "categories.altro",       color: C.cyan,    icon: "layers" },
    { id: "poi",         labelKey: "categories.poi",         color: C.red,     icon: "pin" },
];
export const CAT_ICON: Record<string, string> = {
    musica: "music",
    cultura: "landmark",
    sport: "run",
    arte: "sparkle",
    gastronomia: "food",
    studio: "bookmark",
    altro: "layers",
    // alias legacy (vecchie pillole) per dati/codice non ancora migrati
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
