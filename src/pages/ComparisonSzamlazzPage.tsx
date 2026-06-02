import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

export default function ComparisonSzamlazzPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="comparisonSzamlazz" path="/govletter-vs-szamlazz" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">GovLetter vs Számlázz.hu</h1>
        <p className="text-lg text-muted-foreground">
          A Számlázz.hu piacvezető számlázó platform. Az GovLetter ezzel nem versenyez direktben a számlakiállításban,
          hanem a bejövő dokumentumok értelmezését és teendőkezelését oldja meg.
        </p>

        <h2 className="text-2xl font-semibold">Külön fókusz, külön erősség</h2>
        <p>
          Számlázz.hu: kimenő számlázás, compliance és pénzügyi admin. GovLetter: NAV levelek, határozatok és egyéb dokumentumok
          értelmezése, határidők és teendők kiemelése.
        </p>

        <h2 className="text-2xl font-semibold">Mikor érdemes GovLetter-t is használni?</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>Ha sok különböző hivatalos dokumentum érkezik</li>
          <li>Ha gyorsan kell érthető magyarázat és következő lépés</li>
          <li>Ha nem akarsz minden egyes levéllel külön szakértőt bevonni</li>
        </ul>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/auth")}>Ingyenes kipróbálás</Button>
          <Button variant="outline" onClick={() => navigate("/nav-hatarozat-ertelmezes")}>NAV értelmezés</Button>
        </div>

        <p className="text-sm">
          Általános AI összehasonlítás: <Link to="/govletter-vs-chatgpt" className="text-primary underline">GovLetter vs ChatGPT</Link>
        </p>
      </div>
    </div>
  );
}
