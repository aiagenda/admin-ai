import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Check, Loader2, Shield, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PlanKey =
  | "basic_doc"
  | "pro_doc"
  | "monthly"
  | "business"
  | "enterprise"
  | "alap"
  | "professzionalis";

const PLANS: Record<
  PlanKey,
  { name: string; price: string; period: string; features: string[]; isSubscription: boolean }
> = {
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
    period: "hó (Stripe Price)",
    features: ["Könyvelés / OCR bővítések a Stripe-hoz hangolva", "A pontos bruttó összeg a termékben"],
    isSubscription: true,
  },
  alap: {
    name: "Havi 10 (régi)",
    price: "2 990 Ft+",
    period: "hó (legacy price ID)",
    features: ["A STRIPE_PRICE_ALAP azonosító alatt"],
    isSubscription: true,
  },
  professzionalis: {
    name: "Pro / Enterprise (régi)",
    price: "9 990 Ft+",
    period: "hó (legacy price ID)",
    features: ["STRIPE_PRICE_PRO → Professzionális hozzáférés"],
    isSubscription: true,
  },
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const planParam = (searchParams.get("plan") as PlanKey | null) || "monthly";
  const plan: PlanKey = planParam in PLANS ? planParam : "monthly";
  const selected = PLANS[plan] ?? PLANS.monthly;
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user || !session?.access_token) {
      toast.error("Be kell jelentkezned");
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Nem jött vissza Stripe URL");
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const msg = err instanceof Error ? err.message : "A fizetés indítása sikertelen";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Bejelentkezés</CardTitle>
            <CardDescription>Az vásárláshoz jelentkezz be</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate("/auth")} className="w-full">Bejelentkezés</Button>
            <Button variant="outline" onClick={() => navigate("/pricing")} className="w-full">
              Vissza
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/pricing")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Megrendelés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
                <h3 className="font-semibold text-xl">{selected.name}</h3>
                <p className="text-3xl font-bold mt-2 text-primary">
                  {selected.price}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / {selected.period}
                  </span>
                </p>
              </div>
              <ul className="space-y-2">
                {selected.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t text-sm text-muted-foreground">
                {selected.isSubscription ? "Előfizetés, automatikus megújítás, lemondható a Stripe e-mailből vagy támogatáson." : "Egyszeri fizetés, nincs megújítás. +1 kredit a fiókodhoz a sikeres fizetés után (webhook)."}
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-500" />
                Fizetés
              </CardTitle>
              <CardDescription>Stripe, PCI DSS, titkosított</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span>3DS</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">A gomb a Stripe hosztolt fizetési oldalára visz, kártya adatokat nem tárol a böngészőnkből kezelünk.</p>
              <Button
                onClick={handlePayment}
                className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-600"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Átirányítás…
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Tovább a fizetéshez
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Az elfogadással tudomásul veszed a <a className="underline" href="/legal/terms">ÁSZF</a>-et és a{" "}
                <a className="underline" href="/legal/privacy">adatkezelést</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
