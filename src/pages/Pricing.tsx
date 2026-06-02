import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, FileText, Zap, CalendarRange, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageSEO } from "@/components/PageSEO";

const docPlans = [
  {
    name: "Basic",
    price: "1 490 Ft",
    per: "dokumentum",
    description: "Gyors, részletes elemzés",
    cta: "Vásárlás",
    planKey: "basic_doc" as const,
    features: ["Normál minőségű értelmezés", "Nav / hivatali levél támogatás", "E-mail értesítés"],
  },
  {
    name: "Pro",
    price: "3 990 Ft",
    per: "dokumentum",
    description: "Mélyebb elemzés, válaszminta, PDF",
    cta: "Vásárlás",
    planKey: "pro_doc" as const,
    features: ["Mélyebb elemzés", "Javasolt válaszminta", "PDF export a riportból (ahol elérhető)"],
    highlight: true,
  },
];

const subPlans = [
  {
    name: "Havi 10",
    price: "4 990 Ft",
    per: "hó",
    description: "Rendszeres használatra",
    cta: "Előfizetés",
    planKey: "monthly" as const,
    features: ["10 dokumentum / hó a katalógus hónapban", "Dokumentum kredit nélküli, kvótás hozzáférés", "Bármikor lemondható"],
  },
  {
    name: "Business 50",
    price: "14 990 Ft",
    per: "hó",
    description: "Irodáknak, kis cégeknek",
    cta: "Előfizetés",
    planKey: "business" as const,
    features: ["50 dokumentum / hó", "Magasabb kvóta", "Prioritás a feldolgozásnál (cél)"],
  },
  {
    name: "Professzionális (Könyvelés+)",
    price: "9 990 Ft+",
    per: "hó",
    description: "Korábbi Pro csomag: könyvelési modul, OCR, export",
    cta: "Előfizetés",
    planKey: "enterprise" as const,
    features: ["Könyvelés modul", "Számla / OCR feldolgozás", "Excel a könyvelőnek", "Dokumentum: nagy vagy korlátozott (részletek a checkoutnál)"],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="pricing" path="/pricing" />
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-1">
            Pénzvisszafizetési elvek az ÁSZF-ben
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold">
            Ne ijedj meg a <span className="text-primary">hivatalos levelektől</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Töltsd fel a levelet, és elmondjuk, mit kell tenned. Először ingyenesen 1 könnyített próbát kapsz, utána fizess csak
            amikor kell: dokumentumonként, vagy havi csomagban.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Ingyenes</h2>
          <div className="max-w-md">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <CardTitle>1 próba dokumentum</CardTitle>
                </div>
                <CardDescription>Rövid / vízjeles, könnyített elemzés, hogy kipróbáld a folyamatot</CardDescription>
                <p className="text-3xl font-bold pt-2">
                  0 Ft
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => (user ? navigate("/upload") : navigate("/auth"))}
                >
                  Kezdés
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Egyszeri – dokumentum ár (Stripe)</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {docPlans.map((plan) => (
              <div key={plan.planKey} className="relative">
                {plan.highlight && <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm opacity-60" />}
                <Card className={`relative h-full ${plan.highlight ? "border-violet-200 dark:border-violet-900" : ""}`}>
                  {plan.highlight && (
                    <Badge className="mb-2 bg-gradient-to-r from-violet-500 to-fuchsia-500">Ajánlott</Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-6 w-6 text-primary" />
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-3xl font-bold pt-2">
                      {plan.price} <span className="text-base font-normal text-muted-foreground">/ {plan.per}</span>
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
                      onClick={() => (user ? navigate(`/checkout?plan=${plan.planKey}`) : navigate("/auth?redirect=/pricing"))}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Havi csomagok</h2>
          <p className="text-muted-foreground mb-4 max-w-2xl">Ha rendszeresen jönnek levelek vagy sok a dokumentum, olcsóbb a havi limit.</p>
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
                    {plan.price} <span className="text-base font-normal text-muted-foreground">/ {plan.per}</span>
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
                    onClick={() => (user ? navigate(`/checkout?plan=${plan.planKey}`) : navigate("/auth?redirect=/pricing"))}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
