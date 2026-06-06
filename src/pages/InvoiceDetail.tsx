import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Receipt,
  ArrowLeft,
  Calendar,
  Building2,
  Hash,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
  Pencil,
  Save,
  X,
  List
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface LineItem {
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  net_amount: number | null;
  sales_tax_rate?: string | null;
  sales_tax_amount?: number | null;
  // Legacy keys kept for older records
  vat_rate?: string | null;
  vat_amount?: number | null;
  gross_amount: number | null;
}

interface Invoice {
  id: string;
  filename: string;
  file_url: string;
  upload_date: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  fulfillment_date: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_tax_id: string | null;
  net_amount: number | null;
  // vat_rate / vat_amount columns now hold the US sales-tax rate / amount
  vat_rate: string | null;
  vat_amount: number | null;
  gross_amount: number | null;
  currency: string | null;
  item_description: string | null;
  line_items: LineItem[] | null;
  payment_method: string | null;
  expense_category: string | null;
  status: string;
  ai_confidence: number | null;
  has_handwritten_content: boolean | null;
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

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  ach: "ACH",
  wire: "Wire",
};

// Line-item tax helpers (support both new sales_tax_* and legacy vat_* keys)
const itemTaxAmount = (item: LineItem): number | null =>
  item.sales_tax_amount ?? item.vat_amount ?? null;
const itemTaxRate = (item: LineItem): string | null =>
  item.sales_tax_rate ?? item.vat_rate ?? null;

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Format a number as US dollars (falls back to invoice currency code if not USD)
  const fmtMoney = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const currency = invoice?.currency || "USD";
    return n.toLocaleString("en-US", { style: "currency", currency });
  };

  // Start editing
  const startEditing = () => {
    if (invoice) {
      setEditForm({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        vendor_name: invoice.vendor_name,
        vendor_address: invoice.vendor_address,
        vendor_tax_id: invoice.vendor_tax_id,
        net_amount: invoice.net_amount,
        vat_rate: invoice.vat_rate,
        vat_amount: invoice.vat_amount,
        gross_amount: invoice.gross_amount,
        item_description: invoice.item_description,
        payment_method: invoice.payment_method,
        expense_category: invoice.expense_category,
      });
      setIsEditing(true);
    }
  };

  // Save edits
  const saveEdits = async () => {
    if (!invoice) return;
    setSaving(true);

    try {
      const { error } = await (supabase
        .from("invoices")
        .update({
          invoice_number: editForm.invoice_number,
          invoice_date: editForm.invoice_date,
          due_date: editForm.due_date,
          vendor_name: editForm.vendor_name,
          vendor_address: editForm.vendor_address,
          vendor_tax_id: editForm.vendor_tax_id,
          net_amount: editForm.net_amount ? Number(editForm.net_amount) : null,
          vat_rate: editForm.vat_rate,
          vat_amount: editForm.vat_amount ? Number(editForm.vat_amount) : null,
          gross_amount: editForm.gross_amount ? Number(editForm.gross_amount) : null,
          item_description: editForm.item_description,
          payment_method: editForm.payment_method,
          expense_category: editForm.expense_category,
        })
        .eq("id", invoice.id));

      if (error) throw error;

      // Update local state
      setInvoice({
        ...invoice,
        ...editForm,
        net_amount: editForm.net_amount ? Number(editForm.net_amount) : null,
        vat_amount: editForm.vat_amount ? Number(editForm.vat_amount) : null,
        gross_amount: editForm.gross_amount ? Number(editForm.gross_amount) : null,
      });

      setIsEditing(false);
      toast.success("Invoice updated");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    async function fetchInvoice() {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase
          .from("invoices")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single()) as { data: Invoice | null; error: unknown };

        if (error) throw error;
        setInvoice(data);

        // Get signed URL for image
        if (data?.file_url) {
          const { data: urlData } = await supabase.storage
            .from("documents")
            .createSignedUrl(data.file_url, 3600);

          if (urlData?.signedUrl) {
            setImageUrl(urlData.signedUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();

    // Poll for status updates if processing
    const interval = setInterval(async () => {
      if (!id) return;

      const { data } = await (supabase
        .from("invoices")
        .select("status")
        .eq("id", id)
        .single()) as { data: { status: string } | null };

      if (data?.status === "completed" || data?.status === "error") {
        // Refresh full data
        fetchInvoice();
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, id]);

  const handleDelete = async () => {
    if (!invoice || !confirm("Are you sure you want to delete this receipt?")) return;

    try {
      // Delete from storage
      if (invoice.file_url) {
        await supabase.storage.from("documents").remove([invoice.file_url]);
      }

      // Delete from database
      await (supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id));

      toast.success("Receipt deleted");
      navigate("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Receipt not found</h1>
          <p className="text-muted-foreground mb-4">
            This receipt doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to receipts
          </Button>
        </div>
      </div>
    );
  }

  const isProcessing = invoice.status === "processing";
  const hasError = invoice.status === "error";

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            {!isEditing && invoice.status === "completed" && (
              <Button variant="outline" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {imageUrl && (
              <Button variant="outline" asChild>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {isProcessing && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Processing...</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The AI is analyzing the receipt. This usually takes 10-30 seconds.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {hasError && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Something went wrong</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Processing this receipt failed. Please try uploading it again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invoice Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted">
                  {invoice.file_url.endsWith(".pdf") ? (
                    <iframe
                      src={imageUrl}
                      className="w-full h-[500px]"
                      title="Receipt"
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Receipt"
                      className="w-full h-auto"
                    />
                  )}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center bg-muted rounded-lg">
                  <Receipt className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {invoice.filename}
              </p>
            </CardContent>
          </Card>

          {/* Extracted Data */}
          <div className="space-y-6">
            {/* Main Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Receipt details
                  </span>
                  {invoice.status === "completed" && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {invoice.has_handwritten_content && (
                        <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950">
                          <Pencil className="h-3 w-3" />
                          Handwritten
                        </Badge>
                      )}
                      {invoice.ai_confidence != null && (
                        <Badge
                          variant="outline"
                          className={`gap-1 ${invoice.ai_confidence < 0.8 ? "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950" : "text-muted-foreground"}`}
                        >
                          AI {Math.round(invoice.ai_confidence * 100)}%
                        </Badge>
                      )}
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Processed
                      </Badge>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vendor */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    Vendor
                  </div>
                  <p className="font-medium">{invoice.vendor_name || "-"}</p>
                  {invoice.vendor_address && (
                    <p className="text-sm text-muted-foreground">{invoice.vendor_address}</p>
                  )}
                  {invoice.vendor_tax_id && (
                    <p className="text-sm text-muted-foreground">EIN / Tax ID: {invoice.vendor_tax_id}</p>
                  )}
                </div>

                {/* Invoice Number & Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Hash className="h-4 w-4" />
                      Invoice #
                    </div>
                    <p className="font-medium">{invoice.invoice_number || "-"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      Date
                    </div>
                    <p className="font-medium">
                      {invoice.invoice_date
                        ? format(new Date(invoice.invoice_date), "MMMM d, yyyy")
                        : "-"
                      }
                    </p>
                  </div>
                </div>

                {/* Item */}
                {invoice.item_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Item</p>
                    <p className="font-medium">{invoice.item_description}</p>
                  </div>
                )}

                {/* Category */}
                {invoice.expense_category && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category (Schedule C)</p>
                    <Badge variant="outline">
                      {categoryLabels[invoice.expense_category] || invoice.expense_category}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amounts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Amounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{fmtMoney(invoice.net_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Sales Tax {invoice.vat_rate && `(${invoice.vat_rate})`}
                    </span>
                    <span className="font-medium">{fmtMoney(invoice.vat_amount)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg text-primary">{fmtMoney(invoice.gross_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verify note for low-confidence or handwritten extractions */}
            {(invoice.has_handwritten_content || (invoice.ai_confidence != null && invoice.ai_confidence < 0.8)) && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {invoice.has_handwritten_content
                      ? "Handwritten content was detected. Please double-check the amounts and dates against the original."
                      : "The AI was less certain about this receipt. Please verify the amounts and dates against the original."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Line Items */}
        {invoice.line_items && invoice.line_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Line items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Description</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit Price</th>
                      <th className="text-right py-2 font-medium">Subtotal</th>
                      <th className="text-right py-2 font-medium">Sales Tax</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">
                          {item.quantity ? `${item.quantity} ${item.unit || "ea"}` : "-"}
                        </td>
                        <td className="text-right py-2">{fmtMoney(item.unit_price)}</td>
                        <td className="text-right py-2">{fmtMoney(item.net_amount)}</td>
                        <td className="text-right py-2 text-muted-foreground">
                          {fmtMoney(itemTaxAmount(item))}
                          {itemTaxRate(item) && ` (${itemTaxRate(item)})`}
                        </td>
                        <td className="text-right py-2 font-medium">{fmtMoney(item.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit receipt</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Vendor Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor name</Label>
                  <Input
                    value={editForm.vendor_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>EIN / Tax ID</Label>
                  <Input
                    value={editForm.vendor_tax_id || ""}
                    onChange={(e) => setEditForm({ ...editForm, vendor_tax_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editForm.vendor_address || ""}
                  onChange={(e) => setEditForm({ ...editForm, vendor_address: e.target.value })}
                />
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice #</Label>
                  <Input
                    value={editForm.invoice_number || ""}
                    onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice date</Label>
                  <Input
                    type="date"
                    value={editForm.invoice_date || ""}
                    onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={editForm.due_date || ""}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Item */}
              <div className="space-y-2">
                <Label>Item description</Label>
                <Input
                  value={editForm.item_description || ""}
                  onChange={(e) => setEditForm({ ...editForm, item_description: e.target.value })}
                />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal ($)</Label>
                  <Input
                    type="number"
                    value={editForm.net_amount || ""}
                    onChange={(e) => setEditForm({ ...editForm, net_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sales Tax ($)</Label>
                  <Input
                    type="number"
                    value={editForm.vat_amount || ""}
                    onChange={(e) => setEditForm({ ...editForm, vat_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total ($)</Label>
                  <Input
                    type="number"
                    value={editForm.gross_amount || ""}
                    onChange={(e) => setEditForm({ ...editForm, gross_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sales tax rate</Label>
                  <Input
                    placeholder="e.g. 8.25%"
                    value={editForm.vat_rate || ""}
                    onChange={(e) => setEditForm({ ...editForm, vat_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editForm.expense_category || ""}
                    onValueChange={(v) => setEditForm({ ...editForm, expense_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={editForm.payment_method || ""}
                  onValueChange={(v) => setEditForm({ ...editForm, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
