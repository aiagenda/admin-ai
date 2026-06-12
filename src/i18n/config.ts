import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import enNav from "../locales/en/nav.json";
import enTranslation from "../locales/en/translation.json";
import enLegal from "../locales/en/legal.json";
import enPricing from "../locales/en/pricing.json";
import enHelp from "../locales/en/help.json";

// Spanish is fully built (locales/es/*, AI output, switcher) but HIDDEN for the
// English-only launch. To re-enable: import the es JSON below, add them back to
// `resources` as `es`, set supportedLngs to ["en", "es"], re-add the
// LanguageDetector (.use) + a `detection` block, and re-add <LanguageSwitcher />
// to the Navbar. Nothing else needs to change.

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
