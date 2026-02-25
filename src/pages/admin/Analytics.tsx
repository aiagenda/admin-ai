import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, FileText, TrendingUp, MessageSquare, BarChart3, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { hu } from "date-fns/locale";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalDocuments: number;
  completedAnalyses: number;
  feedbackStats: {
    helpful: number;
    not_helpful: number;
    confusing: number;
    total: number;
  };
  tabUsage: {
    simple: number;
    detailed: number;
  };
  categoryDistribution: Record<string, number>;
  conversionFunnel: {
    uploads: number;
    completed: number;
    feedback: number;
  };
  dailyStats: Array<{
    date: string;
    uploads: number;
    analyses: number;
  }>;
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = dateRange === "all" 
        ? null 
        : dateRange === "7d" 
        ? subDays(new Date(), 7).toISOString()
        : subDays(new Date(), 30).toISOString();

      // Regisztrált és aktív felhasználók (admin RPC – auth.users)
      let totalUsers = 0;
      let activeUsers = 0;
      const { data: userStats } = await supabase.rpc('get_admin_user_stats');
      if (userStats && !(userStats as any).error) {
        totalUsers = Number((userStats as any).registered) || 0;
        activeUsers = Number((userStats as any).active_30d) || 0;
      }

      // Total documents
      const totalDocsQuery = startDate
        ? supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .gte("upload_date", startDate)
        : supabase
            .from("documents")
            .select("*", { count: "exact", head: true });

      const { count: totalDocuments } = await totalDocsQuery;

      // Completed analyses
      const completedQuery = startDate
        ? supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startDate)
        : supabase
            .from("analyses")
            .select("*", { count: "exact", head: true });

      const { count: completedAnalyses } = await completedQuery;

      // Feedback stats
      const feedbackQuery = startDate
        ? supabase
            .from("analysis_feedback" as any)
            .select("feedback_type")
            .gte("created_at", startDate)
        : supabase
            .from("analysis_feedback" as any)
            .select("feedback_type");

      const { data: feedbackData } = await feedbackQuery;
      const feedbackStats = {
        helpful: feedbackData?.filter((f: any) => f.feedback_type === "helpful").length || 0,
        not_helpful: feedbackData?.filter((f: any) => f.feedback_type === "not_helpful").length || 0,
        confusing: feedbackData?.filter((f: any) => f.feedback_type === "confusing").length || 0,
        total: feedbackData?.length || 0,
      };

      // Tab usage
      const tabQuery = startDate
        ? supabase
            .from("tab_view_analytics" as any)
            .select("tab_type")
            .gte("viewed_at", startDate)
        : supabase
            .from("tab_view_analytics" as any)
            .select("tab_type");

      const { data: tabData } = await tabQuery;
      const tabUsage = {
        simple: tabData?.filter((t: any) => t.tab_type === "simple").length || 0,
        detailed: tabData?.filter((t: any) => t.tab_type === "detailed").length || 0,
      };

      // Category distribution
      const { data: categoryData } = await supabase
        .from("documents")
        .select("category")
        .not("category", "is", null);

      const categoryDistribution: Record<string, number> = {};
      categoryData?.forEach((doc: any) => {
        if (doc.category) {
          categoryDistribution[doc.category] = (categoryDistribution[doc.category] || 0) + 1;
        }
      });

      // Conversion funnel
      const uploadsQuery = startDate
        ? supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .gte("upload_date", startDate)
        : supabase
            .from("documents")
            .select("*", { count: "exact", head: true });

      const { count: uploads } = await uploadsQuery;

      const completed = completedAnalyses || 0;
      const feedback = feedbackStats.total;

      // Daily stats (last 30 days)
      const dailyStats: Array<{ date: string; uploads: number; analyses: number }> = [];
      const daysToShow = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;

      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const { count: dayUploads } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .gte("upload_date", dayStart.toISOString())
          .lte("upload_date", dayEnd.toISOString());

        const { count: dayAnalyses } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString());

        dailyStats.push({
          date: dateStr,
          uploads: dayUploads || 0,
          analyses: dayAnalyses || 0,
        });
      }

      setData({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalDocuments: totalDocuments || 0,
        completedAnalyses: completedAnalyses || 0,
        feedbackStats,
        tabUsage,
        categoryDistribution,
        conversionFunnel: {
          uploads: uploads || 0,
          completed,
          feedback,
        },
        dailyStats,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      adozas: "Adóügyek",
      egeszsegugy: "Egészségügy",
      oktatas: "Oktatás",
      szocialis: "Szociális",
      kozlekedes: "Közlekedés",
      ingatlan: "Ingatlan",
      uzlet: "Üzlet",
      egyeb: "Egyéb",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Analitika betöltése...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nem sikerült betölteni az adatokat</p>
      </div>
    );
  }

  const feedbackHelpfulRate = data.feedbackStats.total > 0
    ? Math.round((data.feedbackStats.helpful / data.feedbackStats.total) * 100)
    : 0;

  const conversionRate = data.conversionFunnel.uploads > 0
    ? Math.round((data.conversionFunnel.completed / data.conversionFunnel.uploads) * 100)
    : 0;

  const feedbackRate = data.conversionFunnel.completed > 0
    ? Math.round((data.conversionFunnel.feedback / data.conversionFunnel.completed) * 100)
    : 0;

  const maxDailyValue = Math.max(
    ...data.dailyStats.map((d) => Math.max(d.uploads, d.analyses)),
    1
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/admin/forms")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vissza
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analitika Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Felhasználói engagement és termék metrikák
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2">
            <Button
              variant={dateRange === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("7d")}
            >
              7 nap
            </Button>
            <Button
              variant={dateRange === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("30d")}
            >
              30 nap
            </Button>
            <Button
              variant={dateRange === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("all")}
            >
              Összes
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Összes felhasználó
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-primary opacity-50" />
                <div>
                  <p className="text-2xl font-bold">{data.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.activeUsers} aktív (elmúlt 30 nap)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dokumentumok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary opacity-50" />
                <div>
                  <p className="text-2xl font-bold">{data.totalDocuments}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.completedAnalyses} elemzés kész
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Visszajelzések
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary opacity-50" />
                <div>
                  <p className="text-2xl font-bold">{data.feedbackStats.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {feedbackHelpfulRate}% hasznos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Konverzió
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    Feltöltés → Elemzés
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Visszajelzés Elemzés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hasznos</span>
                  <Badge variant="default" className="bg-green-600">
                    {data.feedbackStats.helpful}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${data.feedbackStats.total > 0 ? (data.feedbackStats.helpful / data.feedbackStats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nem hasznos</span>
                  <Badge variant="destructive">{data.feedbackStats.not_helpful}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${data.feedbackStats.total > 0 ? (data.feedbackStats.not_helpful / data.feedbackStats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Zavaros</span>
                  <Badge className="bg-warning text-warning-foreground">
                    {data.feedbackStats.confusing}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{
                      width: `${data.feedbackStats.total > 0 ? (data.feedbackStats.confusing / data.feedbackStats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tab Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Tab Használat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Egyszerű magyarázat</span>
                  <Badge>{data.tabUsage.simple}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${data.tabUsage.simple + data.tabUsage.detailed > 0 ? (data.tabUsage.simple / (data.tabUsage.simple + data.tabUsage.detailed)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Részletes magyarázat</span>
                  <Badge>{data.tabUsage.detailed}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{
                      width: `${data.tabUsage.simple + data.tabUsage.detailed > 0 ? (data.tabUsage.detailed / (data.tabUsage.simple + data.tabUsage.detailed)) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution & Conversion Funnel */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dokumentum Kategóriák</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.categoryDistribution).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs kategorizált dokumentum</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.categoryDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{getCategoryLabel(category)}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(count / Math.max(...Object.values(data.categoryDistribution))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Konverziós Tölcsér</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Feltöltések</span>
                  <Badge>{data.conversionFunnel.uploads}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Befejezett elemzések ({conversionRate}%)
                  </span>
                  <Badge>{data.conversionFunnel.completed}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{
                      width: `${conversionRate}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Visszajelzések ({feedbackRate}%)
                  </span>
                  <Badge>{data.conversionFunnel.feedback}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full"
                    style={{
                      width: `${feedbackRate}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Stats Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Napi Statisztikák
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end gap-1 h-48 border-b border-l">
                {data.dailyStats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end gap-1"
                  >
                    <div className="flex gap-0.5 w-full justify-center">
                      <div
                        className="bg-primary w-full rounded-t"
                        style={{
                          height: `${(stat.uploads / maxDailyValue) * 100}%`,
                          minHeight: stat.uploads > 0 ? "4px" : "0",
                        }}
                        title={`${stat.uploads} feltöltés`}
                      />
                      <div
                        className="bg-green-600 w-full rounded-t"
                        style={{
                          height: `${(stat.analyses / maxDailyValue) * 100}%`,
                          minHeight: stat.analyses > 0 ? "4px" : "0",
                        }}
                        title={`${stat.analyses} elemzés`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(new Date(stat.date), "MMM d", { locale: hu })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded" />
                  <span>Feltöltések</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded" />
                  <span>Elemzések</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

