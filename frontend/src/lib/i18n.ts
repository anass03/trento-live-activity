import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import it from '../locales/it.json';
import en from '../locales/en.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'it',
    supportedLngs: ['it', 'en'],
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'tla:lang',
      caches: ['localStorage'],
    },
  });

export default i18n;

export function setLanguage(lang: 'it' | 'en') {
  void i18n.changeLanguage(lang);
}
