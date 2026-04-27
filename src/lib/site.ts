/** Publikus oldal URL (canonical, OG) — preview/staging esetén állítsd: VITE_PUBLIC_SITE_URL */
export function getSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/$/, "");
  }
  return "https://adminai.hu";
}
