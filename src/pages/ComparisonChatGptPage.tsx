import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

export default function ComparisonChatGptPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="comparisonChatgpt" path="/adminai-vs-chatgpt" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">AdminAI vs ChatGPT dokumentum értelmezésre</h1>
        <p className="text-muted-foreground text-lg">
          A ChatGPT kiváló általános AI eszköz. Az AdminAI viszont kifejezetten magyar hivatalos dokumentumok értelmezésére,
          határidőkiemelésre és admin workflow-ra épül.
        </p>

        <h2 className="text-2xl font-semibold">Fő különbség</h2>
        <p>
          ChatGPT-ben általában neked kell kontextust adni, a teljes szöveget bemásolni, és külön kérni a teendőlistát.
          AdminAI-ban a folyamat eleve erre van tervezve: dokumentum feltöltés, értelmezés, teendők, határidők és archiválás egy helyen.
        </p>

        <h2 className="text-2xl font-semibold">Mikor jobb az AdminAI?</h2>
        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
          <li>NAV vagy hatósági levél gyors, közérthető értelmezése</li>
          <li>Határidők automatikus kiemelése és figyelése</li>
          <li>Számla OCR + export + könyvelési workflow</li>
          <li>Dokumentum archívum és visszakereshetőség</li>
        </ul>

        <p className="text-sm text-muted-foreground">
          Fontos: az AdminAI tájékoztató célú AI rendszer, nem helyettesíti a személyre szabott jogi tanácsadást.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/auth")}>Ingyenes kipróbálás</Button>
          <Button variant="outline" onClick={() => navigate("/nav-hatarozat-ertelmezes")}>NAV use case</Button>
        </div>

        <p className="text-sm">
          További összehasonlítások: <Link to="/adminai-vs-billingo" className="text-primary underline">AdminAI vs Billingo</Link>,{" "}
          <Link to="/adminai-vs-szamlazz" className="text-primary underline">AdminAI vs Számlázz.hu</Link>
        </p>
      </div>
    </div>
  );
}
