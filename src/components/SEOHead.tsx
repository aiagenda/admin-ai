import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  ogType?: "website" | "article";
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_URL = "https://adminai.hu";

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

export function SEOHead({
  title,
  description,
  path = "/",
  keywords,
  ogType = "website",
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    const canonicalUrl = `${BASE_URL}${path}`;

    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);

    upsertMeta("og:title", title, true);
    upsertMeta("og:description", description, true);
    upsertMeta("og:type", ogType, true);
    upsertMeta("og:url", canonicalUrl, true);

    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);

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
  }, [title, description, path, keywords, ogType, structuredData]);

  return null;
}
