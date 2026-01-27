import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface DocumentWithAnalysis {
  id: string;
  filename: string;
  upload_date: string;
  category: string | null;
  analyses: {
    id: string;
    deadline: string | null;
    severity: string;
    amount: string | null;
    bank_account: string | null;
    recipient_name: string | null;
    simple_summary: string | null;
  } | null;
}

interface ExportForAccountantProps {
  documents: DocumentWithAnalysis[];
  onExport?: () => void;
}

export function ExportForAccountant({ documents, onExport }: ExportForAccountantProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Get unique categories from documents
  const categories = Array.from(
    new Set(documents.map((doc) => doc.category).filter((cat): cat is string => cat !== null))
  );

  // Filter documents based on category and date range
  const filteredDocuments = documents.filter((doc) => {
    // Category filter
    if (categoryFilter !== "all" && doc.category !== categoryFilter) {
      return false;
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      const uploadDate = new Date(doc.upload_date);
      if (dateRange.start && uploadDate < new Date(dateRange.start)) {
        return false;
      }
      if (dateRange.end && uploadDate > new Date(dateRange.end)) {
        return false;
      }
    }

    return true;
  });

  const exportToCSV = () => {
    try {
      // Prepare CSV data
      const csvRows: string[][] = [];
      
      // Header row
      csvRows.push([
        "Dátum",
        "Határidő",
        "Típus",
        "Összeg",
        "Bankszámlaszám",
        "Kedvezményezett",
        "Fájlnév",
        "Leírás",
        "Súlyosság",
      ]);

      // Data rows
      filteredDocuments.forEach((doc) => {
        const analysis = doc.analyses;
        const uploadDate = new Date(doc.upload_date).toISOString().split("T")[0]; // YYYY-MM-DD
        const deadline = analysis?.deadline ? new Date(analysis.deadline).toISOString().split("T")[0] : "";
        const category = doc.category || "Egyéb";
        const amount = analysis?.amount || "";
        const bankAccount = analysis?.bank_account || "";
        const recipient = analysis?.recipient_name || "";
        const filename = doc.filename;
        const description = analysis?.simple_summary 
          ? analysis.simple_summary.substring(0, 100) + (analysis.simple_summary.length > 100 ? "..." : "")
          : "";
        const severity = analysis?.severity || "info";

        csvRows.push([
          uploadDate,
          deadline,
          category,
          amount,
          bankAccount,
          recipient,
          filename,
          description,
          severity,
        ]);
      });

      // Convert to CSV string
      const csvContent = csvRows.map((row) => 
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          const cellStr = String(cell || "");
          if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      ).join("\n");

      // Add BOM for Excel compatibility (UTF-8)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `konyvelo_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV exportálás sikeres!");
      setOpen(false);
      onExport?.();
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Hiba történt az export során");
    }
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel
      const excelData: any[] = [];

      // Header row
      excelData.push({
        "Dátum": "Dátum",
        "Határidő": "Határidő",
        "Típus": "Típus",
        "Összeg": "Összeg",
        "Bankszámlaszám": "Bankszámlaszám",
        "Kedvezményezett": "Kedvezményezett",
        "Fájlnév": "Fájlnév",
        "Leírás": "Leírás",
        "Súlyosság": "Súlyosság",
      });

      // Data rows
      filteredDocuments.forEach((doc) => {
        const analysis = doc.analyses;
        const uploadDate = new Date(doc.upload_date).toISOString().split("T")[0]; // YYYY-MM-DD
        const deadline = analysis?.deadline ? new Date(analysis.deadline).toISOString().split("T")[0] : "";
        const category = doc.category || "Egyéb";
        const amount = analysis?.amount || "";
        const bankAccount = analysis?.bank_account || "";
        const recipient = analysis?.recipient_name || "";
        const filename = doc.filename;
        const description = analysis?.simple_summary 
          ? analysis.simple_summary.substring(0, 100) + (analysis.simple_summary.length > 100 ? "..." : "")
          : "";
        const severity = analysis?.severity || "info";

        excelData.push({
          "Dátum": uploadDate,
          "Határidő": deadline,
          "Típus": category,
          "Összeg": amount,
          "Bankszámlaszám": bankAccount,
          "Kedvezményezett": recipient,
          "Fájlnév": filename,
          "Leírás": description,
          "Súlyosság": severity,
        });
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dokumentumok");

      // Set column widths
      const colWidths = [
        { wch: 12 }, // Dátum
        { wch: 12 }, // Határidő
        { wch: 15 }, // Típus
        { wch: 15 }, // Összeg
        { wch: 25 }, // Bankszámlaszám
        { wch: 20 }, // Kedvezményezett
        { wch: 30 }, // Fájlnév
        { wch: 50 }, // Leírás
        { wch: 12 }, // Súlyosság
      ];
      ws["!cols"] = colWidths;

      // Generate Excel file
      XLSX.writeFile(wb, `konyvelo_export_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success("Excel exportálás sikeres!");
      setOpen(false);
      onExport?.();
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Hiba történt az export során");
    }
  };

  const handleExport = () => {
    if (filteredDocuments.length === 0) {
      toast.error("Nincs exportálható dokumentum a kiválasztott szűrőkkel");
      return;
    }

    if (format === "csv") {
      exportToCSV();
    } else {
      exportToExcel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export könyvelőnek
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export könyvelőnek</DialogTitle>
          <DialogDescription>
            Exportálja a dokumentumokat CSV vagy Excel formátumban könyvelő programokhoz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="format">Formátum</Label>
            <Select value={format} onValueChange={(value: "csv" | "excel") => setFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (könyvelő programokkal kompatibilis)</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategória szűrés</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes kategória</SelectItem>
                <SelectItem value="szamla">Csak számlák</SelectItem>
                <SelectItem value="hatosagi_level">Csak hatósági levelek</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dátum tartomány (opcionális)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                  Kezdő dátum
                </Label>
                <input
                  id="date-start"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                  Vég dátum
                </Label>
                <input
                  id="date-end"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredDocuments.length} dokumentum lesz exportálva
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mégse
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportálás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
