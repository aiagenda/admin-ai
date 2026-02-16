import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Lightbulb, BookOpen, Globe, FileText, Building2, GraduationCap, Heart, Car, Home, Briefcase, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SmartSuggestionsProps {
  category: string | null;
  tags: string[] | null;
  severity?: "info" | "action_needed" | "urgent";
}

interface Suggestion {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  priority: "high" | "medium" | "low";
}

const categorySuggestions: Record<string, Suggestion[]> = {
  adozas: [
    {
      title: "NAV Ügyfélportál",
      description: "Adóbevallás, adófizetés, adóügyek kezelése",
      url: "https://nav.gov.hu/ugyfeliranytu",
      icon: <Globe className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "NAV Adatbázisok",
      description: "Adószám lekérdezés, árverések, adóhiányosok",
      url: "https://nav.gov.hu/adatbazisok",
      icon: <BookOpen className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "eBEV Online",
      description: "Elektronikus bevallás benyújtása",
      url: "https://ebev.nav.gov.hu/",
      icon: <FileText className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  egeszsegugy: [
    {
      title: "NEAK - Egészségbiztosító",
      description: "Egészségbiztosítási információk és ügyintézés",
      url: "https://www.neak.gov.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "EESZT Portál",
      description: "Elektronikus egészségügyi szolgáltatások",
      url: "https://www.eeszt.gov.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Kormányablak - TB ügyek",
      description: "Társadalombiztosítási ügyintézés",
      url: "https://kormanyablak.hu/hu/feladatkorok/172",
      icon: <Globe className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  oktatas: [
    {
      title: "Felvi.hu",
      description: "Felsőoktatási felvételi információk",
      url: "https://www.felvi.hu/",
      icon: <GraduationCap className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Oktatási Hivatal",
      description: "Oktatási információk és szolgáltatások",
      url: "https://www.oktatas.hu/",
      icon: <BookOpen className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "KRÉTA",
      description: "Köznevelési regisztrációs és tanulmányi rendszer",
      url: "https://kfranklinsulinaplo.e-kreta.hu/",
      icon: <GraduationCap className="h-5 w-5" />,
      priority: "low",
    },
  ],
  szocialis: [
    {
      title: "Magyar Államkincstár",
      description: "Családtámogatások, szociális ellátások",
      url: "https://www.allamkincstar.gov.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Kormányablak - Családtámogatás",
      description: "Családi pótlék és támogatások ügyintézése",
      url: "https://kormanyablak.hu/hu/feladatkorok/7",
      icon: <Heart className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "Nyugdíjfolyósító",
      description: "Nyugdíj információk és ügyintézés",
      url: "https://www.allamkincstar.gov.hu/hu/koltsegvetesi-ugyek/nyugdijszakigazgatas",
      icon: <HelpCircle className="h-5 w-5" />,
      priority: "low",
    },
  ],
  kozlekedes: [
    {
      title: "Közlekedési Alkalmassági Vizsgaközpont",
      description: "Jogosítvány, gépjármű ügyintézés",
      url: "https://www.kavk.hu/",
      icon: <Car className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Kormányablak - Közlekedés",
      description: "Közlekedési ügyintézés információk",
      url: "https://kormanyablak.hu/hu/feladatkorok/104",
      icon: <Car className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "eBEV - Gépjárműadó",
      description: "Gépjárműadó bevallás és fizetés",
      url: "https://nav.gov.hu/ugyfeliranytu/elethelyzetek-adozasa/gepjarmuado",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
    },
  ],
  ingatlan: [
    {
      title: "E-ingatlan-nyilvántartás",
      description: "Tulajdoni lap, ingatlan lekérdezés",
      url: "https://www.foldhivatal.hu/",
      icon: <Home className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Kormányablak - Ingatlan",
      description: "Ingatlan ügyintézés és tulajdonjog",
      url: "https://kormanyablak.hu/hu/feladatkorok/91",
      icon: <Home className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  uzlet: [
    {
      title: "Céginfo - e-Cégjegyzék",
      description: "Céginformációk lekérdezése",
      url: "https://www.e-cegjegyzek.hu/",
      icon: <Building2 className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "NAV - Vállalkozások",
      description: "Vállalkozói ügyintézés a NAV-nál",
      url: "https://nav.gov.hu/ugyfeliranytu/elethelyzetek-adozasa/vallalkozas_inditas",
      icon: <Briefcase className="h-5 w-5" />,
      priority: "medium",
    },
  ],
};

const tagBasedSuggestions: Record<string, Suggestion[]> = {
  hitel: [
    {
      title: "Magyar Nemzeti Bank",
      description: "Hitel információk és fogyasztóvédelem",
      url: "https://www.mnb.hu/fogyasztovedelem",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
  bank: [
    {
      title: "MNB - Pénzügyi Fogyasztóvédelem",
      description: "Banki panaszok, fogyasztóvédelem",
      url: "https://www.mnb.hu/fogyasztovedelem",
      icon: <Building2 className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  fizetés: [
    {
      title: "NAV - Befizetés",
      description: "Adófizetési módok és számlaszámok",
      url: "https://nav.gov.hu/ugyfeliranytu/elethelyzetek-adozasa/befizetesek",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
    },
  ],
  végrehajtás: [
    {
      title: "Bírósági Végrehajtók Kamarája",
      description: "Végrehajtási ügyek, jogorvoslat",
      url: "https://www.mbvk.hu/",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
  hiánypótlás: [
    {
      title: "NAV Ügyféliránytű",
      description: "Hiánypótlás, határidők, teendők",
      url: "https://nav.gov.hu/ugyfeliranytu/eljarasi-kerdesek",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
};

export function SmartSuggestions({ category, tags, severity }: SmartSuggestionsProps) {
  const suggestions: Suggestion[] = [];

  // Add category-based suggestions
  if (category && categorySuggestions[category]) {
    suggestions.push(...categorySuggestions[category]);
  }

  // Add tag-based suggestions
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (tagBasedSuggestions[lowerTag]) {
        suggestions.push(...tagBasedSuggestions[lowerTag]);
      }
    }
  }

  // Remove duplicates based on URL
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) => index === self.findIndex((s) => s.url === suggestion.url)
  );

  // Sort by priority (high first) and limit to 3
  const sortedSuggestions = uniqueSuggestions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  // Only show if there are suggestions
  if (sortedSuggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Hasznos linkek és javaslatok
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          A dokumentum típusa alapján ajánlott oldalak és információk
        </p>
      </CardHeader>
      <CardContent>
        {sortedSuggestions.length > 0 ? (
          <div className="space-y-3">
            {sortedSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5 text-primary">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => window.open(suggestion.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Megnyitás
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">
              {category || tags?.length ? (
                <>Nincs elérhető javaslat a dokumentum típusához.</>
              ) : (
                <>A dokumentum kategorizálása után itt jelennek meg a releváns linkek és javaslatok.</>
              )}
            </p>
            {!category && !tags?.length && (
              <p className="text-xs mt-2 opacity-75">
                Kategória: {category || "nincs"} | Címkék: {tags?.length || 0}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

