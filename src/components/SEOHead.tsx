import { useEffect } from "react";
import { getSiteOrigin } from "@/lib/site";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  ogType?: "website" | "article";
  /** Teljes URL, vagy `/ikon.png` relatív a site originhoz */
  ogImage?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
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

function absoluteOgImage(origin: string, ogImage?: string): string {
  if (!ogImage || !ogImage.trim()) {
    return `${origin}/icon-512.png`;
  }
  const s = ogImage.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${origin}${path}`;
}

export function SEOHead({
  title,
  description,
  path = "/",
  keywords,
  ogType = "website",
  ogImage,
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    const origin = getSiteOrigin();
    const pathNorm = path.startsWith("/") ? path : `/${path}`;
    const canonicalUrl = `${origin}${pathNorm}`;
    const imageUrl = absoluteOgImage(origin, ogImage);

    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);

    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:type", ogType, true);
    upsertMeta("og:url", canonicalUrl, true);
    upsertMeta("og:image", imageUrl, true);

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
  }, [title, description, path, keywords, ogType, ogImage, structuredData]);

  return null;
}
