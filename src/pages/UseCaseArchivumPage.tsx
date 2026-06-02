import { Button } from "@/components/ui/button";
import { PageSEO } from "@/components/PageSEO";
import { useNavigate, Link } from "react-router-dom";

export default function UseCaseArchivumPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="useCaseArchive" path="/dokumentum-archivum" />
      <div className="container mx-auto max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold">Dokumentum archiválás és iratkezelő szoftver KKV-knak</h1>
        <p className="text-lg text-muted-foreground">
          A digitális iratkezelés akkor működik jól, ha nem csak tárol, hanem visszakereshetővé és értelmezhetővé teszi a dokumentumokat.
          Az GovLetter ezt adja meg kis- és középvállalkozásoknak.
        </p>

        <h2 className="text-2xl font-semibold">Miért fontos a jó dokumentum archiválás?</h2>
        <p>
          Ha egy határidős levél vagy számla napokkal később kerül elő, az költséget és stresszt jelent. Egy modern iratkezelő
          szoftver KKV környezetben nem csak mappákat jelent, hanem gyors keresést, státusz követést és egyértelmű teendőket.
        </p>

        <h2 className="text-2xl font-semibold">Mit tud az GovLetter archívum?</h2>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Központi dokumentumtár a feltöltött anyagokhoz</li>
          <li>AI-alapú keresés a korábbi dokumentumok között</li>
          <li>Határidő-érzékeny dokumentumok kiemelése</li>
          <li>Kapcsolódó dokumentumok és verziók áttekintése</li>
        </ul>

        <h2 className="text-2xl font-semibold">Belső folyamatokhoz és könyveléshez is hasznos</h2>
        <p>
          Az archívum értéke akkor nő igazán, ha összekötöd az OCR és export folyamattal. Így a bejövő számlák, NAV levelek és
          egyéb dokumentumok egyetlen workflow-ban kezelhetők. Erről többet itt: <Link className="text-primary underline" to="/szamla-ocr">Számla OCR</Link>.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/archive")}>Archívum megnyitása</Button>
          <Button variant="outline" onClick={() => navigate("/auth")}>Ingyenes kipróbálás</Button>
        </div>
      </div>
    </div>
  );
}
