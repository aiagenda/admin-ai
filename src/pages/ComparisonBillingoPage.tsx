import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

export default function ComparisonBillingoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="comparisonBillingo" path="/adminai-vs-billingo" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">AdminAI vs Billingo</h1>
        <p className="text-lg text-muted-foreground">
          A Billingo kiváló a kimenő számlázási folyamatokra. Az AdminAI más problémát old meg: mit jelent a kapott hivatalos dokumentum,
          és mi a következő teendő.
        </p>

        <h2 className="text-2xl font-semibold">Nem helyettesítés, hanem kiegészítés</h2>
        <p>
          Sok vállalkozásnál a legjobb workflow az, ha a számlázás marad Billingóban, miközben a bejövő levelek és vegyes dokumentumok
          értelmezése AdminAI-ban történik.
        </p>

        <h2 className="text-2xl font-semibold">Miben ad extra értéket az AdminAI?</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Hivatalos levelek közérthető kivonata</li>
          <li>Teendőlista és határidőfókusz</li>
          <li>Nem csak számlák: vegyes dokumentumtípusok kezelése</li>
          <li>Dokumentum-archívum + AI keresés</li>
        </ul>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/auth")}>Próbáld ki ingyen</Button>
          <Button variant="outline" onClick={() => navigate("/dokumentum-archivum")}>Dokumentum archívum</Button>
        </div>

        <p className="text-sm">
          Másik összehasonlítás: <Link to="/adminai-vs-szamlazz" className="text-primary underline">AdminAI vs Számlázz.hu</Link>
        </p>
      </div>
    </div>
  );
}
