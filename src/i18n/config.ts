import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../locales/en/common.json";
import enNav from "../locales/en/nav.json";
import enTranslation from "../locales/en/translation.json";
import enLegal from "../locales/en/legal.json";
import enPricing from "../locales/en/pricing.json";
import enHelp from "../locales/en/help.json";

import esCommon from "../locales/es/common.json";
import esNav from "../locales/es/nav.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal, pricing: enPricing, help: enHelp },
      // Spanish: core UI is translated; anything missing falls back to English.
      es: { common: esCommon, nav: esNav },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es"] as const,
    // Treat only the base language as the locale: en-US -> en, es-MX -> es.
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    ns: ["common", "nav", "translation", "legal", "pricing", "help"],
    defaultNS: "nav",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "govletter_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
