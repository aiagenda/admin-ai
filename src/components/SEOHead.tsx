import { useEffect } from "react";
import { getSiteOrigin } from "@/lib/site";

const DEFAULT_OG_SITE_NAME = "GovLetter";
import { isUsMarket } from "@/lib/market";
const DEFAULT_LOCALE = isUsMarket() ? "en_US" : "hu_HU";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  ogType?: "website" | "article";
  /** Teljes URL, vagy `/ikon.png` relatív a site originhoz */
  ogImage?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
  /** Bejelentkezés, callback, 404: ne indexeljen a Google */
  noindex?: boolean;
  ogSiteName?: string;
  /** Open Graph locale, pl. `hu_HU` / `en_US` */
  ogLocale?: string;
  /** cikk: ISO 8601 */
  articlePublishedTime?: string;
  articleModifiedTime?: string;
}

function upsertMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let tag = document.head.querySelector(`meta[${attr}='${name}']`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setOrRemoveMetaProperty(name: string, content: string | undefined) {
  if (content === undefined) {
    const tag = document.head.querySelector(`meta[property='${name}']`);
    if (tag) tag.remove();
    return;
  }
  upsertMeta(name, content, true);
}

function absoluteOgImage(origin: string, ogImage?: string): string {
  if (!ogImage || !ogImage.trim()) {
    return `${origin}/icon-512.png`;
  }
  const s = ogImage.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }
  const p = s.startsWith("/") ? s : `/${s}`;
  return `${origin}${p}`;
}

export function SEOHead({
  title,
  description,
  path = "/",
  keywords,
  ogType = "website",
  ogImage,
  structuredData,
  noindex = false,
  ogSiteName = DEFAULT_OG_SITE_NAME,
  ogLocale = DEFAULT_LOCALE,
  articlePublishedTime,
  articleModifiedTime,
}: SEOHeadProps) {
  useEffect(() => {
    const origin = getSiteOrigin();
    const pathNorm = path.startsWith("/") ? path : `/${path}`;
    const canonicalUrl = `${origin}${pathNorm}`;
    const imageUrl = absoluteOgImage(origin, ogImage);

    document.title = title;
    upsertMeta("description", description);
    if (keywords) {
      upsertMeta("keywords", keywords);
    } else {
      const kw = document.head.querySelector("meta[name='keywords']");
      if (kw) kw.remove();
    }

    upsertMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:type", ogType, true);
    upsertMeta("og:url", canonicalUrl, true);
    upsertMeta("og:image", imageUrl, true);
    upsertMeta("og:site_name", ogSiteName, true);
    upsertMeta("og:locale", ogLocale, true);

    if (ogType === "article") {
      setOrRemoveMetaProperty("article:published_time", articlePublishedTime);
      setOrRemoveMetaProperty("article:modified_time", articleModifiedTime);
    } else {
      setOrRemoveMetaProperty("article:published_time", undefined);
      setOrRemoveMetaProperty("article:modified_time", undefined);
    }

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", imageUrl);

    let canonical = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    const scriptId = "seo-structured-data";
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    if (structuredData) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [
    title,
    description,
    path,
    keywords,
    ogType,
    ogImage,
    structuredData,
    noindex,
    ogSiteName,
    ogLocale,
    articlePublishedTime,
    articleModifiedTime,
  ]);

  return null;
}
