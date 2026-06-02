import { useEffect } from "react";
import i18n from "@/i18n/config";
import { isUsMarket } from "@/lib/market";

export function LangSync() {
  useEffect(() => {
    const apply = () => {
      if (isUsMarket()) {
        document.documentElement.lang = "en";
        return;
      }
      const lng = i18n.resolvedLanguage || i18n.language || "hu";
      document.documentElement.lang = lng.toLowerCase().startsWith("en") ? "en" : "hu";
    };
    apply();
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, []);
  return null;
}
