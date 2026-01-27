import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "alap";

  const plans: Record<string, { name: string; price: string; features: string[] }> = {
    alap: {
      name: "Alap",
      price: "2 990 Ft",
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
      features: [
        "Korlátlan dokumentum",
        "Haladó elemzés AI-val",
        "Minden értesítési csatorna",
        "Korlátlan archívum",
        "24/7 támogatás",
        "API hozzáférés",
      ],
    },
  };

  const selectedPlan = plans[plan] || plans.alap;

  const handlePayment = () => {
    // TODO: Integrate payment provider (Stripe, PayPal, etc.)
    toast.info("Fizetési integráció hamarosan elérhető lesz!");
    // For now, just redirect to upload
    if (user) {
      navigate("/upload");
    } else {
      navigate("/auth");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
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
          <Card>
            <CardHeader>
              <CardTitle>Rendelés összesítése</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedPlan.name} csomag</h3>
                <p className="text-2xl font-bold mt-2">{selectedPlan.price} / hónap</p>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-semibold">Csomag tartalma:</h4>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between">
                  <span>Előfizetés</span>
                  <span className="font-semibold">{selectedPlan.price} / hónap</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Automatikus megújítás</span>
                  <span>Minden hónapban</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Fizetési információk</CardTitle>
              <CardDescription>
                Biztonságos fizetés bankkártyával
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  ⚠️ A fizetési integráció jelenleg fejlesztés alatt áll. 
                  Hamarosan elérhető lesz a Stripe vagy más fizetési szolgáltató integrációja.
                </p>
              </div>

              {/* Placeholder payment form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Kártyaszám
                  </label>
                  <div className="border rounded-md p-3 bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Fizetési integráció hamarosan
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Lejárat
                    </label>
                    <div className="border rounded-md p-3 bg-muted/50">
                      <span className="text-sm text-muted-foreground">-- / --</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      CVC
                    </label>
                    <div className="border rounded-md p-3 bg-muted/50">
                      <span className="text-sm text-muted-foreground">---</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full"
                size="lg"
                disabled
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Fizetés ({selectedPlan.price})
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                A fizetés biztonságos SSL titkosítással történik. 
                Az adataidat nem tároljuk.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
