import { PageSEO } from "@/components/PageSEO";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const SSA_LETTERS = [
  {
    type: "Overpayment Notice",
    agency: "SSA",
    urgency: "urgent" as const,
    summary: "The SSA believes it overpaid your benefits and is demanding repayment — sometimes thousands of dollars. You have 60 days to appeal (reconsideration) and the right to request a waiver.",
    deadline: "10 days for withholding protection · 60 days to appeal",
    slug: "social-security-overpayment-letter",
    badge: "🔥 Surging in 2026",
  },
  {
    type: "Benefit Change Notice",
    agency: "SSA",
    urgency: "action" as const,
    summary: "Your Social Security or SSI benefit amount is changing. The notice explains the reason and the new amount. Review for errors — benefit calculations contain mistakes more often than most people realize.",
    deadline: "60 days to appeal",
    slug: null,
  },
  {
    type: "USCIS Request for Evidence (RFE)",
    agency: "USCIS",
    urgency: "urgent" as const,
    summary: "USCIS needs additional documentation before processing your immigration application. Missing the RFE deadline typically results in denial.",
    deadline: "Stated on notice (usually 87 days)",
    slug: null,
  },
  {
    type: "Medicare Premium Notice",
    agency: "CMS",
    urgency: "action" as const,
    summary: "Your Medicare premium amount has changed, typically due to an IRMAA income-related adjustment based on your prior-year tax return. You can appeal if your income has decreased.",
    deadline: "60 days to appeal IRMAA",
    slug: null,
  },
  {
    type: "VA Debt Collection Notice",
    agency: "VA",
    urgency: "urgent" as const,
    summary: "The Department of Veterans Affairs believes you owe money for overpaid benefits, education benefits, or healthcare copays. You have rights to waiver and repayment plans.",
    deadline: "30–60 days depending on notice type",
    slug: null,
  },
];

const urgencyConfig = {
  action: { label: "Action needed", className: "bg-amber-100 text-amber-800" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-800" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a Social Security overpayment letter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An overpayment letter from the SSA means they believe they paid you more in benefits than you were entitled to receive, and they are requesting repayment. You have the right to appeal within 60 days and to request a waiver if you cannot afford to repay.",
      },
    },
    {
      "@type": "Question",
      name: "Can Social Security take my entire monthly check?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "As of 2025, the default withholding rate for Title II (retirement/disability) overpayments is 50% of your monthly benefit. For SSI, it is 10%. You can request a lower rate by demonstrating financial hardship.",
      },
    },
    {
      "@type": "Question",
      name: "How do I appeal a Social Security overpayment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "File Form SSA-561 (Request for Reconsideration) within 60 days of the notice date. If you file within 10 days, withholding cannot begin while your appeal is pending. You can also request a waiver on Form SSA-632 if you cannot afford repayment and were not at fault.",
      },
    },
  ],
};

export default function SSALettersPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO
        pageKey="ssaLetters"
        path="/ssa-letters"
        structuredData={faqSchema}
      />

      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-bold">Social Security & Federal Agency Letters</h1>
          <p className="text-xl text-muted-foreground">
            Got a letter from Social Security, USCIS, Medicare, or the VA? These notices have strict deadlines and appeal rights that many people miss.
          </p>
        </div>

        <div className="grid gap-4">
          {SSA_LETTERS.map((letter) => {
            const urg = urgencyConfig[letter.urgency];
            return (
              <Card key={letter.type} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{letter.agency}</Badge>
                      <CardTitle className="text-base">{letter.type}</CardTitle>
                      {"badge" in letter && letter.badge && (
                        <span className="text-xs font-medium">{letter.badge}</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${urg.className}`}>
                      {urg.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">{letter.summary}</p>
                    <p className="text-xs text-muted-foreground/70">⏱ {letter.deadline}</p>
                  </div>
                  {letter.slug && (
                    <Link to={`/blog/${letter.slug}`} className="text-sm text-primary hover:underline shrink-0">
                      Full guide →
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="p-6 rounded-xl border bg-muted/40 space-y-3">
          <h2 className="text-lg font-semibold">Upload your letter for instant analysis</h2>
          <p className="text-sm text-muted-foreground">
            GovLetter identifies the letter type, extracts deadlines, and tells you exactly what to do — in plain English, in under 60 seconds.
          </p>
          <Button onClick={() => navigate("/upload")}>Upload your letter — first one free →</Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          {faqSchema.mainEntity.map((item, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-4">
          GovLetter is a document-explanation tool, not a legal or benefits advisor. For personalized guidance on SSA appeals or USCIS matters, consult a qualified attorney or accredited representative.
        </p>
      </div>
    </div>
  );
}
