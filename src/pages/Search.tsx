import { AISearch } from "@/components/AISearch";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Sparkles, HelpCircle, FileText, ClipboardList, Lightbulb } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

export default function Search() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header with gradient */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <SearchIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">AI Keresés</h1>
                <HelpTooltip
                  message="Kérdezz bármit a dokumentumaidról természetes nyelven"
                  link="/help#search"
                />
              </div>
              <p className="text-muted-foreground">
                Kérdezz természetes nyelven, az AI megtalálja
              </p>
            </div>
          </div>
        </div>

        {/* Main Search - Enhanced */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 opacity-50" />
          <div className="relative p-6">
            <AISearch />
          </div>
        </div>

        {/* Quick suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Próbáld ki:</span>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            "NAV levelek"
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            "fizetési határidők"
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            "adóbevallás űrlapok"
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            "sürgős dokumentumok"
          </Badge>
        </div>

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Examples Card */}
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Példa kérdések</h3>
                <p className="text-sm text-muted-foreground">Dokumentum keresés</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>"Keresse meg az összes NAV-tól kapott levelet"</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>"Mikor kaptam utoljára határidős levelet?"</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>"Mutasd az adóbevallással kapcsolatos dokumentumokat"</span>
              </li>
            </ul>
          </div>

          {/* Forms Card */}
          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Űrlap keresés</h3>
                <p className="text-sm text-muted-foreground">Hivatalos nyomtatványok</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>"Melyik űrlapot kell kitöltenem?"</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>"NAV adóbevallási nyomtatványok"</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>"Online kitölthető űrlapok"</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Tippek a jobb kereséshez</h3>
              <p className="text-sm text-muted-foreground">Hogyan kérdezz hatékonyan</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Használj konkrét kategóriákat: "NAV", "TB", "adó"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Dátumokat is megadhatsz: "2024 január"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Kérdezz természetesen, mintha embernek írnál</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>A keresés a dokumentumaidban és űrlapokban keres</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
