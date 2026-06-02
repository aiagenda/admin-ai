import { isUsMarket } from "@/lib/market";

export const BRAND_HU = "AdminAI";
export const BRAND_EN = "NoticeIQ";

export function brandNameForLocale(lang: string): string {
  if (isUsMarket()) return BRAND_EN;
  return lang?.toLowerCase().startsWith("en") ? BRAND_EN : BRAND_HU;
}
