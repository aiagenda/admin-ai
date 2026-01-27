import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const plans = [
    {
      name: "Ingyenes",
      price: "0 Ft",
      period: "hónap",
      description: "Kipróbáláshoz ideális",
      features: [
        "5 dokumentum / hónap",
        "Alapvető elemzés",
        "Email értesítések",
        "7 napos archívum",
      ],
    },
    {
      name: "Alap",
      price: "2 990 Ft",
      period: "hónap",
      description: "Magánszemélyeknek",
      features: [
        "50 dokumentum / hónap",
        "Részletes elemzés",
        "Email és SMS értesítések",
        "90 napos archívum",
        "Prioritás támogatás",
      ],
      popular: true,
    },
    {
      name: "Professzionális",
      price: "9 990 Ft",
      period: "hónap",
      description: "Vállalkozásoknak",
      features: [
        "Korlátlan dokumentum",
        "Haladó elemzés AI-val",
        "Minden értesítési csatorna",
        "Korlátlan archívum",
        "24/7 támogatás",
        "API hozzáférés",
      ],
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold">Árak</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Válassza ki az Önnek megfelelő csomagot. Bármikor módosíthatja.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? "border-primary shadow-lg scale-105" : ""}
            >
              <CardHeader>
                {plan.popular && (
                  <div className="mb-2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Legnépszerűbb
                    </span>
                  </div>
                )}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground"> / {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => {
                    if (plan.name === "Ingyenes") {
                      navigate(user ? "/upload" : "/auth");
                    } else {
                      // Navigate to checkout for paid plans
                      const planKey = plan.name === "Alap" ? "alap" : "professzionalis";
                      navigate(user ? `/checkout?plan=${planKey}` : "/auth");
                    }
                  }}
                >
                  {plan.name === "Ingyenes" ? "Kezdés" : "Előfizetés"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center space-y-4">
          <h2 className="text-2xl font-bold">Gyakori kérdések</h2>
          <div className="grid md:grid-cols-2 gap-6 mt-8 text-left">
            <div className="space-y-2">
              <h3 className="font-semibold">Milyen dokumentumokat támogat?</h3>
              <p className="text-sm text-muted-foreground">
                PDF és szöveges fájlokat egyaránt feldolgozunk. A legtöbb hivatalos dokumentum formátumot támogatjuk.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Biztonságos az adataim tárolása?</h3>
              <p className="text-sm text-muted-foreground">
                Igen, minden dokumentumot titkosítva tárolunk és csak Ön férhet hozzá.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Lemondhatom az előfizetést?</h3>
              <p className="text-sm text-muted-foreground">
                Igen, bármikor lemondhatja az előfizetését, automatikus megújítás nélkül.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Milyen gyorsan kapom meg az elemzést?</h3>
              <p className="text-sm text-muted-foreground">
                Az elemzés általában 1-2 percen belül elkészül a feltöltés után.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
