import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";

type PageSEOProps = {
  pageKey: string;
  path: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string;
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Meta title/description/keywords from translation.json under the seo.* keys.
 * Brand in OG uses nav namespace (brand = AdminAI / NoticeIQ).
 */
export function PageSEO({
  pageKey,
  path,
  noindex,
  ogType,
  ogImage,
  articlePublishedTime,
  articleModifiedTime,
  structuredData,
}: PageSEOProps) {
  const { t } = useTranslation("translation");
  const { t: navT } = useTranslation("nav");
  const { i18n } = useTranslation();
  const ogLocale = i18n.language?.startsWith("en") ? "en_US" : "hu_HU";

  const title = t(`seo.${pageKey}.title`);
  const description = t(`seo.${pageKey}.description`);
  const keywordsRaw = t(`seo.${pageKey}.keywords`, { defaultValue: "" }).trim();

  return (
    <SEOHead
      title={title}
      description={description}
      path={path}
      keywords={keywordsRaw || undefined}
      ogType={ogType}
      ogImage={ogImage}
      noindex={noindex}
      ogSiteName={navT("brand")}
      ogLocale={ogLocale}
      articlePublishedTime={articlePublishedTime}
      articleModifiedTime={articleModifiedTime}
      structuredData={structuredData}
    />
  );
}
