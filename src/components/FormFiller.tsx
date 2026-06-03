import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Download,
  Printer,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPrefillValues,
  getFormFields,
  type AnalysisForPrefill,
  type PrefillFieldDef,
} from "@/lib/formPrefill";
import { hasVerifiedFieldMap } from "@/lib/formFieldMaps";
import { fillAndDownloadPdf } from "@/lib/fillPdfForm";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

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
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get("analysis");

  const fields = useMemo<PrefillFieldDef[]>(() => getFormFields(formKey), [formKey]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(Boolean(analysisId));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const externalOfficialUrl = (fillableUrl || onlineUrl || "").trim() || null;

  // Load any locally saved draft first.
  useEffect(() => {
    const savedData = localStorage.getItem(`form_${formKey}`);
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData) as Record<string, string>);
        setSaved(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [formKey]);

  // Prefill from the analyzed document.
  useEffect(() => {
    let cancelled = false;
    async function loadPrefill() {
      if (!analysisId) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("analyses")
          .select("recipient_name, amount, agency, issuer, doc_type, deadline, extracted_fields")
          .eq("id", analysisId)
          .single();

        if (!cancelled && data) {
          const values = buildPrefillValues(data as AnalysisForPrefill);
          const filled = new Set<string>();
          setFormData((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(values)) {
              // Don't overwrite a value the user already saved/typed.
              if (v && !next[k]) {
                next[k] = v;
                filled.add(k);
              }
            }
            return next;
          });
          setPrefilledKeys(filled);
        }
      } catch (e) {
        console.error("Prefill error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPrefill();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    // Once edited, it's no longer "auto-filled".
    setPrefilledKeys((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(formData));
      setSaved(true);
      toast.success("Progress saved");
    } catch {
      toast.error("Could not save progress");
    }
  }, [formKey, formData]);

  const handleDownloadOfficial = () => {
    if (!pdfUrl) {
      toast.info("Official PDF coming soon");
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

  const canFillOfficial = hasVerifiedFieldMap(formKey);

  // Fill the real official IRS PDF's form fields and download it.
  const handleFillOfficial = async () => {
    const missing = fields
      .filter((f) => f.required && !formData[f.name]?.trim())
      .map((f) => f.label);
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      handleSave();
      const { filledCount } = await fillAndDownloadPdf(formKey, pdfUrl, formData, `${formKey}-filled.pdf`);
      toast.success(`Filled ${filledCount} field${filledCount === 1 ? "" : "s"} on the official form — review before signing.`);
    } catch (e) {
      console.error("Official PDF fill error:", e);
      toast.error("Could not fill the official PDF — use the worksheet or online form instead.");
    } finally {
      setSaving(false);
    }
  };

  // Generate a clean, completed worksheet PDF from the reviewed data.
  const handleGeneratePdf = async () => {
    const missing = fields
      .filter((f) => f.required && !formData[f.name]?.trim())
      .map((f) => f.label);
    if (missing.length) {
      toast.error(`Please complete: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      handleSave();
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const left = 56;
      let y = 64;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(formName, left, y);
      y += 22;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110);
      doc.text("Completed worksheet — review, then transfer to the official form or file online.", left, y);
      doc.setTextColor(20);
      y += 28;

      doc.setDrawColor(220);
      doc.line(left, y, 556, y);
      y += 24;

      for (const f of fields) {
        const value = formData[f.name]?.trim() || "—";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${f.label}:`, left, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(value, 320);
        doc.text(lines, left + 200, y);
        y += Math.max(18, lines.length * 14);
        if (y > 720) {
          doc.addPage();
          y = 64;
        }
      }

      y += 16;
      doc.setDrawColor(220);
      doc.line(left, y, 556, y);
      y += 20;
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(
        `Generated by GovLetter on ${new Date().toLocaleDateString("en-US")}. Not tax or legal advice.`,
        left,
        y,
      );

      doc.save(`${formKey}-worksheet.pdf`);
      toast.success("Worksheet PDF created");
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Could not generate PDF");
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

  const prefilledCount = prefilledKeys.size;

  return (
    <div className="space-y-6">
      {prefilledCount > 0 && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="flex items-start gap-3 pt-6">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">We pre-filled {prefilledCount} field{prefilledCount > 1 ? "s" : ""} from your letter.</p>
              <p className="text-muted-foreground">Review each value, fix anything that's off, and complete the rest. Pre-filled fields are marked.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {externalOfficialUrl && (
        <Card>
          <CardContent className="pt-6">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" asChild>
              <a href={externalOfficialUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open the official online form
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filing instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{instructions}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{formName}</CardTitle>
              <CardDescription>Review and confirm your details below</CardDescription>
            </div>
            {saved && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {fields.map((field) => {
              const isPrefilled = prefilledKeys.has(field.name);
              return (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {isPrefilled && (
                      <Badge variant="secondary" className="gap-1 text-[10px] py-0 h-5">
                        <Sparkles className="h-2.5 w-2.5" />
                        From your letter
                      </Badge>
                    )}
                  </div>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className={isPrefilled ? "border-primary/40" : ""}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type === "number" ? "number" : "text"}
                      value={formData[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className={isPrefilled ? "border-primary/40" : ""}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <Button type="button" onClick={handleSave} variant="outline" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save draft
            </Button>
            <Button type="button" onClick={handleDownloadOfficial} variant="outline" disabled={saving}>
              <Download className="h-4 w-4 mr-2" />
              Blank PDF
            </Button>
            <Button type="button" onClick={handlePrint} variant="outline" disabled={saving}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {canFillOfficial ? (
              <div className="ml-auto flex flex-wrap gap-3">
                <Button type="button" onClick={handleGeneratePdf} variant="outline" disabled={saving}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Worksheet
                </Button>
                <Button type="button" onClick={handleFillOfficial} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Filling…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Download filled official PDF
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={handleGeneratePdf} disabled={saving} className="ml-auto">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Confirm & generate PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <LegalDisclaimer variant="forms" />
    </div>
  );
}
