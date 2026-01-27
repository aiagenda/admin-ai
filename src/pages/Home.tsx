import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, Clock, Shield, Upload, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DeadlineReminder } from "@/components/DeadlineReminder";
import { UsageLimit } from "@/components/UsageLimit";
import { AISearch } from "@/components/AISearch";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    completedAnalyses: 0,
    urgentDeadlines: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Total documents
        const { count: docCount } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Completed analyses
        const { data: userDocs } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", user.id);

        const { count: analysisCount } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .in(
            "document_id",
            userDocs?.map((d) => d.id) || []
          );

        // Urgent deadlines (next 7 days)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const { count: urgentCount } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .not("deadline", "is", null)
          .gte("deadline", new Date().toISOString())
          .lte("deadline", sevenDaysFromNow.toISOString())
          .in(
            "document_id",
            userDocs?.map((d) => d.id) || []
          );

        setStats({
          totalDocuments: docCount || 0,
          completedAnalyses: analysisCount || 0,
          urgentDeadlines: urgentCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="min-h-screen">
      {user ? (
        /* Dashboard for logged-in users */
        <div className="container mx-auto max-w-6xl py-12 px-4 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Üdvözöljük, {user.email?.split("@")[0]}!</h1>
            <p className="text-muted-foreground mt-2">Itt van az Ön áttekintése</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Összes dokumentum</p>
                    <p className="text-2xl font-bold">
                      <AnimatedNumber 
                        value={stats.totalDocuments} 
                        duration={2000}
                        startDelay={100}
                      />
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Befejezett elemzések</p>
                    <p className="text-2xl font-bold">
                      <AnimatedNumber 
                        value={stats.completedAnalyses} 
                        duration={2000}
                        startDelay={300}
                      />
                    </p>
                  </div>
                  <Sparkles className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sürgős határidők</p>
                    <p className="text-2xl font-bold">
                      <AnimatedNumber 
                        value={stats.urgentDeadlines} 
                        duration={2000}
                        startDelay={500}
                        formatter={(value) => 
                          value > 0 ? (
                            <Badge variant="destructive">{value}</Badge>
                          ) : (
                            value
                          )
                        }
                      />
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow touch-manipulation min-h-[44px]" onClick={() => navigate("/upload")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">Új dokumentum feltöltése</h3>
                    <p className="text-sm text-muted-foreground">Töltse fel PDF dokumentumát elemzéshez</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow touch-manipulation min-h-[44px]" onClick={() => navigate("/archive")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Archive className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">Dokumentum archívum</h3>
                    <p className="text-sm text-muted-foreground">Tekintse meg az összes dokumentumát</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Deadlines Widget */}
          <DeadlineReminder />

          {/* Usage Limit Widget */}
          <UsageLimit />

          {/* AI Search Widget */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Keresés</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Kérdezz bármit a dokumentumaidról természetes nyelven. Példa: "Volt-e már ilyen dokumentummal dolgunk?" vagy "Keresse meg az összes NAV-tól kapott levelet"
                  </p>
                </div>
                <AISearch />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Public landing page */
        <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
              Hivatalos dokumentumok{" "}
              <span className="text-primary">egyszerűen</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Töltse fel dokumentumait, és mi magyarul elmagyarázzuk, miről szól és mit kell tennie.
            </p>

            {/* ÚJ SZLOGEN BLOKK */}
            <p className="text-md sm:text-lg text-foreground font-medium max-w-2xl mx-auto">
              A ChatGPT-nek elmagyarázhatod, mit kaptál.
              <br />
              Az <span className="font-semibold text-primary">AdminAI</span> viszont
              elmagyarázza <span className="font-semibold">neked</span>, mit kaptál.
            </p>
            {/* --- VÉGE --- */}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => navigate(user ? "/upload" : "/auth")}
                className="text-lg px-8"
              >
                <FileText className="mr-2 h-5 w-5" />
                Dokumentum feltöltése
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/pricing")}
                className="text-lg px-8"
              >
                Árak megtekintése
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Hogyan működik?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Töltse fel</h3>
                <p className="text-muted-foreground">
                  Töltse fel PDF vagy szöveges dokumentumát egyszerűen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Elemzés</h3>
                <p className="text-muted-foreground">
                  AI rendszerünk elemzi és értelmezi a dokumentumot
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Lépések</h3>
                <p className="text-muted-foreground">
                  Megkapja a teendőket és határidőket egyszerűen
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/50 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Miért az AdminAI?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <Shield className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Biztonságos</h3>
                <p className="text-muted-foreground">
                  Dokumentumai biztonságosan tárolva, csak Ön férhet hozzá
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Gyors elemzés</h3>
                <p className="text-muted-foreground">
                  Percek alatt megkapja az egyszerű magyarázatot
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Határidők</h3>
                <p className="text-muted-foreground">
                  Automatikus határidő figyelmeztetés, hogy ne maradjon le semmiről
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <FileText className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Archívum</h3>
                <p className="text-muted-foreground">
                  Minden dokumentum és elemzés egy helyen megtalálható
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Kezdje el most!</h2>
          <p className="text-lg text-muted-foreground">
            Nincs több bonyolult hivatali nyelv - érthető magyarázatok percek alatt
          </p>

          <Button
            size="lg"
            onClick={() => navigate(user ? "/upload" : "/auth")}
            className="text-lg px-8"
          >
            Első dokumentum feltöltése
          </Button>
        </div>
      </section>
        </>
      )}
    </div>
  );
}
