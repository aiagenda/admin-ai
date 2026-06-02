import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronUp, FileText, Upload, Archive, GitCompare, Tag, Calendar, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { PageSEO } from "@/components/PageSEO";
import { useTranslation } from "react-i18next";
import { isUsMarket } from "@/lib/market";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Általános",
    question: "Mi az AdminAI?",
    answer: "Az AdminAI egy intelligens dokumentumelemző szolgáltatás, amely segít megérteni a hivatalos dokumentumokat. Feltölt egy PDF-et, és mi magyarul elmagyarázzuk, miről szól és mit kell tennie.",
  },
  {
    category: "Általános",
    question: "Hogyan működik?",
    answer: "Egyszerűen töltse fel PDF dokumentumát. Az AI rendszerünk elemzi a dokumentumot, kinyeri a fontos információkat (határidők, összegek, bankszámlaszámok), és kétféle magyarázatot ad: egy egyszerű, mindennapi nyelven, és egy részletes, professzionális értelmezést.",
  },
  {
    category: "Feltöltés",
    question: "Milyen fájlformátumokat támogat?",
    answer: "Jelenleg csak PDF formátumú dokumentumokat tudunk feldolgozni. A PDF lehet szöveges vagy szkennelt (képes) dokumentum is - mindkettőt feldolgozzuk.",
  },
  {
    category: "Feltöltés",
    question: "Mennyi ideig tart az elemzés?",
    answer: "Az elemzés általában 30-60 másodpercig tart, attól függően, hogy a dokumentum hány oldalas és milyen típusú. Szkennelt dokumentumok esetén az OCR folyamat miatt kicsit hosszabb lehet.",
  },
  {
    category: "Feltöltés",
    question: "Mi történik, ha a dokumentum feldolgozása sikertelen?",
    answer: "Ha hiba történik, a dokumentum státusza 'Hiba' lesz. Ebben az esetben próbálja meg újra feltölteni a dokumentumot, vagy ellenőrizze, hogy a fájl nem sérült-e.",
  },
  {
    category: "Eredmények",
    question: "Mi a különbség az 'Egyszerű magyarázat' és a 'Részletes magyarázat' között?",
    answer: "Az 'Egyszerű magyarázat' mindennapi nyelven, példákkal segít megérteni a dokumentumot. A 'Részletes magyarázat' professzionális, jogi szempontból pontosabb értelmezést ad, példák nélkül.",
  },
  {
    category: "Eredmények",
    question: "Mit jelent a sürgősségi szint?",
    answer: "A sürgősségi szintek: 'Sürgős' (piros) - azonnali intézkedés szükséges, 'Teendő' (sárga) - cselekvésre van szükség, 'Információ' (kék) - csak tájékoztató jellegű.",
  },
  {
    category: "Eredmények",
    question: "Hogyan jelölhetem meg a teendőket késznek?",
    answer: "Az elemzés oldalon a 'Mit kell tennie?' szekcióban minden lépés mellett van egy jelölőnégyzet. Kattintson rá, hogy megjelölje a lépést késznek. A haladás százalékos mutatóval is követhető.",
  },
  {
    category: "Archívum",
    question: "Hogyan kereshetek dokumentumokat?",
    answer: "Az archívum oldalon a keresőmezőbe írhatja be a fájl nevét. Emellett szűrhet státusz (befejezett, feldolgozás alatt, hiba), sürgősség, kategória vagy címke szerint is.",
  },
  {
    category: "Archívum",
    question: "Hogyan adhatok hozzá címkéket?",
    answer: "Minden dokumentum mellett van egy címke ikon. Kattintson rá, majd a megnyíló ablakban írja be az új címke nevét és nyomja meg az Entert, vagy kattintson a + gombra. A címkéket később eltávolíthatja is.",
  },
  {
    category: "Archívum",
    question: "Hogyan hasonlíthatom össze két dokumentumot?",
    answer: "Az archívum oldalon minden dokumentum mellett van egy összehasonlítás ikon (két nyíl). Kattintson az első dokumentumra, majd a másodikra. Automatikusan megnyílik az összehasonlítás oldal, ahol láthatja a különbségeket.",
  },
  {
    category: "Exportálás",
    question: "Hogyan exportálhatom az elemzést?",
    answer: "Az elemzés oldalon a 'PDF letöltése' gombbal letöltheti az elemzést PDF formátumban. A PDF tartalmazza az összes fontos információt szép, professzionális formátumban.",
  },
  {
    category: "Exportálás",
    question: "Hogyan oszthatom meg az elemzést?",
    answer: "Az elemzés oldalon a 'Megosztás' gombbal generálhat egy megosztási linket. Ez a link csak olvasási jogot ad, így biztonságosan megoszthatja másokkal.",
  },
  {
    category: "Exportálás",
    question: "Hogyan adom át a könyvelőnek táblázatban (CSV / Excel)?",
    answer: "Menjen a Dokumentum archívumba. Ott az „CSV / Excel könyvelőnek” exporttal letölthető listát állíthat össze (szűrés, dátum, összeg, határidő). Az elemzés oldalról is van gyorslink az archívumba a könyvelő exporttal.",
  },
  {
    category: "Határidők",
    question: "Hogyan exportálhatom a határidőket naptárba?",
    answer: "Az elemzés oldalon a határidő mellett van egy 'Naptárba exportálás' gomb. Ez egy iCal fájlt generál, amit importálhat Google Calendar-ba vagy más naptáralkalmazásba.",
  },
  {
    category: "Biztonság",
    question: "Biztonságosak-e a dokumentumaim?",
    answer: "Igen. Minden dokumentum titkosítva van, és csak Ön férhet hozzá. A dokumentumokat Supabase biztonságos felhőszolgáltatásában tároljuk, amely megfelel az EU adatvédelmi előírásoknak.",
  },
  {
    category: "Biztonság",
    question: "Törlődnek-e a dokumentumaim?",
    answer: "A dokumentumok addig maradnak az archívumban, amíg Ön nem törli őket. Bármikor törölhet egy vagy több dokumentumot az archívum oldalról.",
  },
];

const categories = ["Általános", "Feltöltés", "Eredmények", "Archívum", "Exportálás", "Határidők", "Biztonság"];

export default function Help() {
  const { t: th } = useTranslation("help");
  const us = isUsMarket();
  const i18nFaq = us ? (th("faq", { returnObjects: true }) as FAQItem[]) : null;
  const activeFaqData = i18nFaq && Array.isArray(i18nFaq) && i18nFaq.length > 0 ? i18nFaq : faqData;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  const categoryList = us ? [...new Set(activeFaqData.map((f) => f.category))] : categories;
  const filteredFAQs = selectedCategory === "all" 
    ? activeFaqData 
    : activeFaqData.filter((faq) => faq.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Feltöltés":
      case "Upload":
        return <Upload className="h-5 w-5" />;
      case "Eredmények":
      case "Results":
        return <FileText className="h-5 w-5" />;
      case "Archívum":
      case "Archive":
        return <Archive className="h-5 w-5" />;
      case "Exportálás":
      case "Export":
        return <FileText className="h-5 w-5" />;
      case "Határidők":
      case "Deadlines":
        return <Calendar className="h-5 w-5" />;
      case "Biztonság":
      case "Security":
      case "Privacy":
      case "Billing":
        return <HelpCircle className="h-5 w-5" />;
      case "Általános":
      case "General":
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  const categoryLabel = (cat: string) =>
    us ? th(`categories.${cat}`, { defaultValue: cat }) : cat;

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="help" path="/help" structuredData={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: activeFaqData.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }} />
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" />
{us ? th("pageTitle") : "Segítség és GYIK"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {us ? th("pageSubtitle") : "Keresse meg a választ kérdéseire, vagy ismerkedjen meg az AdminAI funkcióival"}
          </p>
        </div>

        {!us && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("Feltöltés")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Feltöltés</h3>
                  <p className="text-xs text-muted-foreground">Dokumentum feltöltése</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("Eredmények")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Eredmények</h3>
                  <p className="text-xs text-muted-foreground">Elemzés megértése</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("Archívum")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Archive className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Archívum</h3>
                  <p className="text-xs text-muted-foreground">Dokumentumok kezelése</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("Exportálás")}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">Exportálás</h3>
                  <p className="text-xs text-muted-foreground">PDF és megosztás</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            {us ? th("allCategories") : "Összes"}
          </Button>
          {categoryList.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {getCategoryIcon(cat)}
              <span className="ml-2">{categoryLabel(cat)}</span>
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => {
            const globalIndex = activeFaqData.findIndex((f) => f === faq);
            const isOpen = openItems.has(globalIndex);

            return (
              <Card key={globalIndex}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleItem(globalIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {getCategoryIcon(faq.category)}
                      <CardTitle className="text-base">{faq.question}</CardTitle>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>{us ? th("stillNeedHelp") : "Még mindig nem találja a választ?"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {us ? th("contactBlurb") : "Ha további segítségre van szüksége, kérjük, lépjen kapcsolatba velünk."}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/">{us ? th("backHome") : "Vissza a főoldalra"}</Link>
              </Button>
              <Button asChild>
                <Link to="/upload">{us ? th("uploadDocument") : "Dokumentum feltöltése"}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

