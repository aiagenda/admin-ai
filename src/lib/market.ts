/**
 * Product market: US launch uses English-only UI and IRS-focused analysis.
 * Hungarian assets stay in the repo/DB but are not loaded or surfaced when market=us.
 */
export type ProductMarket = "us" | "hu";

export function getMarket(): ProductMarket {
  const raw = (import.meta.env.VITE_MARKET || "us").toString().toLowerCase().trim();
  return raw === "hu" ? "hu" : "us";
}

export function isUsMarket(): boolean {
  return getMarket() === "us";
}

export const HU_ONLY_PATHS = [
  "/nav-hatarozat-ertelmezes",
  "/szamla-ocr",
  "/dokumentum-archivum",
  "/govletter-vs-billingo",
  "/govletter-vs-szamlazz",
] as const;

export const HU_PATH_REDIRECTS: Record<string, string> = {
  "/arak": "/pricing",
  "/gyik": "/help",
};
