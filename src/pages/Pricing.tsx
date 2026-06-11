import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, FileText, Zap, CalendarRange, Receipt, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { PageSEO } from "@/components/PageSEO";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation("common");

  const tp = (k: string) => t(`pricingPage.${k}`);
  const feat = (k: string) => t(`pricingPage.plans.${k}`, { returnObjects: true }) as string[];

  // Prices are USD literals (same in every language); labels come from i18n.
  const docPlans = [
    {
      planKey: "basic_doc" as const,
      name: tp("plans.basicName"),
      price: "$3.99",
      per: tp("perDocument"),
      description: tp("plans.basicDesc"),
      features: feat("basicFeatures"),
    },
    {
      planKey: "pro_doc" as const,
      name: tp("plans.proName"),
      price: "$9.99",
      per: tp("perDocument"),
      description: tp("plans.proDesc"),
      features: feat("proFeatures"),
      highlight: true,
    },
  ];

  const subPlans = [
    {
      planKey: "monthly" as const,
      name: tp("plans.monthlyName"),
      price: "$9.99",
      per: tp("perMonth"),
      description: tp("plans.monthlyDesc"),
      features: feat("monthlyFeatures"),
    },
    {
      planKey: "business" as const,
      name: tp("plans.businessName"),
      price: "$29.99",
      per: tp("perMonth"),
      description: tp("plans.businessDesc"),
      features: feat("businessFeatures"),
    },
    {
      planKey: "enterprise" as const,
      name: tp("plans.enterpriseName"),
      price: "$49.99",
      per: tp("perMonth"),
      description: tp("plans.enterpriseDesc"),
      features: feat("enterpriseFeatures"),
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="pricing" path="/pricing" />
      <div className="container mx-auto max-w-6xl">

        {/* Hero */}
        <div className="text-center space-y-4 mb-12 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-1">{tp("badge")}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">
            {tp("heroTitlePre")} <span className="text-primary">{tp("heroTitleHighlight")}</span>
          </h1>
          <p className="text-xl text-muted-foreground">{tp("heroDesc")}</p>
        </div>

        {/* Free tier */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{tp("freeSection")}</h2>
          <div className="max-w-md">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <CardTitle>{tp("freeName")}</CardTitle>
                </div>
                <CardDescription>{tp("freeDesc")}</CardDescription>
                <p className="text-3xl font-bold pt-2">$0</p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => (user ? navigate("/upload") : navigate("/auth"))}
                >
                  {tp("freeCta")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Per-document plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{tp("docSection")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {docPlans.map((plan) => (
              <div key={plan.planKey} className="relative">
                {plan.highlight && (
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm opacity-60" />
                )}
                <Card className={`relative h-full ${plan.highlight ? "border-violet-200 dark:border-violet-900" : ""}`}>
                  {plan.highlight && (
                    <Badge className="mb-2 bg-gradient-to-r from-violet-500 to-fuchsia-500">
                      {tp("popular")}
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
                      {tp("buy")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly subscription plans */}
        <div>
          <h2 className="text-2xl font-bold mb-2">{tp("subSection")}</h2>
          <p className="text-muted-foreground mb-4 max-w-2xl">{tp("subSectionDesc")}</p>
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
                    {tp("subscribe")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-10 max-w-2xl mx-auto">
          <Shield className="inline h-3 w-3 mr-1" />
          {tp("disclaimer")}
        </p>
      </div>
    </div>
  );
}
