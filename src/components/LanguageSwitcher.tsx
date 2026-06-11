import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS = [
  { code: "en", labelKey: "langEn" },
  { code: "es", labelKey: "langEs" },
] as const;

/** Compact EN/ES language switcher. Persists via the i18n language detector. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation("nav");
  const current = i18n.language?.startsWith("es") ? "es" : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] touch-manipulation"
          aria-label={t("language")}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className="gap-2"
          >
            <Check className={`h-4 w-4 ${current === l.code ? "opacity-100" : "opacity-0"}`} />
            {t(l.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
