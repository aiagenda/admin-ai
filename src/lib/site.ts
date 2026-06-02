/** Public site URL (canonical, OG tags) — override with VITE_PUBLIC_SITE_URL in production */
export function getSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().replace(/\/$/, "");
  }
  // Default to US brand — set VITE_PUBLIC_SITE_URL=https://govletter.com for HU production
  return "https://govletter.com";
}
