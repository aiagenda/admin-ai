import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Check, Loader2, Shield, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "alap";
  const [loading, setLoading] = useState(false);

  const plans: Record<string, { name: string; price: string; priceNum: number; features: string[] }> = {
    alap: {
      name: "Alap",
      price: "2 990 Ft",
      priceNum: 2990,
      features: [
        "50 dokumentum / hónap",
        "Részletes elemzés",
        "Email és Push értesítések",
        "90 napos archívum",
        "Prioritás támogatás",
      ],
    },
    professzionalis: {
      name: "Professzionális",
      price: "9 990 Ft",
      priceNum: 9990,
      features: [
        "Korlátlan dokumentum",
        "Haladó elemzés AI-val",
        "Minden értesítési csatorna",
        "Korlátlan archívum",
        "24/7 támogatás",
        "API hozzáférés",
        "📊 Könyvelés modul",
        "Számla fotózás & OCR",
      ],
    },
  };

  const selectedPlan = plans[plan] || plans.alap;

  const handlePayment = async () => {
    if (!user || !session?.access_token) {
      toast.error("Be kell jelentkezned az előfizetéshez");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // Call Edge Function to create Stripe Checkout Session
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      
      // Check if it's a configuration error
      if (err.message?.includes("not configured") || err.message?.includes("placeholder")) {
        toast.error("A fizetési rendszer konfigurálása folyamatban. Kérjük, próbáld később!");
      } else {
        toast.error(err.message || "Hiba történt a fizetés indításakor");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Bejelentkezés szükséges</CardTitle>
            <CardDescription>
              Az előfizetéshez be kell jelentkezned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate("/auth")} className="w-full">
              Bejelentkezés
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="w-full"
            >
              Vissza az árakhoz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/pricing")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az árakhoz
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Rendelés összesítése
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
                <h3 className="font-semibold text-xl">{selectedPlan.name} csomag</h3>
                <p className="text-3xl font-bold mt-2 text-primary">{selectedPlan.price}<span className="text-base font-normal text-muted-foreground"> / hónap</span></p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">A CSOMAG TARTALMA:</h4>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Havi előfizetés</span>
                  <span>{selectedPlan.price}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Összesen</span>
                  <span className="text-primary">{selectedPlan.price}/hó</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-green-500" />
                Biztonságos fizetés
              </CardTitle>
              <CardDescription>
                A fizetés a Stripe biztonságos rendszerén keresztül történik
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>SSL védelem</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span>PCI DSS</span>
                </div>
              </div>

              {/* Payment info */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    A <strong>Fizetés</strong> gombra kattintva átirányítunk a Stripe biztonságos fizetési oldalára, ahol megadhatod a bankkártya adataidat.
                  </p>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Elfogadott kártyák: Visa, Mastercard, Amex</p>
                  <p>• Az előfizetés havonta automatikusan megújul</p>
                  <p>• Bármikor lemondható</p>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Átirányítás...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Fizetés ({selectedPlan.price}/hó)
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                A fizetéssel elfogadod az <a href="/terms" className="underline">Általános Szerződési Feltételeket</a> és az <a href="/privacy" className="underline">Adatvédelmi Szabályzatot</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
