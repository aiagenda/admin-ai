import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Printer, FileText, Calendar, Info } from "lucide-react";
import { Form } from "@/pages/Result";

interface FormCardProps {
  form: Form;
  showInstructions?: boolean;
}

export function FormCard({ form, showInstructions = true }: FormCardProps) {
  const handleDownload = () => {
    const url = form.download_url || form.pdf_url;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const url = form.print_url || form.pdf_url;
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleOnlineFill = () => {
    if (form.fillable_url || form.online_url) {
      window.open(form.fillable_url || form.online_url || "", "_blank");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{form.name}</CardTitle>
            {form.institution && (
              <CardDescription className="mt-1">
                Intézmény: {form.institution}
              </CardDescription>
            )}
          </div>
          {form.form_type && (
            <Badge variant="outline" className="ml-2">
              {form.form_type === "form" && "Űrlap"}
              {form.form_type === "letter" && "Levél"}
              {form.form_type === "guide" && "Útmutató"}
              {form.form_type === "template" && "Sablon"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.description && (
          <p className="text-sm text-muted-foreground">{form.description}</p>
        )}

        {form.category && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{form.category}</Badge>
          </div>
        )}

        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {showInstructions && form.instructions && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Kitöltési útmutató</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {form.instructions}
                </p>
              </div>
            </div>
          </div>
        )}

        {form.deadline_info && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{form.deadline_info}</span>
          </div>
        )}

        {form.required_documents && form.required_documents.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Szükséges mellékletek:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              {form.required_documents.map((doc, index) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4 mr-2" />
            Letöltés
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Printer className="h-4 w-4 mr-2" />
            Nyomtatás
          </Button>

          {(form.fillable_url || form.online_url) && (
            <Button
              onClick={handleOnlineFill}
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Online kitöltés
            </Button>
          )}

          {form.pdf_url && (
            <Button
              onClick={() => window.open(form.pdf_url, "_blank")}
              variant="ghost"
              size="sm"
              className="flex-1 sm:flex-initial"
            >
              <FileText className="h-4 w-4 mr-2" />
              Megtekintés
            </Button>
          )}
        </div>

        {form.official_source_url && (
          <div className="pt-2 border-t">
            <a
              href={form.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Hivatalos forrás
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

