import { PageSEO } from "@/components/PageSEO";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSiteOrigin } from "@/lib/site";

const NOTICES = [
  {
    code: "CP14",
    title: "Balance Due — First Notice",
    urgency: "action" as const,
    summary: "The IRS believes you owe unpaid taxes. Payment requested within 21 days.",
    deadline: "21 days",
    slug: "irs-cp14-notice-explained",
  },
  {
    code: "CP2000",
    title: "Proposed Income Adjustment",
    urgency: "action" as const,
    summary: "Income mismatch between your return and third-party records. Not a bill yet — you have 30 days to agree or dispute.",
    deadline: "30 days",
    slug: "irs-cp2000-notice-explained",
  },
  {
    code: "CP501",
    title: "Balance Due — First Reminder",
    urgency: "action" as const,
    summary: "A follow-up to CP14. Balance remains unpaid. Penalties and interest are growing.",
    deadline: "21 days",
    slug: null,
  },
  {
    code: "CP503",
    title: "Balance Due — Second Reminder",
    urgency: "warning" as const,
    summary: "Second escalation notice. Collection is approaching. Respond before the next notice arrives.",
    deadline: "10 days",
    slug: null,
  },
  {
    code: "CP504",
    title: "Intent to Levy State Refund",
    urgency: "urgent" as const,
    summary: "The IRS is about to seize your state tax refund. Last notice before enforcement begins.",
    deadline: "30 days",
    slug: "irs-cp504-notice-explained",
  },
  {
    code: "LT11",
    title: "Final Notice of Intent to Levy",
    urgency: "urgent" as const,
    summary: "The IRS will levy wages and bank accounts. Request a CDP hearing within 30 days to stop collection.",
    deadline: "30 days — CDP hearing",
    slug: "irs-lt11-notice-final-levy",
  },
  {
    code: "CP3219A",
    title: "Statutory Notice of Deficiency",
    urgency: "urgent" as const,
    summary: "The IRS plans to formally assess additional tax. You have 90 days to petition Tax Court.",
    deadline: "90 days",
    slug: null,
  },
];

const urgencyConfig = {
  action: { label: "Action needed", className: "bg-amber-100 text-amber-800" },
  warning: { label: "Warning", className: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-800" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are the most common IRS notices?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The most common IRS notices are CP14 (balance due), CP2000 (proposed income adjustment), CP501/CP503/CP504 (escalating balance reminders), and LT11 (final notice of intent to levy).",
      },
    },
    {
      "@type": "Question",
      name: "What should I do when I receive an IRS notice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Find the notice number in the top right corner, identify the deadline, and determine the specific action requested. Compare the IRS figures to your records before responding. Never ignore an IRS notice — each missed deadline makes resolution harder and more expensive.",
      },
    },
    {
      "@type": "Question",
      name: "How long do I have to respond to an IRS notice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Deadlines vary by notice type: CP14 and CP501 request payment within 21 days; CP2000 gives 30 days; CP504 and LT11 give 30 days before levy action. The 30-day CDP hearing right in LT11 is the most important deadline — missing it eliminates your ability to stop a levy.",
      },
    },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "IRS Notice Explained — CP14, CP2000, LT11 and more | GovLetter",
  description: "Find out what your IRS notice means, how urgent it is, and what to do next.",
  url: `${getSiteOrigin()}/irs-notices`,
};

export default function IRSNoticesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO
        pageKey="irsNotices"
        path="/irs-notices"
        structuredData={[faqSchema, websiteSchema]}
      />

      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-bold">IRS Notice Explained</h1>
          <p className="text-xl text-muted-foreground">
            Find your notice code in the top-right corner of the letter. Each notice has a specific meaning, a deadline, and a defined set of options.
          </p>
        </div>

        <div className="grid gap-4">
          {NOTICES.map((notice) => {
            const urg = urgencyConfig[notice.urgency];
            return (
              <Card key={notice.code} className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg text-primary">{notice.code}</span>
                      <CardTitle className="text-base">{notice.title}</CardTitle>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${urg.className}`}>{urg.label}</span>
                      <Badge variant="outline" className="text-xs font-mono">Deadline: {notice.deadline}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-muted-foreground flex-1">{notice.summary}</p>
                  {notice.slug && (
                    <Link
                      to={`/blog/${notice.slug}`}
                      className="text-sm text-primary hover:underline shrink-0"
                    >
                      Full guide →
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="p-6 rounded-xl border bg-muted/40 space-y-3">
          <h2 className="text-lg font-semibold">Have the letter in front of you?</h2>
          <p className="text-sm text-muted-foreground">
            Upload a photo or PDF. GovLetter identifies the exact notice, extracts your deadline, and gives you plain-English next steps in under 60 seconds.
          </p>
          <Button onClick={() => navigate("/upload")}>Upload your IRS notice — first one free →</Button>
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
          GovLetter is a document-explanation tool, not a tax advisor or law firm. Always verify deadlines and amounts against your original notice. For personalized guidance, consult a qualified tax professional, enrolled agent, or CPA.
        </p>
      </div>
    </div>
  );
}
