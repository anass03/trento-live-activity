import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Le traduzioni sono spezzate per area (vedi src/locales/{it,en}/) e fuse in
// un unico namespace "translation": ogni file possiede chiavi top-level
// distinte (es. account.json → "settings", "profile", "twofa"), così t() si
// usa ovunque senza prefissi di namespace.
import itCommon from "../locales/it/common.json";
import itAuth from "../locales/it/auth.json";
import itAccount from "../locales/it/account.json";
import itEvents from "../locales/it/events.json";
import itAdmin from "../locales/it/admin.json";
import enCommon from "../locales/en/common.json";
import enAuth from "../locales/en/auth.json";
import enAccount from "../locales/en/account.json";
import enEvents from "../locales/en/events.json";
import enAdmin from "../locales/en/admin.json";

// itCommon and itEvents both define an "activities" top-level key.
// A plain spread would let the later file win, losing the other's keys.
// Deep-merge "activities" so both sets of keys coexist.
const it = {
  ...itCommon, ...itAuth, ...itAccount, ...itEvents, ...itAdmin,
  activities: { ...(itCommon as any).activities, ...(itEvents as any).activities },
};
const en = {
  ...enCommon, ...enAuth, ...enAccount, ...enEvents, ...enAdmin,
  activities: { ...(enCommon as any).activities, ...(enEvents as any).activities },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "it",
    supportedLngs: ["it", "en"],
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "tla:lang",
      caches: ["localStorage"],
    },
  });

export default i18n;

export function setLanguage(lang: "it" | "en") {
  void i18n.changeLanguage(lang);
}

export function currentLanguage(): "it" | "en" {
  return i18n.language?.startsWith("en") ? "en" : "it";
}
