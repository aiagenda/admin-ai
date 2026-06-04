import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enNav from "../locales/en/nav.json";
import enTranslation from "../locales/en/translation.json";
import enLegal from "../locales/en/legal.json";
import enPricing from "../locales/en/pricing.json";
import enHelp from "../locales/en/help.json";

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, nav: enNav, translation: enTranslation, legal: enLegal, pricing: enPricing, help: enHelp },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en"] as const,
  ns: ["common", "nav", "translation", "legal", "pricing", "help"],
  defaultNS: "nav",
  interpolation: { escapeValue: false },
});

export default i18n;
