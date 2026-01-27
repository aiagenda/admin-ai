import { AISearch } from "@/components/AISearch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Sparkles, HelpCircle } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

export default function Search() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">AI Keresés</h1>
            <HelpTooltip
              message="Kérdezz bármit a dokumentumaidról, elemzéseidről vagy űrlapokról természetes nyelven. Példa: 'Volt-e már ilyen dokumentummal dolgunk?' vagy 'Keresse meg az összes NAV-tól kapott levelet'"
              link="/help#search"
            />
          </div>
          <p className="text-muted-foreground">
            Kérdezz természetes nyelven, és az AI segít megtalálni, amit keresel.
          </p>
        </div>

        {/* Main Search */}
        <AISearch />

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Példa kérdések
            </CardTitle>
            <CardDescription>
              Próbáld ki ezeket a kérdéseket, hogy lássad, mit tud az AI keresés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Dokumentum keresés</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Volt-e már ilyen dokumentummal dolgunk?"</li>
                  <li>• "Keresse meg az összes NAV-tól kapott levelet"</li>
                  <li>• "Mikor kaptam utoljára határidős levelet?"</li>
                  <li>• "Mutasd az összes adóbevallással kapcsolatos dokumentumot"</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Űrlap keresés</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Melyik űrlapot kell kitöltenem?"</li>
                  <li>• "NAV űrlapok"</li>
                  <li>• "Adóbevallási nyomtatványok"</li>
                  <li>• "Online kitölthető űrlapok"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Tippek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Használj konkrét kategóriákat (pl. "NAV", "TB", "adó")</li>
              <li>• Dátumokat is megadhatsz (pl. "2024 január")</li>
              <li>• Kérdezz természetes nyelven, mintha egy embernek írnál</li>
              <li>• A keresés a saját dokumentumaidban és az elérhető űrlapokban keres</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

