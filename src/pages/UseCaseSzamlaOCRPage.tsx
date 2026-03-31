import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useNavigate, Link } from "react-router-dom";

export default function UseCaseSzamlaOCRPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <SEOHead
        title="Számla OCR és számla felismerés szoftver KKV-knak | AdminAI"
        description="Számla OCR magyar vállalkozásoknak: fotózd le a számlát, az AdminAI kiolvassa az adatokat és Excelbe exportálja könyveléshez."
        path="/szamla-ocr"
        keywords="számla OCR, számla felismerés szoftver, számla OCR KKV, könyvelés automatizálás"
      />
      <div className="container mx-auto max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold">Számla OCR és automatizált felismerés KKV-knak</h1>
        <p className="text-lg text-muted-foreground">
          A számla OCR célja egyszerű: ne kézzel kelljen begépelni a számlaadatokat. Az AdminAI a feltöltött számlákról kiolvassa
          a fő adatokat, segít kategorizálni őket, és exportálható formában adja tovább könyveléshez.
        </p>

        <h2 className="text-2xl font-semibold">Miben segít a számla felismerés szoftver?</h2>
        <p>
          Kis- és középvállalkozásoknál a számlakezelés gyakran ismétlődő, időigényes folyamat. Ha sok a számla, a manuális adatbevitel
          hibalehetőséget és extra admin terhet jelent. Az AdminAI OCR folyamata csökkenti az adminisztrációs időt,
          és egységesebb adatminőséget ad az exportokban.
        </p>

        <h2 className="text-2xl font-semibold">Mit kapsz a folyamat végén?</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Felismerhető számla mezők (szállító, összeg, dátum, adóadatok)</li>
          <li>Egységes tárolás és visszakereshetőség az archívumban</li>
          <li>Excel export könyvelőbarát formátumban</li>
          <li>Gyorsabb átadás a könyvelő felé</li>
        </ul>

        <h2 className="text-2xl font-semibold">Mikor jó választás?</h2>
        <p>
          Akkor, ha szeretnéd csökkenteni a kézi adminisztrációt, gyorsítani a könyvelési előkészítést, és átláthatóbban kezelni
          a vállalkozás dokumentumait. Ha a hivatalos levelek értelmezése is fontos, nézd meg a
          <Link className="text-primary underline" to="/nav-hatarozat-ertelmezes"> NAV határozat értelmezés </Link>
          oldalt is.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/invoices/upload")}>Számla feltöltése</Button>
          <Button variant="outline" onClick={() => navigate("/arak")}>Árak</Button>
        </div>
      </div>
    </div>
  );
}
