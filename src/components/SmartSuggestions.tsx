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
      title: "NAV Online",
      description: "Adóbevallás, adófizetés, adóügyek kezelése",
      url: "https://www.nav.gov.hu/nav/online-szolgaltatasok",
      icon: <Globe className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Adóbevallási útmutató",
      description: "Részletes útmutató az adóbevalláshoz",
      url: "https://www.nav.gov.hu/nav/adobevallas",
      icon: <BookOpen className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "Adószám lekérdezés",
      description: "Ellenőrizze az adószámát",
      url: "https://www.nav.gov.hu/nav/adoszam-lekerdezes",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
    },
  ],
  egeszsegugy: [
    {
      title: "Egészségügyi Szolgáltatásért Felelős Államtitkárság",
      description: "Egészségügyi információk és szolgáltatások",
      url: "https://www.efka.gov.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Társadalombiztosítási Információs Szolgálat",
      description: "TB információk és ügyintézés",
      url: "https://www.tb.gov.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Orvosi rendelés",
      description: "Online orvosi időpontfoglalás",
      url: "https://www.eeszt.gov.hu/",
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
      title: "Ösztöndíj információk",
      description: "Ösztöndíjak és támogatások",
      url: "https://www.oktatas.hu/kozneveles/tamogatasok",
      icon: <GraduationCap className="h-5 w-5" />,
      priority: "low",
    },
  ],
  szocialis: [
    {
      title: "Szociális és Gyermekvédelmi Főigazgatóság",
      description: "Szociális támogatások és szolgáltatások",
      url: "https://www.szgyf.hu/",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Családi pótlék",
      description: "Családi pótlék és támogatások",
      url: "https://www.kormany.hu/hu/szocialis-politikaert-felelos-allamtitkarsag/tartalom/csaladi-potlek",
      icon: <Heart className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "Nyugdíjügyi Információs Szolgálat",
      description: "Nyugdíj információk",
      url: "https://www.nyugdij.hu/",
      icon: <HelpCircle className="h-5 w-5" />,
      priority: "low",
    },
  ],
  kozlekedes: [
    {
      title: "Közlekedési Hatóság",
      description: "Közlekedési információk és ügyintézés",
      url: "https://www.kh.gov.hu/",
      icon: <Car className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Jogosítvány információk",
      description: "Jogosítvány és forgalmi információk",
      url: "https://www.kh.gov.hu/jogositvany",
      icon: <Car className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "Közlekedési bírság",
      description: "Közlekedési bírságok és fizetés",
      url: "https://www.kh.gov.hu/kozlekedesi-birsag",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
    },
  ],
  ingatlan: [
    {
      title: "Földhivatal",
      description: "Ingatlan ügyintézés és információk",
      url: "https://www.foldhivatal.hu/",
      icon: <Home className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Ingatlan adásvétel",
      description: "Ingatlan adásvételi információk",
      url: "https://www.foldhivatal.hu/ingatlan-adasvetel",
      icon: <Home className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  uzlet: [
    {
      title: "Céginformációs Portál",
      description: "Cég információk és ügyintézés",
      url: "https://www.ceginformaciosszolgalat.hu/",
      icon: <Building2 className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Vállalkozás indítása",
      description: "Vállalkozás indítási útmutató",
      url: "https://www.ceginformaciosszolgalat.hu/vallalkozas-inditasa",
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
      url: "https://www.mnb.hu/",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
  bank: [
    {
      title: "Banki információk",
      description: "Banki szolgáltatások és információk",
      url: "https://www.mnb.hu/bankfelugyelet",
      icon: <Building2 className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  fizetés: [
    {
      title: "Fizetési információk",
      description: "Fizetési módok és információk",
      url: "https://www.nav.gov.hu/nav/fizetes",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
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

