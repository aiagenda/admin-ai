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
  ListChecks,
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
  /** Render inline inside GuidedActions (no nested card). */
  embedded?: boolean;
  /** When true, offer AI response strategies before drafting; else draft directly. */
  useStrategies?: boolean;
  /** A strategy already chosen by the option card — draft the letter for it directly. */
  presetStrategy?: { title: string; detail: string };
}

interface Strategy {
  id: string;
  title: string;
  summary: string;
  bestFor: string;
  considerations: string;
}

interface LetterResult {
  title: string;
  subject: string;
  body: string;
  checklist: string[];
  strategyTitle?: string | null;
}

type Step = "intro" | "strategies" | "letter";

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
  embedded = false,
  useStrategies = false,
  presetStrategy,
}: ResponseLetterGeneratorProps) {
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [intro, setIntro] = useState("");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<LetterResult | null>(null);
  const [body, setBody] = useState("");

  async function callFn(payload: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in");
      throw new Error("Not signed in");
    }
    const res = await fetch(`${functionsBase()}/generate-response-letter`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ analysisId, letterType, ...payload }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || "Something went wrong");
    }
    return json;
  }

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const json = await callFn({ mode: "strategies" });
      setIntro(json.intro || "Pick the approach that fits your situation.");
      setStrategies(Array.isArray(json.strategies) ? json.strategies : []);
      setStep("strategies");
    } catch (e) {
      console.error("Strategies error:", e);
      toast.error(e instanceof Error ? e.message : "Could not load options");
    } finally {
      setLoading(false);
    }
  };

  const generateLetter = async () => {
    const chosen = strategies.find((s) => s.id === selectedId) || null;
    const stratTitle = chosen?.title ?? presetStrategy?.title;
    const stratDetail = [chosen?.summary ?? presetStrategy?.detail, notes.trim()]
      .filter(Boolean)
      .join(" — ");
    setLoading(true);
    try {
      const json = await callFn({
        mode: "letter",
        strategyTitle: stratTitle,
        strategyDetail: stratDetail,
        userNotes: notes.trim() || undefined,
      });
      const r: LetterResult = {
        title: json.title,
        subject: json.subject,
        body: json.body,
        checklist: json.checklist || [],
        strategyTitle: json.strategyTitle ?? stratTitle ?? null,
      };
      setResult(r);
      setBody(r.body);
      setStep("letter");
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

  // ---- Step content ---------------------------------------------------------
  const introStep = (
    <div className="space-y-4 min-w-0">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">Response letter</h4>
        <p className="text-sm text-muted-foreground">
          {presetStrategy
            ? `We'll draft a "${presetStrategy.title}" letter using the details from your document. Add anything specific below (optional), then we'll write it.`
            : useStrategies
            ? "First, we'll look at your document and show you the realistic ways to respond. You pick the one that fits — then we draft that letter for you."
            : "We'll draft a personalized letter using the details from your document. You can edit it, then download or copy it."}
        </p>
      </div>
      {presetStrategy && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. I never received the equipment they're billing me for; I already paid $500 in January."
            rows={3}
          />
        </div>
      )}
      <Button
        onClick={presetStrategy ? generateLetter : useStrategies ? loadStrategies : generateLetter}
        size="lg"
        disabled={loading}
        className="w-full max-w-full whitespace-normal h-auto min-h-11 py-3 px-4"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
            {useStrategies && !presetStrategy ? "Looking at your options…" : "Writing your letter…"}
          </>
        ) : presetStrategy ? (
          <>
            <Sparkles className="h-4 w-4 mr-2 shrink-0" />
            Write this response
          </>
        ) : useStrategies ? (
          <>
            <ListChecks className="h-4 w-4 mr-2 shrink-0" />
            See my response options
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2 shrink-0" />
            Generate my response letter
          </>
        )}
      </Button>
      <LegalDisclaimer variant="general" compact />
    </div>
  );

  const strategiesStep = (
    <div className="space-y-4 min-w-0">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 mb-1 text-muted-foreground"
          onClick={() => setStep("intro")}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h4 className="text-sm font-semibold">How do you want to respond?</h4>
        {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
      </div>

      <div className="space-y-3">
        {strategies.map((s) => {
          const active = selectedId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                active
                  ? "border-primary ring-1 ring-primary bg-primary/[0.04]"
                  : "hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                  }`}
                >
                  {active && <CheckCircle2 className="h-4 w-4" />}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-sm">{s.title}</p>
                  {s.summary && <p className="text-sm text-muted-foreground">{s.summary}</p>}
                  {(s.bestFor || s.considerations) && (
                    <div className="pt-1 space-y-0.5">
                      {s.bestFor && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Best if:</span> {s.bestFor}
                        </p>
                      )}
                      {s.considerations && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Keep in mind:</span> {s.considerations}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. I never received the equipment they're billing me for; I already paid $500 in January."
          rows={3}
        />
      </div>

      <Button
        onClick={generateLetter}
        size="lg"
        disabled={loading || !selectedId}
        className="w-full max-w-full whitespace-normal h-auto min-h-11 py-3 px-4"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
            Writing your letter…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2 shrink-0" />
            Write this response
          </>
        )}
      </Button>
      <LegalDisclaimer variant="general" compact />
    </div>
  );

  const letterStep = result && (
    <div className="space-y-5 min-w-0">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 mb-1 text-muted-foreground"
          onClick={() => setStep(useStrategies ? "strategies" : "intro")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {useStrategies ? "Change approach" : "Start over"}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-semibold">{result.title}</h4>
          <Badge variant="outline" className="gap-1 text-xs">
            <Sparkles className="h-3 w-3" />
            Draft
          </Badge>
        </div>
        {result.strategyTitle && (
          <p className="text-sm text-muted-foreground">Approach: {result.strategyTitle}</p>
        )}
        {result.subject && (
          <p className="text-sm text-muted-foreground">RE: {result.subject}</p>
        )}
      </div>

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
        <Button variant="outline" onClick={generateLetter} disabled={loading}>
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
    </div>
  );

  const content =
    step === "intro" ? introStep : step === "strategies" ? strategiesStep : letterStep;

  if (embedded) {
    return <div className="border-t pt-6 min-w-0">{content}</div>;
  }

  return (
    <Card className="border-primary/30 overflow-hidden">
      {onBack && (
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Other options
          </Button>
          <CardTitle className="text-xl">{label}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={onBack ? "min-w-0" : "pt-6 min-w-0"}>{content}</CardContent>
    </Card>
  );
}
