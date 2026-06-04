import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, Clock, Shield, Upload, Archive, Receipt, TrendingUp, ChevronRight, PieChart, Search, ArrowRight, ScanLine, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DeadlineReminder } from "@/components/DeadlineReminder";
import { UsageLimit } from "@/components/UsageLimit";
import { AISearch } from "@/components/AISearch";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getAppDateLocale, formatMoney } from "@/lib/dateLocale";
import { getHomeCardOrder, type HomeCardId } from "@/lib/home-cards";
import { Link } from "react-router-dom";
import { PageSEO } from "@/components/PageSEO";
import { HomeLanding } from "@/components/HomeLanding";
import { useTranslation } from "react-i18next";
import { getSiteOrigin } from "@/lib/site";

// Time-based greeting
function getGreeting(t: (k: string) => string): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: t("homePage.greetingMorning"), emoji: "☀️" };
  if (hour >= 12 && hour < 18) return { text: t("homePage.greetingAfternoon"), emoji: "👋" };
  return { text: t("homePage.greetingEvening"), emoji: "🌙" };
}

const WELCOME_DISMISS_KEY = "govletter_welcome_dismissed";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    completedAnalyses: 0,
    urgentDeadlines: 0,
  });
  const [hasInvoiceAccess, setHasInvoiceAccess] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [invoiceStats, setInvoiceStats] = useState({
    monthlyVat: 0,
    monthlyNet: 0,
    monthlyGross: 0,
    invoiceCount: 0,
    completedCount: 0,
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

  // Check invoice access and fetch invoice stats
  useEffect(() => {
    if (!user) return;

    const fetchInvoiceData = async () => {
      try {
        // Check if admin
        const { data: adminData } = await supabase.rpc('is_admin');
        const isAdmin = adminData === true;

        if (!isAdmin) {
          // Check enterprise subscription
          try {
            const { data: subData } = await (supabase
              .from('user_subscriptions')
              .select('plan_type')
              .eq('user_id', user.id)
              .single()) as { data: { plan_type: string } | null };
            
            if (subData?.plan_type !== 'enterprise') {
              setHasInvoiceAccess(false);
              return;
            }
          } catch {
            setHasInvoiceAccess(false);
            return;
          }
        }

        setHasInvoiceAccess(true);

        // Fetch all invoices for user (same as InvoiceArchive), then filter by current month
        type InvoiceRow = {
          invoice_date: string | null;
          upload_date: string | null;
          status: string | null;
          vat_amount: number | null;
          net_amount: number | null;
          gross_amount: number | null;
        };
        const { data: allInvoices, error } = await (supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.id)
          .order('upload_date', { ascending: false })) as { data: InvoiceRow[] | null; error: unknown };

        if (error) {
          console.error("Error fetching invoice stats:", error);
          setInvoiceStats({
            monthlyVat: 0,
            monthlyNet: 0,
            monthlyGross: 0,
            invoiceCount: 0,
            completedCount: 0,
          });
          return;
        }

        const raw = allInvoices ?? [];
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        // Same month logic as InvoiceArchive: invoice_date || upload_date in [start, end]
        const list = raw.filter((inv) => {
          const dateStr = inv.invoice_date || inv.upload_date;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return false;
          return d >= start && d <= end;
        });
        const completed = list.filter((inv) => inv.status === 'completed');
        setInvoiceStats({
          monthlyVat: completed.reduce((sum, inv) => sum + (inv.vat_amount || 0), 0),
          monthlyNet: completed.reduce((sum, inv) => sum + (inv.net_amount || 0), 0),
          monthlyGross: completed.reduce((sum, inv) => sum + (inv.gross_amount || 0), 0),
          invoiceCount: list.length,
          completedCount: completed.length,
        });
      } catch (error) {
        console.error("Error fetching invoice data:", error);
        setInvoiceStats({
          monthlyVat: 0,
          monthlyNet: 0,
          monthlyGross: 0,
          invoiceCount: 0,
          completedCount: 0,
        });
      }
    };

    fetchInvoiceData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setWelcomeDismissed(localStorage.getItem(`${WELCOME_DISMISS_KEY}_${user.id}`) === "1");
  }, [user?.id]);

  const visibleCardOrder = useMemo(() => {
    const order = getHomeCardOrder();
    return order.filter((id) => id !== "invoices" || hasInvoiceAccess);
  }, [hasInvoiceAccess]);

  const cardOrderMap = useMemo(() => {
    const map = {};
    visibleCardOrder.forEach((id, i) => { map[id] = i; });
    return map;
  }, [visibleCardOrder]);

  const { t: tc } = useTranslation("common");
  const { t: seoT } = useTranslation("translation");
  const { t: navT } = useTranslation("nav");
  const { i18n } = useTranslation();

  const homeStructuredData = useMemo(() => {
    const origin = getSiteOrigin();
    const lang = "en-US";
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: navT("brand"),
          url: origin,
          logo: `${origin}/icon-512.png`,
        },
        {
          "@type": "WebSite",
          name: navT("brand"),
          url: origin,
          inLanguage: lang,
          description: seoT("seo.home.websiteDescription"),
        },
      ],
    };
  }, [i18n.language, navT, seoT]);

  return (
    <div className="min-h-screen">
      <PageSEO pageKey="home" path="/" structuredData={homeStructuredData} />
      {user ? (
        /* Dashboard for logged-in users */
        <div className="container mx-auto max-w-6xl py-12 px-4 flex flex-col gap-6">
          {/* Personalized Greeting */}
          <div className="flex items-center gap-3" data-tour="welcome">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {getGreeting(tc).text}, {user.email?.split("@")[0]}! 
                <span className="text-2xl">{getGreeting(tc).emoji}</span>
              </h1>
              <p className="text-muted-foreground mt-1">{tc("homePage.dashboardOverview")}</p>
            </div>
          </div>

          {!welcomeDismissed && (
            <div className="rounded-lg border bg-muted/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {tc("homePage.welcomeHint")}{" "}
                <Link to="/help" className="text-primary font-medium underline underline-offset-2 hover:no-underline">{tc("homePage.helpLink")}</Link>.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (user) {
                      localStorage.setItem(`${WELCOME_DISMISS_KEY}_${user.id}`, "1");
                      setWelcomeDismissed(true);
                    }
                  }}
                >
                  {tc("homePage.welcomeDismiss")}
                </Button>
              </div>
            </div>
          )}

          {/* Stats Cards - Modernized */}
          <div className="flex flex-col" style={{ order: cardOrderMap["stats"] ?? 0 }} data-tour="stats">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Documents Card - Blue accent */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600/70 dark:text-blue-400/70 font-medium">{tc("homePage.statDocuments")}</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      <AnimatedNumber 
                        value={stats.totalDocuments} 
                        duration={2000}
                        startDelay={100}
                      />
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analyses Card - Green accent */}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 font-medium">{tc("homePage.statAnalyses")}</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                      <AnimatedNumber 
                        value={stats.completedAnalyses} 
                        duration={2000}
                        startDelay={300}
                      />
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deadlines Card - Orange/Red accent */}
            <Card className={`relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow ${
              stats.urgentDeadlines > 0 
                ? "bg-gradient-to-br from-red-50 to-orange-100/50 dark:from-red-950/50 dark:to-orange-900/30" 
                : "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30"
            }`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 ${
                stats.urgentDeadlines > 0 ? "bg-red-500/10" : "bg-amber-500/10"
              }`} />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      stats.urgentDeadlines > 0 
                        ? "text-red-600/70 dark:text-red-400/70" 
                        : "text-amber-600/70 dark:text-amber-400/70"
                    }`}>{tc("homePage.statUrgentDeadlines")}</p>
                    <p className={`text-3xl font-bold ${
                      stats.urgentDeadlines > 0 
                        ? "text-red-700 dark:text-red-300" 
                        : "text-amber-700 dark:text-amber-300"
                    }`}>
                      {stats.urgentDeadlines > 0 ? (
                        <span className="flex items-center gap-2">
                          {stats.urgentDeadlines}
                          <Badge variant="destructive" className="text-xs">!</Badge>
                        </span>
                      ) : (
                        <AnimatedNumber 
                          value={stats.urgentDeadlines} 
                          duration={2000}
                          startDelay={500}
                        />
                      )}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    stats.urgentDeadlines > 0 ? "bg-red-500/20" : "bg-amber-500/20"
                  }`}>
                    <Clock className={`h-6 w-6 ${
                      stats.urgentDeadlines > 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-amber-600 dark:text-amber-400"
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Quick Actions - Enhanced */}
          <div className="flex flex-col" style={{ order: cardOrderMap["upload"] ?? 1 }} data-tour="upload">
            <div 
              className="group relative overflow-hidden rounded-xl border bg-card p-5 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => navigate("/upload")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{tc("homePage.quickUploadTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{tc("homePage.quickUploadDesc")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          </div>
          <div className="flex flex-col" style={{ order: cardOrderMap["archive"] ?? 2 }} data-tour="archive">
            <div 
              className="group relative overflow-hidden rounded-xl border bg-card p-5 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => navigate("/archive")}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Archive className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{tc("homePage.quickArchiveTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{tc("homePage.quickArchiveDesc")}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          </div>

          {/* Invoice/Bookkeeping Summary Widget - Only for enterprise/admin */}
          <div className="flex flex-col" style={{ order: cardOrderMap["invoices"] ?? 3 }} data-tour="invoices">
          {hasInvoiceAccess && !(
            <div 
              className="relative overflow-hidden rounded-xl cursor-pointer group transition-all hover:scale-[1.01] hover:shadow-xl"
              onClick={() => navigate("/invoices")}
            >
              {/* Gradient background with border */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-90" />
              <div className="absolute inset-[1px] bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-xl" />
              
              {/* Content - z-10 so numbers render above gradient layers */}
              <div className="relative z-10 p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{tc("homePage.invoiceSummary")}</h3>
                      <p className="text-sm text-purple-200/70">
                        {format(new Date(), "yyyy. MMMM", { locale: getAppDateLocale() })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/30 hover:bg-purple-500/40">
                      PRO
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-purple-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Stats Row - Clean design */}
                <div className="grid grid-cols-4 gap-3">
                  {/* VAT - Main highlight */}
                  <div className="col-span-4 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                    <p className="text-xs text-purple-200/70 mb-1 flex items-center gap-1.5">
                      <PieChart className="h-3.5 w-3.5" />
                      {tc("homePage.monthlyVat")}
                    </p>
                    <p className="text-2xl font-bold text-white" style={{ color: "#fff" }}>
                      {invoiceStats.monthlyVat/*money*/}
                      
                    </p>
                  </div>

                  {/* Other stats - simpler */}
                  <div className="col-span-4 sm:col-span-3 grid grid-cols-3 gap-3">
                    <div className="text-center sm:text-left p-3">
                      <p className="text-xs text-purple-200/60 mb-0.5">{tc("homePage.invoicesLabel")}</p>
                      <p className="text-lg font-semibold text-white" style={{ color: "#fff" }}>
                        {invoiceStats.invoiceCount}
                        <span className="text-sm font-normal text-white/90 ml-1"> docs</span>
                      </p>
                      {invoiceStats.invoiceCount > invoiceStats.completedCount && (
                        <p className="text-xs text-amber-400">
                          +{invoiceStats.invoiceCount - invoiceStats.completedCount} pending
                        </p>
                      )}
                    </div>

                    <div className="text-center sm:text-left p-3">
                      <p className="text-xs text-purple-200/60 mb-0.5">{tc("homePage.netLabel", { defaultValue: "Net" })}</p>
                      <p className="text-lg font-semibold text-white" style={{ color: "#fff" }}>
                        {invoiceStats.monthlyNet/*money*/}
                        <span className="text-sm font-normal text-white/90 ml-1">Ft</span>
                      </p>
                    </div>

                    <div className="text-center sm:text-left p-3">
                      <p className="text-xs text-purple-200/60 mb-0.5">{tc("homePage.grossLabel", { defaultValue: "Gross" })}</p>
                      <p className="text-lg font-semibold text-white" style={{ color: "#fff" }}>
                        {invoiceStats.monthlyGross/*money*/}
                        <span className="text-sm font-normal text-white/90 ml-1">Ft</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Upcoming Deadlines Widget */}
          <div className="flex flex-col" style={{ order: cardOrderMap["deadlines"] ?? 4 }} data-tour="deadlines">
          <DeadlineReminder />
          </div>

          {/* Usage Limit Widget */}
          <div className="flex flex-col" style={{ order: cardOrderMap["usage"] ?? 5 }} data-tour="usage">
          <UsageLimit />
          </div>

          {/* AI Search Widget - Modernized */}
          <div className="flex flex-col" style={{ order: cardOrderMap["search"] ?? 6 }} data-tour="search">
          <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Decorative gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 opacity-50 blur-xl" />
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{tc("aiSearch.title")}</h3>
                  <p className="text-sm text-muted-foreground">{tc("aiSearch.subtitle")}</p>
                </div>
              </div>
              <AISearch />
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">{tc("homePage.searchExamples")}</span>
                <Badge variant="secondary" className="text-xs font-normal cursor-pointer hover:bg-secondary/80">
                  {tc("homePage.searchBadgeIrs")}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal cursor-pointer hover:bg-secondary/80">
                  {tc("homePage.searchBadgeDeadlines")}
                </Badge>
                <Badge variant="secondary" className="text-xs font-normal cursor-pointer hover:bg-secondary/80">
                  {tc("homePage.searchBadgeState")}
                </Badge>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : (
        <HomeLanding />
      )}
    </div>
  );
}
