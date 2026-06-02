import { useTranslation } from "react-i18next";
import { SITE_LEGAL } from "@/config/siteLegal";

export type LegalPageId = "privacy" | "terms" | "cookies" | "dpa" | "security" | "imprint";

type Section = { title: string; paragraphs: string[] };

export function LegalDocumentBody({ page }: { page: LegalPageId }) {
  const { t } = useTranslation("legal");
  const { t: tc } = useTranslation("common");
  const sections = t(`${page}.sections`, { returnObjects: true }) as Section[] | unknown;

  return (
    <>
      <h1 className="text-3xl font-bold">{t(`${page}.title`)}</h1>
      <p className="text-muted-foreground">{t(`${page}.intro`)}</p>

      {page === "imprint" && (
        <section className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
          <p>
            <strong className="font-medium">{tc("imprint.legalEntity")}</strong> {SITE_LEGAL.legalEntityName}
          </p>
          <p>
            <strong className="font-medium">{tc("imprint.registeredAddress")}</strong> {SITE_LEGAL.registeredAddress}
          </p>
          <p>
            <strong className="font-medium">{tc("imprint.privacy")}</strong> {SITE_LEGAL.privacyEmail}
          </p>
          <p>
            <strong className="font-medium">{tc("imprint.support")}</strong> {SITE_LEGAL.supportEmail}
          </p>
          <p>
            <strong className="font-medium">{tc("imprint.security")}</strong> {SITE_LEGAL.securityEmail}
          </p>
        </section>
      )}

      {Array.isArray(sections) &&
        sections.map((s, i) => (
          <section key={i} className="space-y-2">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            {s.paragraphs.map((para, j) => (
              <p key={j} className="leading-relaxed whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </section>
        ))}

      <p className="text-sm text-muted-foreground">
        {t(`${page}.lastUpdatedLabel`)} {t(`${page}.lastUpdated`)}
      </p>
    </>
  );
}
