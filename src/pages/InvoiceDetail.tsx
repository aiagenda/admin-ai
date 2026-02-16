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
import { hu } from "date-fns/locale";

interface LineItem {
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  net_amount: number | null;
  vat_rate: string | null;
  vat_amount: number | null;
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

  // Start editing
  const startEditing = () => {
    if (invoice) {
      setEditForm({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        fulfillment_date: invoice.fulfillment_date,
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
        .from("invoices" as any)
        .update({
          invoice_number: editForm.invoice_number,
          invoice_date: editForm.invoice_date,
          due_date: editForm.due_date,
          fulfillment_date: editForm.fulfillment_date,
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
      toast.success("Számla adatok frissítve");
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Hiba a mentés során");
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
          .from("invoices" as any)
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single()) as { data: Invoice | null; error: any };

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
      } catch (error: any) {
        console.error("Error fetching invoice:", error);
        toast.error("Hiba a számla betöltése során");
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();

    // Poll for status updates if processing
    const interval = setInterval(async () => {
      if (!id) return;
      
      const { data } = await (supabase
        .from("invoices" as any)
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
    if (!invoice || !confirm("Biztosan törölni szeretnéd ezt a számlát?")) return;

    try {
      // Delete from storage
      if (invoice.file_url) {
        await supabase.storage.from("documents").remove([invoice.file_url]);
      }

      // Delete from database
      await (supabase
        .from("invoices" as any)
        .delete()
        .eq("id", invoice.id));

      toast.success("Számla törölve");
      navigate("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Hiba a törlés során");
    }
  };

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

  if (!invoice) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Számla nem található</h1>
          <p className="text-muted-foreground mb-4">
            A keresett számla nem létezik vagy nincs hozzáférésed.
          </p>
          <Button onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vissza a számlákhoz
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
            Vissza
          </Button>
          <div className="flex gap-2">
            {!isEditing && invoice.status === "completed" && (
              <Button variant="outline" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-2" />
                Szerkesztés
              </Button>
            )}
            {imageUrl && (
              <Button variant="outline" asChild>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Letöltés
                </a>
              </Button>
            )}
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Törlés
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {isProcessing && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Feldolgozás alatt...</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Az AI elemzi a számlát. Ez általában 10-30 másodpercig tart.
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
                <h4 className="font-medium text-red-800 dark:text-red-200">Hiba történt</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  A számla feldolgozása sikertelen volt. Próbáld újra feltölteni.
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
                Számla
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imageUrl ? (
                <div className="border rounded-lg overflow-hidden bg-muted">
                  {invoice.file_url.endsWith(".pdf") ? (
                    <iframe
                      src={imageUrl}
                      className="w-full h-[500px]"
                      title="Számla"
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Számla"
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
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Számla adatok
                  </span>
                  {invoice.status === "completed" && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Feldolgozva
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vendor */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    Kibocsátó
                  </div>
                  <p className="font-medium">{invoice.vendor_name || "-"}</p>
                  {invoice.vendor_address && (
                    <p className="text-sm text-muted-foreground">{invoice.vendor_address}</p>
                  )}
                  {invoice.vendor_tax_id && (
                    <p className="text-sm text-muted-foreground">Adószám: {invoice.vendor_tax_id}</p>
                  )}
                </div>

                {/* Invoice Number & Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Hash className="h-4 w-4" />
                      Számlaszám
                    </div>
                    <p className="font-medium">{invoice.invoice_number || "-"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      Dátum
                    </div>
                    <p className="font-medium">
                      {invoice.invoice_date 
                        ? format(new Date(invoice.invoice_date), "yyyy. MMMM d.", { locale: hu })
                        : "-"
                      }
                    </p>
                  </div>
                </div>

                {/* Item */}
                {invoice.item_description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tétel</p>
                    <p className="font-medium">{invoice.item_description}</p>
                  </div>
                )}

                {/* Category */}
                {invoice.expense_category && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Kategória</p>
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
                <CardTitle className="text-lg">Összegek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nettó</span>
                    <span className="font-medium">
                      {invoice.net_amount 
                        ? `${invoice.net_amount.toLocaleString("hu-HU")} ${invoice.currency || "Ft"}`
                        : "-"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      ÁFA {invoice.vat_rate && `(${invoice.vat_rate})`}
                    </span>
                    <span className="font-medium">
                      {invoice.vat_amount 
                        ? `${invoice.vat_amount.toLocaleString("hu-HU")} ${invoice.currency || "Ft"}`
                        : "-"
                      }
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Bruttó</span>
                    <span className="font-bold text-lg text-primary">
                      {invoice.gross_amount 
                        ? `${invoice.gross_amount.toLocaleString("hu-HU")} ${invoice.currency || "Ft"}`
                        : "-"
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Info */}
            {invoice.ai_confidence && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AI megbízhatóság</span>
                    <span className="font-medium">
                      {Math.round(invoice.ai_confidence * 100)}%
                    </span>
                  </div>
                  {invoice.has_handwritten_content && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Kézírásos elemek észlelve - ellenőrizd az adatokat
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Line Items - Részletes tételek */}
        {invoice.line_items && invoice.line_items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5" />
                Tételek részletezése
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Megnevezés</th>
                      <th className="text-right py-2 font-medium">Mennyiség</th>
                      <th className="text-right py-2 font-medium">Egységár</th>
                      <th className="text-right py-2 font-medium">Nettó</th>
                      <th className="text-right py-2 font-medium">ÁFA</th>
                      <th className="text-right py-2 font-medium">Bruttó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">
                          {item.quantity ? `${item.quantity} ${item.unit || "db"}` : "-"}
                        </td>
                        <td className="text-right py-2">
                          {item.unit_price ? `${item.unit_price.toLocaleString("hu-HU")} Ft` : "-"}
                        </td>
                        <td className="text-right py-2">
                          {item.net_amount ? `${item.net_amount.toLocaleString("hu-HU")} Ft` : "-"}
                        </td>
                        <td className="text-right py-2 text-muted-foreground">
                          {item.vat_amount ? `${item.vat_amount.toLocaleString("hu-HU")} Ft` : "-"}
                          {item.vat_rate && ` (${item.vat_rate})`}
                        </td>
                        <td className="text-right py-2 font-medium">
                          {item.gross_amount ? `${item.gross_amount.toLocaleString("hu-HU")} Ft` : "-"}
                        </td>
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
              <DialogTitle>Számla szerkesztése</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Vendor Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kibocsátó neve</Label>
                  <Input 
                    value={editForm.vendor_name || ""} 
                    onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adószám</Label>
                  <Input 
                    value={editForm.vendor_tax_id || ""} 
                    onChange={(e) => setEditForm({ ...editForm, vendor_tax_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cím</Label>
                <Input 
                  value={editForm.vendor_address || ""} 
                  onChange={(e) => setEditForm({ ...editForm, vendor_address: e.target.value })}
                />
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Számlaszám</Label>
                  <Input 
                    value={editForm.invoice_number || ""} 
                    onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Számla dátuma</Label>
                  <Input 
                    type="date"
                    value={editForm.invoice_date || ""} 
                    onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teljesítés dátuma</Label>
                  <Input 
                    type="date"
                    value={editForm.fulfillment_date || ""} 
                    onChange={(e) => setEditForm({ ...editForm, fulfillment_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fizetési határidő</Label>
                  <Input 
                    type="date"
                    value={editForm.due_date || ""} 
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Item */}
              <div className="space-y-2">
                <Label>Tétel megnevezése</Label>
                <Input 
                  value={editForm.item_description || ""} 
                  onChange={(e) => setEditForm({ ...editForm, item_description: e.target.value })}
                />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nettó (Ft)</Label>
                  <Input 
                    type="number"
                    value={editForm.net_amount || ""} 
                    onChange={(e) => setEditForm({ ...editForm, net_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ÁFA (Ft)</Label>
                  <Input 
                    type="number"
                    value={editForm.vat_amount || ""} 
                    onChange={(e) => setEditForm({ ...editForm, vat_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bruttó (Ft)</Label>
                  <Input 
                    type="number"
                    value={editForm.gross_amount || ""} 
                    onChange={(e) => setEditForm({ ...editForm, gross_amount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ÁFA kulcs</Label>
                  <Select 
                    value={editForm.vat_rate || ""} 
                    onValueChange={(v) => setEditForm({ ...editForm, vat_rate: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="27%">27%</SelectItem>
                      <SelectItem value="18%">18%</SelectItem>
                      <SelectItem value="5%">5%</SelectItem>
                      <SelectItem value="0%">0%</SelectItem>
                      <SelectItem value="AAM">AAM</SelectItem>
                      <SelectItem value="TAM">TAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kategória</Label>
                  <Select 
                    value={editForm.expense_category || ""} 
                    onValueChange={(v) => setEditForm({ ...editForm, expense_category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz..." />
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
                <Label>Fizetési mód</Label>
                <Select 
                  value={editForm.payment_method || ""} 
                  onValueChange={(v) => setEditForm({ ...editForm, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="készpénz">Készpénz</SelectItem>
                    <SelectItem value="átutalás">Átutalás</SelectItem>
                    <SelectItem value="bankkártya">Bankkártya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Mégse
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Mentés
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
