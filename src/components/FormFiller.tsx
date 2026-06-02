import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Download, Printer, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FormField {
  name: string;
  type: "text" | "textarea" | "number" | "date" | "checkbox" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormFillerProps {
  formId: string;
  formKey: string;
  formName: string;
  pdfUrl: string;
  fillableUrl?: string | null;
  onlineUrl?: string | null;
  instructions?: string | null;
}

export function FormFiller({
  formId: _formId,
  formKey,
  formName,
  pdfUrl,
  fillableUrl,
  onlineUrl,
  instructions,
}: FormFillerProps) {
  const { t } = useTranslation("common");
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const externalOfficialUrl = (fillableUrl || onlineUrl || "").trim() || null;

  const defaultFields = useMemo<FormField[]>(
    () => [
      { name: "name", type: "text", label: t("formFiller.field.name"), required: true, placeholder: t("formFiller.ph.name") },
      { name: "email", type: "text", label: t("formFiller.field.email"), required: true, placeholder: t("formFiller.ph.email") },
      { name: "phone", type: "text", label: t("formFiller.field.phone"), placeholder: t("formFiller.ph.phone") },
      { name: "address", type: "textarea", label: t("formFiller.field.address"), required: true, placeholder: t("formFiller.ph.address") },
      { name: "date", type: "date", label: t("formFiller.field.date"), required: true },
      { name: "signature", type: "checkbox", label: t("formFiller.field.signature"), required: true },
    ],
    [t],
  );

  useEffect(() => {
    const savedData = localStorage.getItem(`form_${formKey}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as Record<string, unknown>;
        setFormData(parsed);
        setSaved(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [formKey]);

  useEffect(() => {
    setFields(defaultFields);
    setLoading(false);
  }, [defaultFields]);

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(formData));
      setSaved(true);
      toast.success(t("formFiller.progressSaved"));
    } catch {
      toast.error(t("formFiller.saveError"));
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) {
      toast.info(t("formFiller.pdfSoon"));
      return;
    }
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${formKey}.pdf`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const handlePrint = () => window.print();

  const handleSubmit = async () => {
    const missing = fields.filter((f) => f.required && !formData[f.name]).map((f) => f.label);
    if (missing.length) {
      toast.error(`${t("formFiller.missingRequired")} ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      await Promise.resolve(handleSave());
      toast.success(t("formFiller.submitSuccess"));
      localStorage.removeItem(`form_${formKey}`);
      setFormData({});
      setSaved(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("formFiller.unknownError");
      toast.error(`${t("formFiller.submitError")} ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {externalOfficialUrl && (
        <Card>
          <CardContent className="pt-6">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" asChild>
              <a href={externalOfficialUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("formFiller.openOfficialOnline")}
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
      {instructions && (
        <Card>
          <CardHeader>
            <CardTitle>{t("formFiller.instructionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{instructions}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{formName}</CardTitle>
              <CardDescription>{t("formFiller.fillFieldsBelow")}</CardDescription>
            </div>
            {saved && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("formFiller.saved")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "text" && (
                  <Input id={field.name} type="text" value={(formData[field.name] as string) || ""} onChange={(e) => handleFieldChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} />
                )}
                {field.type === "textarea" && (
                  <Textarea id={field.name} value={(formData[field.name] as string) || ""} onChange={(e) => handleFieldChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} rows={3} />
                )}
                {field.type === "number" && (
                  <Input id={field.name} type="number" value={(formData[field.name] as string) || ""} onChange={(e) => handleFieldChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} />
                )}
                {field.type === "date" && (
                  <Input id={field.name} type="date" value={(formData[field.name] as string) || ""} onChange={(e) => handleFieldChange(field.name, e.target.value)} required={field.required} />
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id={field.name} checked={Boolean(formData[field.name])} onCheckedChange={(c) => handleFieldChange(field.name, c)} required={field.required} />
                    <Label htmlFor={field.name} className="font-normal cursor-pointer">{field.label}</Label>
                  </div>
                )}
                {field.type === "select" && (
                  <Select value={(formData[field.name] as string) || ""} onValueChange={(v) => handleFieldChange(field.name, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || t("formFiller.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <Button type="button" onClick={handleSave} variant="outline" disabled={saving}><Save className="h-4 w-4 mr-2" />{t("formFiller.save")}</Button>
            <Button type="button" onClick={handleDownload} variant="outline" disabled={saving}><Download className="h-4 w-4 mr-2" />{t("formFiller.downloadPdf")}</Button>
            <Button type="button" onClick={handlePrint} variant="outline" disabled={saving}><Printer className="h-4 w-4 mr-2" />{t("formFiller.print")}</Button>
            <Button type="button" onClick={handleSubmit} disabled={saving} className="ml-auto">
              {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("formFiller.submitting")}</>) : t("formFiller.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{t("formFiller.footerHint")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
