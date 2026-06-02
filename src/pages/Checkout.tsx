import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Check, Loader2, Shield, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isUsMarket } from "@/lib/market";
import { PageSEO } from "@/components/PageSEO";

type PlanKey =
  | "basic_doc"
  | "pro_doc"
  | "monthly"
  | "business"
  | "enterprise"
  | "alap"
  | "professzionalis";

type PlanDef = {
  name: string;
  price: string;
  period: string;
  features: string[];
  isSubscription: boolean;
};

// ─── US / USD plans ───────────────────────────────────────────────────────────
const US_PLANS: Record<PlanKey, PlanDef> = {
  basic_doc: {
    name: "Basic — 1 document",
    price: "$3.99",
    period: "one-time",
    features: [
      "Plain-English explanation",
      "Deadlines & next steps",
      "IRS & agency letter support",
      "Email notification",
    ],
    isSubscription: false,
  },
  pro_doc: {
    name: "Pro — 1 document",
    price: "$9.99",
    period: "one-time",
    features: [
      "In-depth legal analysis",
      "Suggested response draft",
      "Recommended IRS forms",
      "PDF export",
    ],
    isSubscription: false,
  },
  monthly: {
    name: "Monthly — 10 documents",
    price: "$9.99",
    period: "/ month",
    features: [
      "10 documents / month",
      "Cancel anytime",
      "All letter types covered",
    ],
    isSubscription: true,
  },
  business: {
    name: "Business — 50 documents",
    price: "$29.99",
    period: "/ month",
    features: [
      "50 documents / month",
      "Priority processing",
      "Team-friendly",
    ],
    isSubscription: true,
  },
  enterprise: {
    name: "CPA / Professional",
    price: "$49.99",
    period: "/ month",
    features: [
      "Bookkeeping module",
      "Invoice OCR",
      "Excel export for accountants",
      "Unlimited documents (fair use)",
    ],
    isSubscription: true,
  },
  alap: {
    name: "Monthly 10 (legacy)",
    price: "$9.99",
    period: "/ month",
    features: ["10 documents / month"],
    isSubscription: true,
  },
  professzionalis: {
    name: "Pro/Enterprise (legacy)",
    price: "$49.99",
    period: "/ month",
    features: ["Legacy Pro access"],
    isSubscription: true,
  },
};

// ─── HU / Forint plans ────────────────────────────────────────────────────────
const HU_PLANS: Record<PlanKey, PlanDef> = {
  basic_doc: {
    name: "Basic – 1 dokumentum",
    price: "1 490 Ft",
    period: "egyszeri",
    features: ["1 alkalommal elemzés", "Normál mélység", "E-mail értesítés"],
    isSubscription: false,
  },
  pro_doc: {
    name: "Pro – 1 dokumentum",
    price: "3 990 Ft",
    period: "egyszeri",
    features: ["Mélyebb elemzés", "Válaszminta", "PDF export (ahol elérhető)"],
    isSubscription: false,
  },
  monthly: {
    name: "Havi 10 dokumentum",
    price: "4 990 Ft",
    period: "hó",
    features: ["10 feltöltés / naptári hó", "Jó megoldás, ha hónapról hónapra jön levél"],
    isSubscription: true,
  },
  business: {
    name: "Business 50",
    price: "14 990 Ft",
    period: "hó",
    features: ["50 dokumentum / hó", "Több család, iroda, cég"],
    isSubscription: true,
  },
  enterprise: {
    name: "Professzionális (könyvelés + prémium)",
    price: "9 990 Ft+",
    period: "hó",
    features: ["Könyvelés / OCR bővítések", "Prémium hozzáférés"],
    isSubscription: true,
  },
  alap: {
    name: "Havi 10 (régi)",
    price: "2 990 Ft+",
    period: "hó",
    features: ["STRIPE_PRICE_ALAP azonosító alatt"],
    isSubscription: true,
  },
  professzionalis: {
    name: "Pro / Enterprise (régi)",
    price: "9 990 Ft+",
    period: "hó",
    features: ["STRIPE_PRICE_PRO → Professzionális hozzáférés"],
    isSubscription: true,
  },
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const planParam = (searchParams.get("plan") as PlanKey | null) || "monthly";
  const us = isUsMarket();
  const PLANS = us ? US_PLANS : HU_PLANS;
  const plan: PlanKey = planParam in PLANS ? planParam : "monthly";
  const selected = PLANS[plan] ?? PLANS.monthly;
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user || !session?.access_token) {
      toast.error(us ? "Sign in required" : "Be kell jelentkezned");
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(us ? "No Stripe URL returned" : "Nem jött vissza Stripe URL");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="pricing" path="/checkout" noindex />
      <div className="container mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {us ? "Back" : "Vissza"}
          </Button>
          <h1 className="text-2xl font-bold">
            {us ? "Complete your order" : "Rendelés összegzése"}
          </h1>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{selected.name}</CardTitle>
                <CardDescription>
                  {selected.isSubscription
                    ? (us ? "Recurring subscription — cancel anytime" : "Megújuló előfizetés – bármikor lemondható")
                    : (us ? "One-time payment" : "Egyszeri fizetés")}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{selected.price}</p>
                <p className="text-sm text-muted-foreground">{selected.period}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {selected.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{us ? "Subtotal" : "Összeg"}</span>
                <span className="font-medium">{selected.price}</span>
              </div>
              {selected.isSubscription && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {us ? "Billing" : "Számlázás"}
                  </span>
                  <span className="font-medium">
                    {us ? "Monthly" : "Havonta"}
                  </span>
                </div>
              )}
            </div>

            <Button className="w-full h-12 text-base" onClick={handlePayment} disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-5 w-5 mr-2" />
              )}
              {loading
                ? (us ? "Redirecting to Stripe…" : "Átirányítás Stripe-ra…")
                : (us ? "Pay with card →" : "Fizetés kártyával →")}
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {us ? "Secure checkout by Stripe" : "Biztonságos fizetés (Stripe)"}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {us ? "Card data never touches our servers" : "Kártyaadatok nem kerülnek a szerverünkre"}
              </span>
            </div>

            {us && (
              <p className="text-xs text-center text-muted-foreground">
                By completing this purchase you agree to our{" "}
                <a href="/legal/terms" className="underline">Terms of Service</a>{" "}
                and{" "}
                <a href="/legal/privacy" className="underline">Privacy Policy</a>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
