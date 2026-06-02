import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import huCommon from "../locales/hu/common.json";
import huNav from "../locales/hu/nav.json";
import huTranslation from "../locales/hu/translation.json";
import enCommon from "../locales/en/common.json";
import enNav from "../locales/en/nav.json";
import enTranslation from "../locales/en/translation.json";
import huLegal from "../locales/hu/legal.json";
import enLegal from "../locales/en/legal.json";
import { isUsMarket } from "@/lib/market";

const usOnly = isUsMarket();

const initOptions = usOnly
  ? {
      resources: {
        en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal },
      },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en"] as const,
      ns: ["common", "nav", "translation", "legal"],
      defaultNS: "nav",
      interpolation: { escapeValue: false },
    }
  : {
      resources: {
        hu: { common: huCommon, nav: huNav, translation: huTranslation, legal: huLegal },
        en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal },
      },
      fallbackLng: "hu",
      supportedLngs: ["hu", "en"] as const,
      ns: ["common", "nav", "translation", "legal"],
      defaultNS: "nav",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "adminai_lang",
      },
    };

if (usOnly) {
  void i18n.use(initReactI18next).init(initOptions);
} else {
  void i18n.use(LanguageDetector).use(initReactI18next).init(initOptions);
}

export default i18n;
