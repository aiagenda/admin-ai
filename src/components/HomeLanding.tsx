import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, Clock, Shield, Receipt, ScanLine, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { isUsMarket } from "@/lib/market";

export function HomeLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation("common");
  const us = isUsMarket();
  const p = "homePage.landing";

  const solutions = us
    ? [
        { to: "/irs-notices", title: t(`${p}.solIrsTitle`), desc: t(`${p}.solIrsDesc`) },
        { to: "/state-tax-letters", title: t(`${p}.solStateTitle`), desc: t(`${p}.solStateDesc`) },
        { to: "/ssa-letters", title: t(`${p}.solSsaTitle`), desc: t(`${p}.solSsaDesc`) },
        { to: "/help", title: t(`${p}.solFaqTitle`), desc: t(`${p}.solFaqDesc`) },
      ]
    : [
        { to: "/nav-hatarozat-ertelmezes", title: t(`${p}.solIrsTitle`), desc: t(`${p}.solIrsDesc`) },
        { to: "/szamla-ocr", title: t(`${p}.solStateTitle`), desc: t(`${p}.solStateDesc`) },
        { to: "/dokumentum-archivum", title: t(`${p}.solSsaTitle`), desc: t(`${p}.solSsaDesc`) },
        { to: "/gyik", title: t(`${p}.solFaqTitle`), desc: t(`${p}.solFaqDesc`) },
      ];

  const comparisons = us
    ? [{ to: "/adminai-vs-chatgpt", title: t(`${p}.cmpChatgptTitle`), desc: t(`${p}.cmpChatgptDesc`) }]
    : [
        { to: "/adminai-vs-chatgpt", title: t(`${p}.cmpChatgptTitle`), desc: t(`${p}.cmpChatgptDesc`) },
        { to: "/adminai-vs-billingo", title: t(`${p}.cmpBillingoTitle`), desc: t(`${p}.cmpBillingoDesc`) },
        { to: "/adminai-vs-szamlazz", title: t(`${p}.cmpSzamlazzTitle`), desc: t(`${p}.cmpSzamlazzDesc`) },
      ];

  const step4Icon = us ? FileSpreadsheet : Receipt;

  return (
    <>
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              {t(`${p}.heroTitle`)}{" "}
              <span className="text-primary">{t(`${p}.heroHighlight`)}</span>
            </h1>
            <p className="text-md sm:text-lg text-foreground font-medium max-w-2xl mx-auto">
              {t(`${p}.tagline1`)}
              <br />
              {us ? (
                <>
                  {t(`${p}.tagline2`)}{" "}
                  <span className="font-semibold text-primary">{t(`${p}.tagline2You`)}</span>.
                </>
              ) : (
                <>
                  {t(`${p}.tagline2`)}{" "}
                  <span className="font-semibold text-primary">{t(`${p}.tagline2You`)}</span>,{" "}
                  <span className="font-semibold">{t("homePage.landing.tagline2YouWrap")}</span>
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate(user ? "/upload" : "/auth")}
                className="w-full sm:w-auto text-lg px-8 min-h-[48px] touch-manipulation"
              >
                <FileText className="mr-2 h-5 w-5" />
                {t(`${p}.uploadCta`)}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")} className="w-full sm:w-auto text-lg px-8 min-h-[48px] touch-manipulation">
                {t(`${p}.pricingCta`)}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">{t(`${p}.howTitle`)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { Icon: FileText, title: t(`${p}.step1Title`), desc: t(`${p}.step1Desc`) },
              { Icon: Sparkles, title: t(`${p}.step2Title`), desc: t(`${p}.step2Desc`) },
              { Icon: Clock, title: t(`${p}.step3Title`), desc: t(`${p}.step3Desc`) },
              { Icon: step4Icon, title: t(`${p}.step4Title`), desc: t(`${p}.step4Desc`) },
            ].map(({ Icon, title, desc }) => (
              <Card key={title}>
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">{t(`${p}.benefitsTitle`)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { Icon: Shield, title: t(`${p}.benefitSecureTitle`), desc: t(`${p}.benefitSecureDesc`) },
              { Icon: Sparkles, title: t(`${p}.benefitFastTitle`), desc: t(`${p}.benefitFastDesc`) },
              { Icon: Clock, title: t(`${p}.benefitDeadlinesTitle`), desc: t(`${p}.benefitDeadlinesDesc`) },
              { Icon: FileText, title: t(`${p}.benefitArchiveTitle`), desc: t(`${p}.benefitArchiveDesc`) },
              { Icon: ScanLine, title: t(`${p}.benefitFormsTitle`), desc: t(`${p}.benefitFormsDesc`) },
              { Icon: FileSpreadsheet, title: t(`${p}.benefitStatesTitle`), desc: t(`${p}.benefitStatesDesc`) },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <Icon className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{t(`${p}.solutionsTitle`)}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {solutions.map((s) => (
              <Link key={s.to} to={s.to} className="rounded-lg border p-4 hover:border-primary transition-colors">
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {comparisons.length > 0 && (
        <section className="pb-10 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-6">{t(`${p}.compareTitle`)}</h2>
            <div className={`grid gap-4 ${comparisons.length === 1 ? "max-w-md mx-auto" : "md:grid-cols-3"}`}>
              {comparisons.map((c) => (
                <Link key={c.to} to={c.to} className="rounded-lg border p-4 hover:border-primary transition-colors">
                  <h3 className="font-semibold mb-1">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">{t(`${p}.ctaTitle`)}</h2>
          <p className="text-lg text-muted-foreground">{t(`${p}.ctaSubtitle`)}</p>
          <p className="text-sm text-muted-foreground">{t(`${p}.ctaDisclaimer`)}</p>
          <Button size="lg" onClick={() => navigate(user ? "/upload" : "/auth")} className="text-lg px-8">
            {t(`${p}.ctaButton`)}
          </Button>
        </div>
      </section>
    </>
  );
}
