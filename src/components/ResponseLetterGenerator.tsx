import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  FileDown,
  Copy,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import type { LetterType } from "@/lib/actionPaths";

export type { LetterType };

interface ResponseLetterGeneratorProps {
  analysisId: string;
  letterType: LetterType;
  /** Human label for the button/section. */
  label: string;
  onBack?: () => void;
}

interface LetterResult {
  title: string;
  subject: string;
  body: string;
  checklist: string[];
}

function functionsBase(): string {
  return (
    import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  );
}

export function ResponseLetterGenerator({
  analysisId,
  letterType,
  label,
  onBack,
}: ResponseLetterGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LetterResult | null>(null);
  const [body, setBody] = useState("");

  const generate = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in");
        return;
      }

      const res = await fetch(`${functionsBase()}/generate-response-letter`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysisId, letterType }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Could not generate the letter");
      }

      const r: LetterResult = {
        title: json.title,
        subject: json.subject,
        body: json.body,
        checklist: json.checklist || [],
      };
      setResult(r);
      setBody(r.body);
      toast.success("Draft letter ready — review and edit before sending");
    } catch (e) {
      console.error("Letter generation error:", e);
      toast.error(e instanceof Error ? e.message : "Could not generate the letter");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const downloadPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const left = 56;
      const right = 556;
      let y = 64;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20);

      const paragraphs = body.split("\n");
      for (const para of paragraphs) {
        if (para.trim() === "") {
          y += 10;
          continue;
        }
        const lines = doc.splitTextToSize(para, right - left);
        for (const line of lines) {
          doc.text(line, left, y);
          y += 15;
          if (y > 740) {
            doc.addPage();
            y = 64;
          }
        }
      }

      doc.save(`${letterType}-letter.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      console.error("PDF error:", e);
      toast.error("Could not create PDF");
    }
  };

  // ---- Initial / generating state ------------------------------------------
  if (!result) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 mb-1 text-muted-foreground"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Other options
            </Button>
          )}
          <CardTitle className="text-xl">{label}</CardTitle>
          <p className="text-sm text-muted-foreground">
            We'll draft a personalized letter using the details from your document.
            You can edit it, then download or copy it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generate} size="lg" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Writing your letter…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate my response letter
              </>
            )}
          </Button>
          <LegalDisclaimer variant="general" compact />
        </CardContent>
      </Card>
    );
  }

  // ---- Result state ---------------------------------------------------------
  return (
    <Card className="border-primary/30">
      <CardHeader>
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 mb-1 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Other options
          </Button>
        )}
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">{result.title}</CardTitle>
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" />
            Draft
          </Badge>
        </div>
        {result.subject && (
          <p className="text-sm text-muted-foreground">RE: {result.subject}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="font-mono text-sm leading-relaxed"
        />

        <div className="flex flex-wrap gap-3">
          <Button onClick={downloadPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy text
          </Button>
          <Button variant="outline" onClick={generate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>

        {result.checklist.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
            <h4 className="text-sm font-semibold">Before you send</h4>
            <ul className="space-y-1.5">
              {result.checklist.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <LegalDisclaimer variant="general" compact />
      </CardContent>
    </Card>
  );
}
