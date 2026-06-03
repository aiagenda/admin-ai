import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

type DisclaimerVariant = "analysis" | "forms" | "accounting" | "general";

const TEXT: Record<DisclaimerVariant, string> = {
  analysis:
    "This is an automated, AI-generated interpretation to help you understand your letter — it is not legal, tax, or financial advice. It may contain errors. Always read the original notice carefully, confirm any deadlines and amounts on the document itself, and consult a licensed attorney, CPA, or the issuing agency before acting.",
  forms:
    "We pre-fill forms from your letter to save time, but you are responsible for the final document. Review every field against the official form, complete anything missing, and verify accuracy before signing or submitting. This is not legal or tax advice.",
  accounting:
    "Bookkeeping figures and category suggestions are automated estimates to assist you, not tax advice or an official filing. Review all entries and consult a CPA or tax professional before filing.",
  general:
    "GovLetter is a self-help tool and does not provide legal, tax, or financial advice, and is not a law firm or a substitute for a licensed professional.",
};

interface LegalDisclaimerProps {
  variant?: DisclaimerVariant;
  className?: string;
  /** Compact one-line style for tight spaces. */
  compact?: boolean;
}

/**
 * Standardized legal disclaimer shown at high-risk touchpoints (AI analysis,
 * form filling, bookkeeping). Keeps the "not legal/tax advice" notice
 * consistent and links to the full Terms of Service.
 */
export function LegalDisclaimer({ variant = "general", className = "", compact = false }: LegalDisclaimerProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/20 px-3 ${
        compact ? "py-2" : "py-3"
      } text-amber-900 dark:text-amber-200 ${className}`}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <p className={`${compact ? "text-xs" : "text-xs sm:text-sm"} leading-relaxed`}>
        {TEXT[variant]}{" "}
        <Link to="/legal/terms" className="underline underline-offset-2 hover:opacity-80">
          See full Terms &amp; disclaimer
        </Link>
        .
      </p>
    </div>
  );
}
