import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, FileText, Zap, CalendarRange, Receipt, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageSEO } from "@/components/PageSEO";
import { isUsMarket } from "@/lib/market";

// ─── US / USD plans ───────────────────────────────────────────────────────────

const docPlansUS = [
  {
    name: "Basic",
    price: "$3.99",
    per: "document",
    description: "Quick plain-English explanation",
    cta: "Buy",
    planKey: "basic_doc" as const,
    features: [
      "Plain-English summary",
      "IRS & agency letter support",
      "Deadlines & next steps",
      "Email notification",
    ],
  },
  {
    name: "Pro",
    price: "$9.99",
    per: "document",
    description: "Deeper analysis + response draft",
    cta: "Buy",
    planKey: "pro_doc" as const,
    features: [
      "In-depth legal analysis",
      "Suggested response draft",
      "Recommended IRS forms",
      "PDF export",
    ],
    highlight: true,
  },
];

const subPlansUS = [
  {
    name: "Monthly 10",
    price: "$9.99",
    per: "month",
    description: "For regular use",
    cta: "Subscribe",
    planKey: "monthly" as const,
    features: [
      "10 documents / month",
      "Cancel anytime",
      "All letter types covered",
    ],
  },
  {
    name: "Business 50",
    price: "$29.99",
    per: "month",
    description: "For offices & small businesses",
    cta: "Subscribe",
    planKey: "business" as const,
    features: [
      "50 documents / month",
      "Priority processing",
      "Team-friendly",
    ],
  },
  {
    name: "CPA / Professional",
    price: "$49.99",
    per: "month",
    description: "For accounting firms & enrolled agents",
    cta: "Subscribe",
    planKey: "enterprise" as const,
    features: [
      "Bookkeeping module",
      "Invoice OCR",
      "Excel export for accountants",
      "Unlimited documents (fair use)",
    ],
  },
];

// ─── HU / Forint plans ────────────────────────────────────────────────────────

const docPlansHU = [
  {
    name: "Basic",
    price: "1 490 Ft",
    per: "dokumentum",
    description: "Gyors, részletes elemzés",
    cta: "Vásárlás",
    planKey: "basic_doc" as const,
    features: [
      "Normál minőségű értelmezés",
      "Nav / hivatali levél támogatás",
      "E-mail értesítés",
    ],
  },
  {
    name: "Pro",
    price: "3 990 Ft",
    per: "dokumentum",
    description: "Mélyebb elemzés, válaszminta, PDF",
    cta: "Vásárlás",
    planKey: "pro_doc" as const,
    features: [
      "Mélyebb elemzés",
      "Javasolt válaszminta",
      "PDF export a riportból (ahol elérhető)",
    ],
    highlight: true,
  },
];

const subPlansHU = [
  {
    name: "Havi 10",
    price: "4 990 Ft",
    per: "hó",
    description: "Rendszeres használatra",
    cta: "Előfizetés",
    planKey: "monthly" as const,
    features: [
      "10 dokumentum / hó",
      "Dokumentum kredit nélküli, kvótás hozzáférés",
      "Bármikor lemondható",
    ],
  },
  {
    name: "Business 50",
    price: "14 990 Ft",
    per: "hó",
    description: "Irodáknak, kis cégeknek",
    cta: "Előfizetés",
    planKey: "business" as const,
    features: [
      "50 dokumentum / hó",
      "Magasabb kvóta",
      "Prioritás a feldolgozásnál (cél)",
    ],
  },
  {
    name: "Professzionális (Könyvelés+)",
    price: "9 990 Ft+",
    per: "hó",
    description: "Könyvelési modul, OCR, export",
    cta: "Előfizetés",
    planKey: "enterprise" as const,
    features: [
      "Könyvelés modul",
      "Számla / OCR feldolgozás",
      "Excel a könyvelőnek",
      "Dokumentum: nagy vagy korlátlan (részletek a checkoutnál)",
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const us = isUsMarket();

  const docPlans = us ? docPlansUS : docPlansHU;
  const subPlans = us ? subPlansUS : subPlansHU;

  const freeLabel      = us ? "Free trial"           : "Ingyenes";
  const freeDesc       = us ? "One free document — lightweight analysis to try the workflow" : "Rövid / vízjeles, könnyített elemzés, hogy kipróbáld a folyamatot";
  const freeCta        = us ? "Get started"          : "Kezdés";
  const freePrice      = us ? "$0"                   : "0 Ft";
  const docSectionHdr  = us ? "Per-document (one-time)" : "Egyszeri – dokumentum ár (Stripe)";
  const subSectionHdr  = us ? "Monthly plans"        : "Havi csomagok";
  const subSectionDesc = us
    ? "Upload letters regularly? A monthly plan is cheaper per document."
    : "Ha rendszeresen jönnek levelek vagy sok a dokumentum, olcsóbb a havi limit.";
  const heroTitle      = us
    ? <>Don&apos;t let a scary letter <span className="text-primary">go unanswered</span></>
    : <>Ne ijedj meg a <span className="text-primary">hivatalos levelektől</span></>;
  const heroDesc       = us
    ? "Upload the letter and we'll tell you exactly what it means, what to do, and when. Try it free — pay only when you need it."
    : "Töltsd fel a levelet, és elmondjuk, mit kell tenned. Először ingyenesen 1 könnyített próbát kapsz, utána fizess csak amikor kell.";
  const badgeText      = us
    ? "Refund policy in Terms of Service"
    : "Pénzvisszafizetési elvek az ÁSZF-ben";
  const popularLabel   = us ? "Most popular" : "Ajánlott";

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="pricing" path="/pricing" />
      <div className="container mx-auto max-w-6xl">

        {/* Hero */}
        <div className="text-center space-y-4 mb-12 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-1">{badgeText}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">{heroTitle}</h1>
          <p className="text-xl text-muted-foreground">{heroDesc}</p>
        </div>

        {/* Free tier */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{freeLabel}</h2>
          <div className="max-w-md">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <CardTitle>{us ? "1 free document" : "1 próba dokumentum"}</CardTitle>
                </div>
                <CardDescription>{freeDesc}</CardDescription>
                <p className="text-3xl font-bold pt-2">{freePrice}</p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => (user ? navigate("/upload") : navigate("/auth"))}
                >
                  {freeCta}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Per-document plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{docSectionHdr}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {docPlans.map((plan) => (
              <div key={plan.planKey} className="relative">
                {plan.highlight && (
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm opacity-60" />
                )}
                <Card className={`relative h-full ${plan.highlight ? "border-violet-200 dark:border-violet-900" : ""}`}>
                  {plan.highlight && (
                    <Badge className="mb-2 bg-gradient-to-r from-violet-500 to-fuchsia-500">
                      {popularLabel}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-6 w-6 text-primary" />
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-3xl font-bold pt-2">
                      {plan.price}{" "}
                      <span className="text-base font-normal text-muted-foreground">/ {plan.per}</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() =>
                        user
                          ? navigate(`/checkout?plan=${plan.planKey}`)
                          : navigate(`/auth?redirect=/pricing`)
                      }
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly subscription plans */}
        <div>
          <h2 className="text-2xl font-bold mb-2">{subSectionHdr}</h2>
          <p className="text-muted-foreground mb-4 max-w-2xl">{subSectionDesc}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {subPlans.map((plan) => (
              <Card key={plan.planKey} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {plan.planKey === "enterprise" ? (
                      <Receipt className="h-6 w-6 text-primary" />
                    ) : (
                      <CalendarRange className="h-6 w-6 text-primary" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">{plan.description}</CardDescription>
                    </div>
                  </div>
                  <p className="text-2xl font-bold pt-2">
                    {plan.price}{" "}
                    <span className="text-base font-normal text-muted-foreground">/ {plan.per}</span>
                  </p>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() =>
                      user
                        ? navigate(`/checkout?plan=${plan.planKey}`)
                        : navigate(`/auth?redirect=/pricing`)
                    }
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        {us && (
          <p className="text-xs text-muted-foreground text-center mt-10 max-w-2xl mx-auto">
            <Shield className="inline h-3 w-3 mr-1" />
            GovLetter is a document-explanation tool, not a tax advisor or law firm. Always verify
            deadlines and amounts against your original notice and consult a qualified professional
            before taking action.
          </p>
        )}
      </div>
    </div>
  );
}
