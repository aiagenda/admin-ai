import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "sonner";

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

  const severityToNote = (severity: string) => {
    switch (severity) {
      case "urgent": return "Urgent";
      case "action_needed": return "Action needed";
      default: return "Information";
    }
  };

  const parseAmountToNumber = (amount: string | null | undefined): number | "" => {
    if (amount == null || amount === "") return "";
    const cleaned = String(amount).replace(/[\s,$]/g, "").replace(/USD$/i, "");
    const num = parseFloat(cleaned.replace(/[^\d.-]/g, ""));
    return isNaN(num) ? "" : num;
  };

  const exportToCSV = () => {
    try {
      const csvRows: string[][] = [];
      csvRows.push([
        "No.",
        "Date",
        "Due Date",
        "Type",
        "Amount (USD)",
        "Bank Account",
        "Payee",
        "File Name",
        "Description",
        "Note",
      ]);

      filteredDocuments.forEach((doc, index) => {
        const analysis = doc.analyses;
        const uploadDate = new Date(doc.upload_date).toISOString().split("T")[0];
        const deadline = analysis?.deadline ? new Date(analysis.deadline).toISOString().split("T")[0] : "";
        const category = doc.category || "Other";
        const amount = analysis?.amount || "";
        const bankAccount = analysis?.bank_account || "";
        const recipient = analysis?.recipient_name || "";
        const filename = doc.filename;
        const description = analysis?.simple_summary
          ? analysis.simple_summary.substring(0, 100) + (analysis.simple_summary.length > 100 ? "..." : "")
          : "";
        const note = severityToNote(analysis?.severity || "info");

        csvRows.push([
          String(index + 1),
          uploadDate,
          deadline,
          category,
          amount,
          bankAccount,
          recipient,
          filename,
          description,
          note,
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
      link.download = `accountant_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV export successful!");
      setOpen(false);
      onExport?.();
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("An error occurred during export");
    }
  };

  const exportToExcel = async () => {
    try {
      const excelData: Record<string, string | number>[] = [];

      filteredDocuments.forEach((doc, index) => {
        const analysis = doc.analyses;
        const uploadDate = new Date(doc.upload_date).toISOString().split("T")[0];
        const deadline = analysis?.deadline ? new Date(analysis.deadline).toISOString().split("T")[0] : "";
        const category = doc.category || "Other";
        const amountRaw = analysis?.amount || "";
        const amountNum = parseAmountToNumber(amountRaw);
        const bankAccount = analysis?.bank_account || "";
        const recipient = analysis?.recipient_name || "";
        const filename = doc.filename;
        const description = analysis?.simple_summary
          ? analysis.simple_summary.substring(0, 100) + (analysis.simple_summary.length > 100 ? "..." : "")
          : "";
        const note = severityToNote(analysis?.severity || "info");

        excelData.push({
          "No.": index + 1,
          "Date": uploadDate,
          "Due Date": deadline,
          "Type": category,
          "Amount (USD)": amountNum !== "" ? amountNum : amountRaw,
          "Bank Account": bankAccount,
          "Payee": recipient,
          "File Name": filename,
          "Description": description,
          "Note": note,
        });
      });

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Documents");

      const colWidths = [
        { wch: 8 },  // No.
        { wch: 12 }, // Date
        { wch: 12 }, // Due Date
        { wch: 15 }, // Type
        { wch: 14 }, // Amount (USD)
        { wch: 25 }, // Bank Account
        { wch: 20 }, // Payee
        { wch: 30 }, // File Name
        { wch: 50 }, // Description
        { wch: 12 }, // Note
      ];
      ws["!cols"] = colWidths;

      // Generate Excel file
      XLSX.writeFile(wb, `accountant_export_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success("Excel export successful!");
      setOpen(false);
      onExport?.();
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("An error occurred during export");
    }
  };

  const handleExport = () => {
    if (filteredDocuments.length === 0) {
      toast.error("No documents to export with the selected filters");
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
          Export for Accountant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export for Accountant</DialogTitle>
          <DialogDescription>
            Export your documents in CSV or Excel format for accounting software.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(value: "csv" | "excel") => setFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (compatible with accounting software)</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category filter</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="szamla">Invoices only</SelectItem>
                <SelectItem value="hatosagi_level">Official letters only</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date range (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                  Start date
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
                  End date
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
            {filteredDocuments.length} document(s) will be exported
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
