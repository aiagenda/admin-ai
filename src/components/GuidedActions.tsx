import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import type { ActionPath, ActionPathsResult } from "@/lib/actionPaths";
import type { Form } from "@/pages/Result";
import { FormCard } from "@/components/FormCard";

interface GuidedActionsProps {
  result: ActionPathsResult;
  /** Forms available in the DB, keyed by their `key`. */
  formsByKey: Map<string, Form>;
  /** Analysis id used to prefill forms with the extracted data. */
  analysisId?: string;
}

export function GuidedActions({ result, formsByKey, analysisId }: GuidedActionsProps) {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selected = result.paths.find((p) => p.key === selectedKey) || null;

  const toneRing = (tone?: ActionPath["tone"]) => {
    switch (tone) {
      case "positive":
        return "hover:border-green-500/60";
      case "caution":
        return "hover:border-amber-500/60";
      default:
        return "hover:border-primary/60";
    }
  };

  const openPrefilledForm = (formKey: string) => {
    const qs = analysisId ? `?analysis=${analysisId}` : "";
    navigate(`/form/${formKey}${qs}`);
  };

  // ---- Selected path detail view --------------------------------------------
  if (selected) {
    const forms = selected.formKeys
      .map((k) => formsByKey.get(k))
      .filter((f): f is Form => Boolean(f));

    return (
      <Card className="border-primary/30">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 mb-1 text-muted-foreground"
            onClick={() => setSelectedKey(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Other options
          </Button>
          <CardTitle className="text-xl">{selected.label}</CardTitle>
          <p className="text-sm text-muted-foreground">{selected.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Your steps</h4>
            <ol className="space-y-2">
              {selected.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* External official action */}
          {selected.externalUrl && (
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <a href={selected.externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {selected.externalLabel || "Official website"}
              </a>
            </Button>
          )}

          {/* Relevant forms with AI prefill */}
          {forms.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">
                  {forms.length === 1 ? "Form you need" : "Forms you need"}
                </h4>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Auto-filled from your letter
                </Badge>
              </div>
              {forms.map((form) => (
                <div key={form.id} className="space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => openPrefilledForm(form.key)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Fill "{form.name}" with my details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <FormCard form={form} showInstructions={false} />
                </div>
              ))}
            </div>
          )}

          {forms.length === 0 && !selected.externalUrl && (
            <p className="text-sm text-muted-foreground">
              Follow the steps above using the contact details on your letter.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Options chooser view -------------------------------------------------
  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">{result.question}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick what fits your situation — we'll show you exactly what to do and pre-fill the right form.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {result.paths.map((path) => (
            <button
              key={path.key}
              type="button"
              onClick={() => setSelectedKey(path.key)}
              className={`group flex flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left transition-colors ${toneRing(
                path.tone,
              )}`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-semibold">{path.label}</span>
                {path.recommended && (
                  <Badge className="gap-1 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    Recommended
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{path.description}</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Choose this
                <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
