/**
 * Locale-aware product names.
 * HU: AdminAI (adminai.hu)
 * EN/US: NoticeIQ — IRS & agency letters (distinct from generic “Admin AI”)
 */
export const BRAND_HU = "AdminAI";
export const BRAND_EN = "NoticeIQ";

export function brandNameForLocale(lang: string): string {
  return lang?.toLowerCase().startsWith("en") ? BRAND_EN : BRAND_HU;
}
