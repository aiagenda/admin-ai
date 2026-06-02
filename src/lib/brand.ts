/** Product brand name (US + HU). */
export const BRAND = "GovLetter";

export const BRAND_HU = BRAND;
export const BRAND_EN = BRAND;

export function brandNameForLocale(_lang?: string): string {
  return BRAND;
}
