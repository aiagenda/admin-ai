import { useTranslation } from "react-i18next";
import { isUsMarket } from "@/lib/market";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  className?: string;
};

export function LanguageSwitcher({ className }: Props) {
  // Hook must always be called — before any early return (Rules of Hooks)
  const { i18n, t } = useTranslation("nav");

  // US market: single language, no switcher needed
  if (isUsMarket()) return null;

  const value = i18n.language?.toLowerCase().startsWith("en") ? "en" : "hu";

  return (
    <Select value={value} onValueChange={(lng) => void i18n.changeLanguage(lng)}>
      <SelectTrigger
        className={className ?? "h-9 w-[120px] text-xs sm:text-sm"}
        aria-label={t("language")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hu">{t("langHu")}</SelectItem>
        <SelectItem value="en">{t("langEn")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
