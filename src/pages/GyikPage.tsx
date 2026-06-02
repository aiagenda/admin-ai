import { Card, CardContent } from "@/components/ui/card";
import { PageSEO } from "@/components/PageSEO";

const faqItems = [
  {
    q: "Mi az a NAV határozat és mit kell tenni vele?",
    a: "A NAV határozat hivatalos döntés vagy felszólítás. Először ellenőrizd a határidőt, majd a teendőket. Az AdminAI segít közérthetően értelmezni a dokumentumot és kiemeli a fontos lépéseket.",
  },
  {
    q: "Biztonságos-e feltölteni a dokumentumaimat az AdminAI-ba?",
    a: "Igen, a dokumentumok védett környezetben tárolódnak, és a hozzáférés jogosultsághoz kötött. A cél, hogy a vállalkozási adminisztráció gyorsabb legyen, adatbiztonsági kompromisszum nélkül.",
  },
  {
    q: "Tudja kezelni az AdminAI a kézzel írt számlákat?",
    a: "A rendszer OCR-t használ, amely támogatja a fotózott és szkennelt dokumentumokat. Kézzel írt elemeknél a pontosság dokumentumminőségtől függ, de az AI segít a javításban és visszaellenőrzésben.",
  },
  {
    q: "Milyen dokumentumokat ismer fel az AdminAI?",
    a: "NAV levelek, hatósági értesítések, számlák és egyéb adminisztratív dokumentumok feldolgozására készült. A cél a gyors értelmezés, teendők és határidők egyértelmű megjelenítése.",
  },
  {
    q: "Hogyan exportálhatom a számlák adatait Excelbe?",
    a: "A könyvelés modulban a feldolgozott számlák exportálhatók táblázatos formátumba, így gyorsabban küldhetők tovább könyvelőnek vagy belső riportokhoz.",
  },
];

export default function GyikPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="gyik" path="/gyik" structuredData={schema} />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">Gyakori kérdések (GYIK)</h1>
        <p className="text-muted-foreground">
          Összegyűjtöttük az AdminAI leggyakoribb kérdéseit a dokumentum értelmezésről, OCR-ről és könyvelési workflow-ról.
        </p>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <Card key={item.q}>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-2">{item.q}</h2>
                <p className="text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
