import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle,
  Trash2,
  X,
  CalendarRange
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

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

// IRS Schedule C (Form 1040) expense categories
const categoryLabels: Record<string, string> = {
  advertising: "Advertising",
  car_truck: "Car & Truck",
  commissions_fees: "Commissions & Fees",
  contract_labor: "Contract Labor",
  depreciation: "Depreciation",
  insurance: "Insurance",
  interest: "Interest",
  legal_professional: "Legal & Professional",
  office_expense: "Office Expense",
  rent_lease: "Rent or Lease",
  repairs: "Repairs & Maintenance",
  supplies: "Supplies",
  taxes_licenses: "Taxes & Licenses",
  travel: "Travel",
  meals: "Meals (50%)",
  utilities: "Utilities",
  wages: "Wages",
  other: "Other Expenses",
};

// IRS Schedule C line reference for each category (used in accountant export)
const scheduleCLine: Record<string, string> = {
  advertising: "Line 8",
  car_truck: "Line 9",
  commissions_fees: "Line 10",
  contract_labor: "Line 11",
  depreciation: "Line 13",
  insurance: "Line 15",
  interest: "Line 16",
  legal_professional: "Line 17",
  office_expense: "Line 18",
  rent_lease: "Line 20",
  repairs: "Line 21",
  supplies: "Line 22",
  taxes_licenses: "Line 23",
  travel: "Line 24a",
  meals: "Line 24b",
  utilities: "Line 25",
  wages: "Line 26",
  other: "Line 27a",
};

// Format a number as US dollars
const fmtUSD = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

// Parse a "yyyy-MM-dd" string as a LOCAL date (avoids UTC off-by-one shifts)
const parseLocalDate = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Revenue VAT (manual entry from billing software)
  const [revenueVat, setRevenueVat] = useState<string>("");

  // Reprocess a stuck/error invoice
  const reprocessInvoice = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't navigate to detail page
    
    if (!session?.access_token) {
      toast.error("Please sign in again");
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
        throw new Error(result.error || "Processing error");
      }

      toast.success("Invoice reprocessed!");
      
      // Refresh invoice list
      const { data } = await (supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user?.id)
        .order("upload_date", { ascending: false })) as { data: Invoice[] | null };
      
      if (data) setInvoices(data);
    } catch (error) {
      console.error("Reprocess error:", error);
      toast.error(error instanceof Error ? error.message : "Error during reprocessing");
    } finally {
      setReprocessingId(null);
    }
  };

  const deleteInvoice = async (invoice: Invoice) => {
    setDeletingId(invoice.id);
    try {
      // Remove the stored file first (best-effort — don't block deletion on this)
      if (invoice.file_url) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([invoice.file_url]);
        if (storageError) {
          console.warn("Could not remove stored file:", storageError.message);
        }
      }

      // Delete the database record
      const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (error) throw error;

      // Update local state without a refetch
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
      toast.success("Receipt deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Could not delete receipt");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
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

  // Check access (enterprise OR admin). Testing: VITE_INVOICE_ACCESS_FOR_ALL !== 'false' -> everyone can see it
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
          .from('user_subscriptions')
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
          .from("invoices")
          .select("*")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false })) as { data: Invoice[] | null; error: unknown };

        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        toast.error("Failed to load invoices");
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

    // Date range filter (end date inclusive, local time)
    if (dateRange.start || dateRange.end) {
      const invDate = inv.invoice_date ? new Date(inv.invoice_date) : new Date(inv.upload_date);
      const start = parseLocalDate(dateRange.start);
      const end = parseLocalDate(dateRange.end);
      if (start && invDate < start) return false;
      if (end) {
        const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
        if (invDate > endOfDay) return false;
      }
    }

    return true;
  });

  // Export to Excel with embedded invoice images
  const exportToExcel = async () => {
    if (filteredInvoices.length === 0) {
      toast.error("No receipts to export");
      return;
    }
    setExportingExcel(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      wb.creator = "GovLetter";
      wb.created = new Date();
      const ws = wb.addWorksheet("Expenses", {
        views: [{ state: "frozen", ySplit: 1 }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });

      // Currency ($#,##0.00) and US date (MM/DD/YYYY) number formats
      const MONEY_FMT = '"$"#,##0.00';
      const DATE_FMT = "mm/dd/yyyy";

      ws.columns = [
        { header: "Date", key: "date", width: 12, style: { numFmt: DATE_FMT } },
        { header: "Invoice #", key: "invoice_number", width: 16 },
        { header: "Vendor", key: "vendor", width: 26 },
        { header: "Description", key: "description", width: 34 },
        { header: "Category", key: "category", width: 22 },
        { header: "Schedule C", key: "schedule_c", width: 11 },
        { header: "Subtotal", key: "subtotal", width: 13, style: { numFmt: MONEY_FMT } },
        { header: "Sales Tax", key: "sales_tax", width: 12, style: { numFmt: MONEY_FMT } },
        { header: "Total", key: "total", width: 13, style: { numFmt: MONEY_FMT } },
        { header: "Payment", key: "payment", width: 13 },
        { header: "File", key: "file", width: 26 },
        { header: "Receipt", key: "receipt", width: 24 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 20;
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
        cell.border = { bottom: { style: "thin", color: { argb: "FF1F4E78" } } };
      });

      const RECEIPT_COL = 12;
      const IMG_WIDTH = 160;
      const IMG_HEIGHT = 100;
      const ROW_HEIGHT_WITH_IMG = 78;

      for (let i = 0; i < filteredInvoices.length; i++) {
        const inv = filteredInvoices[i];
        const rowIndex = i + 2;
        const row = ws.getRow(rowIndex);
        const dateStr = inv.invoice_date || inv.upload_date.split("T")[0];
        const parsedDate = dateStr ? new Date(dateStr) : null;
        row.getCell(1).value = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : dateStr;
        row.getCell(2).value = inv.invoice_number ?? "";
        row.getCell(3).value = inv.vendor_name ?? "";
        row.getCell(4).value = inv.item_description ?? "";
        const catKey = inv.expense_category || "other";
        row.getCell(5).value = categoryLabels[catKey] || catKey;
        row.getCell(6).value = scheduleCLine[catKey] || "";
        row.getCell(7).value = inv.net_amount ?? null;
        row.getCell(8).value = inv.vat_amount ?? null;
        row.getCell(9).value = inv.gross_amount ?? null;
        row.getCell(10).value = inv.vat_rate ? `Tax ${inv.vat_rate}` : "";
        row.getCell(11).value = inv.filename;
        if (i % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F6FB" } };
          });
        }

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
                  tl: { col: RECEIPT_COL - 1, row: rowIndex - 1 },
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

      // Totals row
      const totalRowIndex = filteredInvoices.length + 2;
      const totalRow = ws.getRow(totalRowIndex);
      totalRow.getCell(4).value = "TOTAL";
      totalRow.getCell(7).value = totals.net;
      totalRow.getCell(8).value = totals.vat;
      totalRow.getCell(9).value = totals.gross;
      totalRow.font = { bold: true };
      [7, 8, 9].forEach((c) => { totalRow.getCell(c).numFmt = MONEY_FMT; });
      totalRow.eachCell((cell) => {
        cell.border = { top: { style: "double", color: { argb: "FF1F4E78" } } };
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expense_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel export ready — receipt images embedded.");
    } catch (e) {
      console.error("Excel export error:", e);
      toast.error("Export failed. Please try again.");
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
      <div className="min-h-screen py-8">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-lg" />
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
              <CardTitle>Bookkeeping module</CardTitle>
              <CardDescription>
                This feature is available with a Professional subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The Bookkeeping module automatically reads and categorizes your receipts and
                invoices, then exports them for your accountant.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate("/pricing")}>
                  View plans
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to home
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
        return "All time";
      case "month":
        return format(now, "MMMM yyyy");
      case "quarter": {
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `Q${quarter} ${now.getFullYear()}`;
      }
      case "year":
        return `${now.getFullYear()}`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto max-w-6xl space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Bookkeeping
            </h1>
            <p className="text-muted-foreground">
              Manage receipts and expense summaries
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel} disabled={exportingExcel}>
              {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export to Excel
            </Button>
            <Button onClick={() => navigate("/invoices/upload")}>
              <Plus className="h-4 w-4 mr-2" />
              New receipt
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              Receipts ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {invoices.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent className="space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Start your bookkeeping</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                      Upload a receipt or invoice — even a photo of a handwritten one — and the AI reads the vendor, amount, sales tax and expense category automatically.
                    </p>
                  </div>
                  <Button size="lg" onClick={() => navigate("/invoices/upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first receipt
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <>
            {/* Period Selector */}
            <div className="flex items-center gap-4">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="quarter">This quarter</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
              {periodFilter !== "all" && (
                <span className="text-muted-foreground font-medium">
                  {getPeriodLabel(periodFilter)}
                </span>
              )}
            </div>

            {/* Processing/Error Warning */}
            {(dashboardStats.processingCount > 0 || dashboardStats.errorCount > 0) && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                    <span className="text-amber-700 dark:text-amber-300">
                      {dashboardStats.processingCount > 0 && (
                        <>{dashboardStats.processingCount} receipt(s) processing</>
                      )}
                      {dashboardStats.processingCount > 0 && dashboardStats.errorCount > 0 && ", "}
                      {dashboardStats.errorCount > 0 && (
                        <span className="text-red-600">{dashboardStats.errorCount} receipt(s) failed</span>
                      )}
                      {" "}- summaries include processed receipts only
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
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Receipts</p>
                      <p className="text-xl sm:text-2xl font-bold tabular-nums">{dashboardStats.completedCount}</p>
                      {dashboardStats.processingCount > 0 && (
                        <p className="text-xs text-amber-600">+{dashboardStats.processingCount} processing</p>
                      )}
                    </div>
                    <FileText className="hidden sm:block sm:h-8 sm:w-8 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                      <p className="text-lg sm:text-2xl font-bold tabular-nums">{fmtUSD(dashboardStats.totalNet)}</p>
                    </div>
                    <TrendingDown className="hidden sm:block sm:h-8 sm:w-8 text-orange-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Sales Tax</p>
                      <p className="text-lg sm:text-2xl font-bold text-primary tabular-nums">{fmtUSD(dashboardStats.totalVat)}</p>
                    </div>
                    <PieChart className="hidden sm:block sm:h-8 sm:w-8 text-primary shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg sm:text-2xl font-bold tabular-nums">{fmtUSD(dashboardStats.totalGross)}</p>
                    </div>
                    <TrendingUp className="hidden sm:block sm:h-8 sm:w-8 text-green-500 shrink-0" />
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
                    By category (Schedule C)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(dashboardStats.byCategory).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.byCategory)
                        .sort((a, b) => b[1].gross - a[1].gross)
                        .map(([cat, data]) => (
                          <div key={cat} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{categoryLabels[cat] || cat}</Badge>
                              <span className="text-sm text-muted-foreground">({data.count})</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{fmtUSD(data.gross)}</p>
                              <p className="text-xs text-muted-foreground">
                                Subtotal: {fmtUSD(data.net)}
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
                    By sales tax rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(dashboardStats.byVatRate).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(dashboardStats.byVatRate)
                        .sort((a, b) => b[1].vat - a[1].vat)
                        .map(([rate, data]) => (
                          <div key={rate} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{rate}</Badge>
                              <span className="text-sm text-muted-foreground">({data.count})</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-primary">{fmtUSD(data.vat)} tax</p>
                              <p className="text-xs text-muted-foreground">
                                Subtotal: {fmtUSD(data.net)}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Deduction Summary */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardContent className="p-5">
                <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                  <PieChart className="h-5 w-5 text-primary" />
                  Deduction Summary
                </h4>

                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  {/* Total deductible expenses */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-1">Deductible expenses (subtotal)</p>
                    <p className="text-xl font-bold text-orange-600">
                      {fmtUSD(dashboardStats.totalNet)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {dashboardStats.completedCount} receipt(s)
                    </p>
                  </div>

                  {/* Estimated marginal tax rate (manual input) */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border">
                    <p className="text-xs text-muted-foreground mb-1">Estimated tax rate</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="24"
                        value={revenueVat}
                        onChange={(e) => setRevenueVat(e.target.value)}
                        className="text-xl font-bold h-9 text-green-600"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your combined marginal rate
                    </p>
                  </div>

                  {/* Estimated tax savings */}
                  <div className="rounded-lg p-4 border bg-green-50 dark:bg-green-950/30 border-green-200">
                    <p className="text-xs text-muted-foreground mb-1">Estimated tax savings</p>
                    {revenueVat ? (
                      <>
                        <p className="text-xl font-bold text-green-600">
                          {fmtUSD(dashboardStats.totalNet * (Number(revenueVat) / 100))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          If all expenses are deductible
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-muted-foreground">—</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your tax rate
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <strong>Note:</strong> These figures are estimates for planning only. Deductibility
                  depends on your business use and IRS rules (e.g., meals are generally 50% deductible).
                  Always confirm with your accountant or CPA before filing.
                </div>
              </CardContent>
            </Card>
            </>
            )}
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search (vendor, invoice #, item...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                      <Filter className="h-4 w-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full lg:w-[260px] justify-start font-normal ${!dateRange.start && !dateRange.end ? "text-muted-foreground" : ""}`}
                      >
                        <CalendarRange className="h-4 w-4 mr-2 shrink-0" />
                        {dateRange.start
                          ? dateRange.end
                            ? `${format(parseLocalDate(dateRange.start)!, "MM/dd/yyyy")} – ${format(parseLocalDate(dateRange.end)!, "MM/dd/yyyy")}`
                            : `${format(parseLocalDate(dateRange.start)!, "MM/dd/yyyy")} – …`
                          : "Date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarPicker
                        mode="range"
                        numberOfMonths={2}
                        defaultMonth={parseLocalDate(dateRange.start)}
                        selected={
                          (dateRange.start || dateRange.end
                            ? { from: parseLocalDate(dateRange.start), to: parseLocalDate(dateRange.end) }
                            : undefined) as DateRange | undefined
                        }
                        onSelect={(range: DateRange | undefined) =>
                          setDateRange({
                            start: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                            end: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                          })
                        }
                      />
                      {(dateRange.start || dateRange.end) && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => setDateRange({ start: "", end: "" })}
                          >
                            Clear dates
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {(searchQuery || categoryFilter !== "all" || dateRange.start || dateRange.end) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("all");
                        setDateRange({ start: "", end: "" });
                      }}
                      className="shrink-0 text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {filteredInvoices.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card>
                  <CardContent className="p-2.5 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-base sm:text-xl font-bold tabular-nums">{fmtUSD(totals.net)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Sales Tax</p>
                    <p className="text-base sm:text-xl font-bold tabular-nums">{fmtUSD(totals.vat)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2.5 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                    <p className="text-base sm:text-xl font-bold text-primary tabular-nums">{fmtUSD(totals.gross)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoice List */}
            {filteredInvoices.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No receipts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first receipt for automatic processing
                  </p>
                  <Button onClick={() => navigate("/invoices/upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload receipt
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
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="hidden sm:block">
                          <Receipt className="h-10 w-10 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium truncate max-w-full">
                              {invoice.vendor_name || invoice.filename}
                            </h3>
                            {invoice.expense_category && (
                              <Badge variant="secondary" className="max-w-full truncate">
                                {categoryLabels[invoice.expense_category] || invoice.expense_category}
                              </Badge>
                            )}
                            {invoice.status === "processing" && (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing
                              </Badge>
                            )}
                            {invoice.status === "error" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                            {invoice.invoice_number && (
                              <span className="truncate max-w-[120px]">#{invoice.invoice_number}</span>
                            )}
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3" />
                              {invoice.invoice_date
                                ? format(new Date(invoice.invoice_date), "MMM d, yyyy")
                                : format(new Date(invoice.upload_date), "MMM d, yyyy")
                              }
                            </span>
                            {invoice.item_description && (
                              <span className="truncate max-w-[200px]">{invoice.item_description}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2 sm:gap-3 shrink-0">
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
                                  Retry
                                </>
                              )}
                            </Button>
                          )}
                          <div>
                            <p className="font-bold text-lg">
                              {invoice.gross_amount
                                ? fmtUSD(invoice.gross_amount)
                                : "-"
                              }
                            </p>
                            {invoice.vat_rate && (
                              <p className="text-sm text-muted-foreground">
                                Tax: {invoice.vat_rate}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete receipt"
                            title="Delete receipt"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(invoice);
                            }}
                            disabled={deletingId === invoice.id}
                            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.vendor_name || deleteTarget?.filename
                ? `"${deleteTarget?.vendor_name || deleteTarget?.filename}" will be permanently removed, including its uploaded file. This cannot be undone.`
                : "This receipt and its uploaded file will be permanently removed. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteInvoice(deleteTarget)}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
