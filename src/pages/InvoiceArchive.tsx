import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Receipt, 
  Plus, 
  Search, 
  Download, 
  Calendar,
  Building2,
  Filter,
  Loader2,
  FileText,
  Lock,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { hu } from "date-fns/locale";

interface Invoice {
  id: string;
  filename: string;
  file_url?: string | null;
  upload_date: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  net_amount: number | null;
  vat_rate: string | null;
  vat_amount: number | null;
  gross_amount: number | null;
  expense_category: string | null;
  item_description: string | null;
  status: string;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const IMAGE_EXT_MAP: Record<string, "jpeg" | "png"> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "png", // Excel doesn't support webp; treat as png for embedding attempt
};

interface ExpenseCategory {
  name: string;
  name_hu: string;
}

const categoryLabels: Record<string, string> = {
  fuel: "Üzemanyag",
  office: "Irodaszer",
  travel: "Utazás",
  accommodation: "Szállás",
  food: "Vendéglátás",
  phone: "Telefon/Internet",
  software: "Szoftver/Előfizetés",
  maintenance: "Karbantartás",
  marketing: "Marketing/Reklám",
  other: "Egyéb",
};

export default function InvoiceArchive() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Revenue VAT (manual entry from billing software)
  const [revenueVat, setRevenueVat] = useState<string>("");

  // Reprocess a stuck/error invoice
  const reprocessInvoice = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't navigate to detail page
    
    if (!session?.access_token) {
      toast.error("Kérjük jelentkezz be újra");
      return;
    }

    setReprocessingId(invoice.id);

    try {
      // Get the file URL from invoice
      const fileUrl = `invoices/${user?.id}/${invoice.filename}`;
      
      // Call the Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            invoice_id: invoice.id,
            file_url: fileUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Feldolgozási hiba");
      }

      toast.success("Számla újrafeldolgozva!");
      
      // Refresh invoice list
      const { data } = await (supabase
        .from("invoices" as any)
        .select("*")
        .eq("user_id", user?.id)
        .order("upload_date", { ascending: false })) as { data: Invoice[] | null };
      
      if (data) setInvoices(data);
    } catch (error: any) {
      console.error("Reprocess error:", error);
      toast.error(error.message || "Hiba az újrafeldolgozás során");
    } finally {
      setReprocessingId(null);
    }
  };

  // Calculate period dates
  const getPeriodDates = (period: string) => {
    const now = new Date();
    switch (period) {
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  // Filter invoices by period for dashboard
  const periodInvoices = useMemo(() => {
    // "all" shows everything
    if (periodFilter === "all") {
      return invoices;
    }
    
    const { start, end } = getPeriodDates(periodFilter);
    return invoices.filter((inv) => {
      // Parse the date - prefer invoice_date, fallback to upload_date
      const dateStr = inv.invoice_date || inv.upload_date;
      if (!dateStr) return true; // Include if no date
      
      const invDate = new Date(dateStr);
      // Check if date is valid
      if (isNaN(invDate.getTime())) return true; // Include if invalid date
      
      return invDate >= start && invDate <= end;
    });
  }, [invoices, periodFilter]);

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    // Only count completed invoices for financial stats
    const completedInvoices = periodInvoices.filter(inv => inv.status === "completed");
    const processingCount = periodInvoices.filter(inv => inv.status === "processing").length;
    const errorCount = periodInvoices.filter(inv => inv.status === "error").length;
    
    const stats = {
      totalNet: 0,
      totalVat: 0,
      totalGross: 0,
      invoiceCount: periodInvoices.length,
      completedCount: completedInvoices.length,
      processingCount,
      errorCount,
      byCategory: {} as Record<string, { net: number; vat: number; gross: number; count: number }>,
      byVatRate: {} as Record<string, { net: number; vat: number; gross: number; count: number }>,
    };

    // Only sum completed invoices
    completedInvoices.forEach((inv) => {
      const net = inv.net_amount || 0;
      const vat = inv.vat_amount || 0;
      const gross = inv.gross_amount || 0;

      stats.totalNet += net;
      stats.totalVat += vat;
      stats.totalGross += gross;

      // By category
      const cat = inv.expense_category || "other";
      if (!stats.byCategory[cat]) {
        stats.byCategory[cat] = { net: 0, vat: 0, gross: 0, count: 0 };
      }
      stats.byCategory[cat].net += net;
      stats.byCategory[cat].vat += vat;
      stats.byCategory[cat].gross += gross;
      stats.byCategory[cat].count += 1;

      // By VAT rate
      const vatRate = inv.vat_rate || "N/A";
      if (!stats.byVatRate[vatRate]) {
        stats.byVatRate[vatRate] = { net: 0, vat: 0, gross: 0, count: 0 };
      }
      stats.byVatRate[vatRate].net += net;
      stats.byVatRate[vatRate].vat += vat;
      stats.byVatRate[vatRate].gross += gross;
      stats.byVatRate[vatRate].count += 1;
    });

    return stats;
  }, [periodInvoices]);

  // Check access (enterprise OR admin). Tesztelés: VITE_INVOICE_ACCESS_FOR_ALL !== 'false' → mindenki látja
  const invoiceAccessForAll = import.meta.env.VITE_INVOICE_ACCESS_FOR_ALL !== 'false';
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      if (invoiceAccessForAll) {
        setHasAccess(true);
        return;
      }
      try {
        // Check if admin
        const { data: adminData } = await supabase.rpc('is_admin');
        if (adminData === true) {
          setHasAccess(true);
          return;
        }

        // Check subscription
        const { data: subData } = await (supabase
          .from('user_subscriptions' as any)
          .select('plan_type')
          .eq('user_id', user.id)
          .single()) as { data: { plan_type: string } | null };
        
        setHasAccess(subData?.plan_type === 'enterprise');
      } catch (error) {
        setHasAccess(false);
      }
    }

    checkAccess();
  }, [user, invoiceAccessForAll]);

  // Fetch invoices
  useEffect(() => {
    async function fetchInvoices() {
      if (!user || hasAccess === false) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase
          .from("invoices" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false })) as { data: Invoice[] | null; error: any };

        if (error) throw error;
        setInvoices(data || []);
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        toast.error("Hiba a számlák betöltése során");
      } finally {
        setLoading(false);
      }
    }

    if (hasAccess === true) {
      fetchInvoices();
    }
  }, [user, hasAccess]);

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        inv.vendor_name?.toLowerCase().includes(query) ||
        inv.invoice_number?.toLowerCase().includes(query) ||
        inv.item_description?.toLowerCase().includes(query) ||
        inv.filename.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (categoryFilter !== "all" && inv.expense_category !== categoryFilter) {
      return false;
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      const invDate = inv.invoice_date ? new Date(inv.invoice_date) : new Date(inv.upload_date);
      if (dateRange.start && invDate < new Date(dateRange.start)) return false;
      if (dateRange.end && invDate > new Date(dateRange.end)) return false;
    }

    return true;
  });

  // Export to Excel with embedded invoice images
  const exportToExcel = async () => {
    if (filteredInvoices.length === 0) {
      toast.error("Nincs exportálható számla");
      return;
    }
    setExportingExcel(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Számlák", { views: [{ state: "frozen", ySplit: 1 }] });

      const headers = [
        "Dátum",
        "Számlaszám",
        "Kibocsátó",
        "Tétel",
        "Nettó",
        "ÁFA%",
        "ÁFA",
        "Bruttó",
        "Kategória",
        "Fájlnév",
        "Számla",
      ];
      const headerRow = ws.getRow(1);
      headers.forEach((h, i) => headerRow.getCell(i + 1).value = h);
      headerRow.font = { bold: true };

      const IMG_COL = 11;
      const IMG_WIDTH = 160;
      const IMG_HEIGHT = 100;
      const ROW_HEIGHT_WITH_IMG = 78;

      for (let i = 0; i < filteredInvoices.length; i++) {
        const inv = filteredInvoices[i];
        const rowIndex = i + 2;
        const row = ws.getRow(rowIndex);
        row.getCell(1).value = inv.invoice_date || inv.upload_date.split("T")[0];
        row.getCell(2).value = inv.invoice_number ?? "";
        row.getCell(3).value = inv.vendor_name ?? "";
        row.getCell(4).value = inv.item_description ?? "";
        row.getCell(5).value = inv.net_amount ?? "";
        row.getCell(6).value = inv.vat_rate ?? "";
        row.getCell(7).value = inv.vat_amount ?? "";
        row.getCell(8).value = inv.gross_amount ?? "";
        row.getCell(9).value = (categoryLabels[inv.expense_category || "other"] || inv.expense_category) ?? "";
        row.getCell(10).value = inv.filename;

        const fileUrl = inv.file_url;
        const isImage = fileUrl && IMAGE_EXTENSIONS.test(inv.filename);
        if (isImage && fileUrl) {
          try {
            const { data: urlData } = await supabase.storage
              .from("documents")
              .createSignedUrl(fileUrl, 3600);
            if (urlData?.signedUrl) {
              const res = await fetch(urlData.signedUrl);
              if (res.ok) {
                const buffer = await res.arrayBuffer();
                const ext = (inv.filename.split(".").pop() || "").toLowerCase();
                const excelExt = IMAGE_EXT_MAP[ext] ?? "jpeg";
                const imageId = wb.addImage({
                  buffer: new Uint8Array(buffer),
                  extension: excelExt,
                });
                ws.addImage(imageId, {
                  tl: { col: IMG_COL - 1, row: rowIndex - 1 },
                  ext: { width: IMG_WIDTH, height: IMG_HEIGHT },
                });
                row.height = ROW_HEIGHT_WITH_IMG;
              }
            }
          } catch {
            // skip image on error (e.g. PDF or missing file)
          }
        }
      }

      ws.getColumn(IMG_COL).width = 22;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `szamlak_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportálás sikeres! A számlaképek beágyazva.");
    } catch (e) {
      console.error("Excel export error:", e);
      toast.error("Hiba az exportálás során");
    } finally {
      setExportingExcel(false);
    }
  };

  // Calculate totals
  const totals = filteredInvoices.reduce(
    (acc, inv) => ({
      net: acc.net + (inv.net_amount || 0),
      vat: acc.vat + (inv.vat_amount || 0),
      gross: acc.gross + (inv.gross_amount || 0),
    }),
    { net: 0, vat: 0, gross: 0 }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Könyvelés modul</CardTitle>
              <CardDescription>
                Ez a funkció csak Professzionális előfizetéssel érhető el
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                A Könyvelés modullal automatikusan felismerheted és kategorizálhatod a számláidat,
                majd exportálhatod őket a könyvelődnek.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate("/pricing")}>
                  Előfizetési csomagok
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Vissza a főoldalra
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getPeriodLabel = (period: string) => {
    const now = new Date();
    switch (period) {
      case "all":
        return "Összes időszak";
      case "month":
        return format(now, "yyyy. MMMM", { locale: hu });
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `${now.getFullYear()}. Q${quarter}`;
      case "year":
        return `${now.getFullYear()}. év`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6 overflow-x-auto min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Könyvelés
            </h1>
            <p className="text-muted-foreground">
              Számlák kezelése és összesítők
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel} disabled={exportingExcel}>
              {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Excel
            </Button>
            <Button onClick={() => navigate("/invoices/upload")}>
              <Plus className="h-4 w-4 mr-2" />
              Új számla
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Összesítő
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              Számlák ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center gap-4">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes időszak</SelectItem>
                  <SelectItem value="month">Aktuális hónap</SelectItem>
                  <SelectItem value="quarter">Aktuális negyedév</SelectItem>
                  <SelectItem value="year">Aktuális év</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-medium">
                {getPeriodLabel(periodFilter)}
              </span>
            </div>

            {/* Processing/Error Warning */}
            {(dashboardStats.processingCount > 0 || dashboardStats.errorCount > 0) && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    <span className="text-amber-700 dark:text-amber-300">
                      {dashboardStats.processingCount > 0 && (
                        <>{dashboardStats.processingCount} számla feldolgozás alatt</>
                      )}
                      {dashboardStats.processingCount > 0 && dashboardStats.errorCount > 0 && ", "}
                      {dashboardStats.errorCount > 0 && (
                        <span className="text-red-600">{dashboardStats.errorCount} számla hibás</span>
                      )}
                      {" "}- az összesítés csak a feldolgozott számlákat tartalmazza
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Számlák száma</p>
                      <p className="text-2xl font-bold">{dashboardStats.completedCount}</p>
                      {dashboardStats.processingCount > 0 && (
                        <p className="text-xs text-amber-600">+{dashboardStats.processingCount} feldolgozás alatt</p>
                      )}
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Nettó összesen</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalNet.toLocaleString("hu-HU")} Ft</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">ÁFA összesen</p>
                      <p className="text-2xl font-bold text-primary">{dashboardStats.totalVat.toLocaleString("hu-HU")} Ft</p>
                    </div>
                    <PieChart className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Bruttó összesen</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalGross.toLocaleString("hu-HU")} Ft</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Kategória szerinti bontás
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(dashboardStats.byCategory).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nincs adat</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.byCategory)
                        .sort((a, b) => b[1].gross - a[1].gross)
                        .map(([cat, data]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{categoryLabels[cat] || cat}</Badge>
                              <span className="text-sm text-muted-foreground">({data.count} db)</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{data.gross.toLocaleString("hu-HU")} Ft</p>
                              <p className="text-xs text-muted-foreground">
                                Nettó: {data.net.toLocaleString("hu-HU")} Ft
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    ÁFA kulcs szerinti bontás
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(dashboardStats.byVatRate).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Nincs adat</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.byVatRate)
                        .sort((a, b) => b[1].vat - a[1].vat)
                        .map(([rate, data]) => (
                          <div key={rate} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{rate}</Badge>
                              <span className="text-sm text-muted-foreground">({data.count} db)</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary">{data.vat.toLocaleString("hu-HU")} Ft ÁFA</p>
                              <p className="text-xs text-muted-foreground">
                                Nettó: {data.net.toLocaleString("hu-HU")} Ft
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* VAT Calculator */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardContent className="p-5">
                <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <PieChart className="h-5 w-5 text-primary" />
                  ÁFA Kalkulátor
                </h4>
                
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  {/* Deductible VAT (from expenses) */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-1">Levonható ÁFA (kiadások)</p>
                    <p className="text-xl font-bold text-orange-600">
                      {dashboardStats.totalVat.toLocaleString("hu-HU")} Ft
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardStats.completedCount} számla alapján
                    </p>
                  </div>
                  
                  {/* Revenue VAT (manual input) */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-1">Fizetendő ÁFA (bevételek)</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={revenueVat}
                        onChange={(e) => setRevenueVat(e.target.value)}
                        className="text-xl font-bold h-9 text-green-600"
                      />
                      <span className="text-sm text-muted-foreground">Ft</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Számlázó programból (Billingo, stb.)
                    </p>
                  </div>
                  
                  {/* VAT Balance */}
                  <div className={`rounded-lg p-4 border ${
                    revenueVat && Number(revenueVat) - dashboardStats.totalVat > 0
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200"
                      : revenueVat && Number(revenueVat) - dashboardStats.totalVat < 0
                        ? "bg-green-50 dark:bg-green-950/30 border-green-200"
                        : "bg-white dark:bg-slate-900"
                  }`}>
                    <p className="text-xs text-muted-foreground mb-1">ÁFA Egyenleg</p>
                    {revenueVat ? (
                      <>
                        <p className={`text-xl font-bold ${
                          Number(revenueVat) - dashboardStats.totalVat > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}>
                          {(Number(revenueVat) - dashboardStats.totalVat).toLocaleString("hu-HU")} Ft
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Number(revenueVat) - dashboardStats.totalVat > 0
                            ? "Fizetendő a NAV-nak"
                            : Number(revenueVat) - dashboardStats.totalVat < 0
                              ? "Visszaigényelhető"
                              : "Nullás egyenleg"
                          }
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-muted-foreground">— Ft</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add meg a bevételi ÁFA-t
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <strong>Tipp:</strong> A bevételi ÁFA-t a számlázó programodból (Billingo, Számlázz.hu, NAV Online Számla) tudod kiolvasni. 
                  A kiadási oldalon lévő számlák automatikusan kerülnek ide. A pontos ÁFA bevalláshoz mindig egyeztess könyvelőddel!
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Keresés (kibocsátó, számlaszám, tétel...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Kategória" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes kategória</SelectItem>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-[140px]"
                      placeholder="Kezdő dátum"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-[140px]"
                      placeholder="Vég dátum"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {filteredInvoices.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Nettó összesen</p>
                    <p className="text-xl font-bold">{totals.net.toLocaleString("hu-HU")} Ft</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">ÁFA összesen</p>
                    <p className="text-xl font-bold">{totals.vat.toLocaleString("hu-HU")} Ft</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Bruttó összesen</p>
                    <p className="text-xl font-bold text-primary">{totals.gross.toLocaleString("hu-HU")} Ft</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoice List */}
            {filteredInvoices.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nincs még számla</h3>
                  <p className="text-muted-foreground mb-4">
                    Töltsd fel az első számládat az automatikus feldolgozáshoz
                  </p>
                  <Button onClick={() => navigate("/invoices/upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Számla feltöltése
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <Card 
                    key={invoice.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block">
                          <Receipt className="h-10 w-10 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium truncate">
                              {invoice.vendor_name || invoice.filename}
                            </h3>
                            {invoice.expense_category && (
                              <Badge variant="secondary">
                                {categoryLabels[invoice.expense_category] || invoice.expense_category}
                              </Badge>
                            )}
                            {invoice.status === "processing" && (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Feldolgozás alatt
                              </Badge>
                            )}
                            {invoice.status === "error" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Hiba
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {invoice.invoice_number && (
                              <span>#{invoice.invoice_number}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {invoice.invoice_date 
                                ? format(new Date(invoice.invoice_date), "yyyy. MMM d.", { locale: hu })
                                : format(new Date(invoice.upload_date), "yyyy. MMM d.", { locale: hu })
                              }
                            </span>
                            {invoice.item_description && (
                              <span className="truncate max-w-[200px]">{invoice.item_description}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {(invoice.status === "error" || invoice.status === "processing") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => reprocessInvoice(invoice, e)}
                              disabled={reprocessingId === invoice.id}
                              className="shrink-0"
                            >
                              {reprocessingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Receipt className="h-4 w-4 mr-1" />
                                  Újra
                                </>
                              )}
                            </Button>
                          )}
                          <div>
                            <p className="font-bold text-lg">
                              {invoice.gross_amount 
                                ? `${invoice.gross_amount.toLocaleString("hu-HU")} Ft`
                                : "-"
                              }
                            </p>
                            {invoice.vat_rate && (
                              <p className="text-sm text-muted-foreground">
                                ÁFA: {invoice.vat_rate}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
