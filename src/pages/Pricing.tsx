import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Building2, Receipt } from "lucide-react";
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
      icon: Sparkles,
      color: "slate",
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
      icon: Crown,
      color: "blue",
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
      icon: Building2,
      color: "purple",
      features: [
        "Korlátlan dokumentum",
        "Haladó elemzés AI-val",
        "Minden értesítési csatorna",
        "Korlátlan archívum",
        "24/7 támogatás",
        "API hozzáférés",
      ],
      premiumFeatures: [
        "Könyvelés modul",
        "Számla fotózás & OCR",
        "Automatikus kategorizálás",
        "Excel export könyvelőnek",
        "Kézírás felismerés (öntanuló)",
      ],
      isPro: true,
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary" className="mb-4">
            30 napos pénzvisszafizetési garancia
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold">
            Válaszd ki a <span className="text-primary">tökéletes</span> csomagot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Bármikor módosíthatod. Nincs rejtett költség.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative ${plan.isPro ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {/* Pro plan special wrapper */}
              {plan.isPro && (
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl blur-sm opacity-75" />
              )}
              
              <Card
                className={`relative h-full transition-all ${
                  plan.isPro
                    ? "border-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white shadow-2xl"
                    : plan.popular
                      ? "border-primary shadow-lg"
                      : "hover:shadow-md"
                }`}
              >
                <CardHeader className="pb-4">
                  {plan.popular && !plan.isPro && (
                    <Badge className="w-fit mb-2 bg-primary">
                      Legnépszerűbb
                    </Badge>
                  )}
                  {plan.isPro && (
                    <Badge className="w-fit mb-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 border-0">
                      🚀 Legjobb érték
                    </Badge>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      plan.isPro 
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" 
                        : plan.popular
                          ? "bg-primary/10"
                          : "bg-muted"
                    }`}>
                      <plan.icon className={`h-6 w-6 ${
                        plan.isPro ? "text-white" : plan.popular ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <CardTitle className={`text-xl ${plan.isPro ? "text-white" : ""}`}>
                        {plan.name}
                      </CardTitle>
                      <CardDescription className={plan.isPro ? "text-purple-200" : ""}>
                        {plan.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <span className={`text-4xl font-bold ${plan.isPro ? "text-white" : ""}`}>
                      {plan.price}
                    </span>
                    <span className={plan.isPro ? "text-purple-200" : "text-muted-foreground"}>
                      {" "}/ {plan.period}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          plan.isPro 
                            ? "bg-purple-500/30" 
                            : plan.popular 
                              ? "bg-primary/10" 
                              : "bg-muted"
                        }`}>
                          <Check className={`h-3 w-3 ${
                            plan.isPro ? "text-purple-200" : "text-primary"
                          }`} />
                        </div>
                        <span className={`text-sm ${plan.isPro ? "text-purple-100" : ""}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Premium features for Pro plan */}
                  {plan.premiumFeatures && (
                    <div className="pt-4 border-t border-purple-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="h-4 w-4 text-fuchsia-400" />
                        <span className="text-sm font-semibold text-fuchsia-300">
                          + Könyvelés modul
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {plan.premiumFeatures.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <div className="h-5 w-5 rounded-full bg-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
                              <Check className="h-3 w-3 text-fuchsia-300" />
                            </div>
                            <span className="text-sm text-purple-100">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    className={`w-full h-12 text-base ${
                      plan.isPro
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/25"
                        : plan.popular
                          ? ""
                          : ""
                    }`}
                    variant={plan.isPro ? "default" : plan.popular ? "default" : "outline"}
                    onClick={() => {
                      if (plan.name === "Ingyenes") {
                        navigate(user ? "/upload" : "/auth");
                      } else {
                        const planKey = plan.name === "Alap" ? "alap" : "professzionalis";
                        navigate(user ? `/checkout?plan=${planKey}` : "/auth");
                      }
                    }}
                  >
                    {plan.name === "Ingyenes" ? "Ingyenes kezdés" : "Előfizetés"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Gyakori kérdések</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Milyen dokumentumokat támogat?</h3>
                <p className="text-sm text-muted-foreground">
                  PDF és képfájlokat (JPG, PNG, HEIC) egyaránt feldolgozunk. A legtöbb hivatalos dokumentum formátumot támogatjuk.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Biztonságos az adataim tárolása?</h3>
                <p className="text-sm text-muted-foreground">
                  Igen, minden dokumentumot titkosítva tárolunk és csak Ön férhet hozzá.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Lemondhatom az előfizetést?</h3>
                <p className="text-sm text-muted-foreground">
                  Igen, bármikor lemondhatja az előfizetését, automatikus megújítás nélkül.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Milyen gyorsan kapom meg az elemzést?</h3>
                <p className="text-sm text-muted-foreground">
                  Az elemzés általában 30-60 másodpercen belül elkészül a feltöltés után.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
