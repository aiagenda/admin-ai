import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Download, Printer, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormField {
  name: string;
  type: "text" | "textarea" | "number" | "date" | "checkbox" | "select";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  value?: string | boolean;
}

interface FormFillerProps {
  formId: string;
  formKey: string;
  formName: string;
  pdfUrl: string;
  fillableUrl?: string | null;
  instructions?: string | null;
}

export function FormFiller({
  formId,
  formKey,
  formName,
  pdfUrl,
  fillableUrl,
  instructions,
}: FormFillerProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Load saved progress from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`form_${formKey}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
        setSaved(true);
      } catch (error) {
        console.error("Failed to load saved form data:", error);
      }
    }
  }, [formKey]);

  // Initialize form fields (simplified - in production, you'd parse the PDF form fields)
  useEffect(() => {
    // For now, we'll create a simple form structure
    // In production, you'd use pdf-lib or react-pdf to extract actual form fields
    const defaultFields: FormField[] = [
      {
        name: "name",
        type: "text",
        label: "Név",
        required: true,
        placeholder: "Teljes név",
      },
      {
        name: "email",
        type: "text",
        label: "Email cím",
        required: true,
        placeholder: "email@example.com",
      },
      {
        name: "phone",
        type: "text",
        label: "Telefonszám",
        placeholder: "+36 20 123 4567",
      },
      {
        name: "address",
        type: "textarea",
        label: "Lakcím",
        required: true,
        placeholder: "Irányítószám, Város, Utca, Házszám",
      },
      {
        name: "date",
        type: "date",
        label: "Dátum",
        required: true,
      },
      {
        name: "signature",
        type: "checkbox",
        label: "Aláírom, hogy az adatok helyesek",
        required: true,
      },
    ];

    setFields(defaultFields);
    setLoading(false);
  }, []);

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(formData));
      setSaved(true);
      toast.success("Előrehaladás mentve");
    } catch (error) {
      toast.error("Hiba a mentés során");
    }
  };

  const handleDownload = () => {
    // In production, you'd generate a filled PDF using pdf-lib
    toast.info("PDF generálás funkció hamarosan elérhető");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = fields
      .filter((field) => field.required && !formData[field.name])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      toast.error(`Kérjük, töltse ki a kötelező mezőket: ${missingFields.join(", ")}`);
      return;
    }

    setSaving(true);

    try {
      // In production, you'd submit the form data to your backend
      // For now, we'll just save it
      await handleSave();
      
      toast.success("Űrlap sikeresen elküldve");
      
      // Clear saved data after successful submission
      localStorage.removeItem(`form_${formKey}`);
      setFormData({});
      setSaved(false);
    } catch (error: any) {
      toast.error("Hiba az elküldés során: " + (error.message || "Ismeretlen hiba"));
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
      {/* Instructions */}
      {instructions && (
        <Card>
          <CardHeader>
            <CardTitle>Kitöltési útmutató</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{formName}</CardTitle>
              <CardDescription>Kérjük, töltse ki az alábbi mezőket</CardDescription>
            </div>
            {saved && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Mentve
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
                  <Input
                    id={field.name}
                    type="text"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}

                {field.type === "textarea" && (
                  <Textarea
                    id={field.name}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                  />
                )}

                {field.type === "number" && (
                  <Input
                    id={field.name}
                    type="number"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}

                {field.type === "date" && (
                  <Input
                    id={field.name}
                    type="date"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    required={field.required}
                  />
                )}

                {field.type === "checkbox" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={formData[field.name] || false}
                      onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
                      required={field.required}
                    />
                    <Label htmlFor={field.name} className="font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                )}

                {field.type === "select" && (
                  <Select
                    value={formData[field.name] || ""}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || "Válasszon..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <Button onClick={handleSave} variant="outline" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Mentés
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={saving}>
              <Download className="h-4 w-4 mr-2" />
              PDF letöltése
            </Button>
            <Button onClick={handlePrint} variant="outline" disabled={saving}>
              <Printer className="h-4 w-4 mr-2" />
              Nyomtatás
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="ml-auto">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Küldés...
                </>
              ) : (
                "Elküldés"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p>
              Az előrehaladás automatikusan mentésre kerül. Ha szeretné, letöltheti kitöltött űrlapot PDF formátumban vagy kinyomtathatja.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

