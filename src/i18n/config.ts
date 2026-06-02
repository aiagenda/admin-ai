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
import enPricing from "../locales/en/pricing.json";
import enHelp from "../locales/en/help.json";
import huPricing from "../locales/hu/pricing.json";
import { isUsMarket } from "@/lib/market";

const usOnly = isUsMarket();

const initOptions = usOnly
  ? {
      resources: {
        en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal, pricing: enPricing, help: enHelp },
      },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en"] as const,
      ns: ["common", "nav", "translation", "legal", "pricing", "help"],
      defaultNS: "nav",
      interpolation: { escapeValue: false },
    }
  : {
      resources: {
        hu: { common: huCommon, nav: huNav, translation: huTranslation, legal: huLegal, pricing: huPricing },
        en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal, pricing: enPricing, help: enHelp },
      },
      fallbackLng: "hu",
      supportedLngs: ["hu", "en"] as const,
      ns: ["common", "nav", "translation", "legal", "pricing"],
      defaultNS: "nav",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "govletter_lang",
      },
    };

if (usOnly) {
  void i18n.use(initReactI18next).init(initOptions);
} else {
  void i18n.use(LanguageDetector).use(initReactI18next).init(initOptions);
}

export default i18n;
