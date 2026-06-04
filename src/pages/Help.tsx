import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronUp, FileText, Upload, Archive, Tag, Calendar, CheckSquare, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { PageSEO } from "@/components/PageSEO";
import { getSiteOrigin } from "@/lib/site";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const US_FAQ: FAQItem[] = [
  {
    category: "General",
    question: "What is GovLetter?",
    answer: "GovLetter is an AI-powered tool that reads IRS notices, state tax letters, Social Security mail, and other official government correspondence — and explains what they mean in plain English. Upload a PDF or photo; get a summary, your deadline, and your next steps in under 60 seconds.",
  },
  {
    category: "General",
    question: "What types of letters does GovLetter support?",
    answer: "GovLetter supports IRS notices (CP14, CP2000, CP504, LT11, and more), state tax notices from all 50 states, Social Security Administration letters (overpayment, benefit changes), USCIS correspondence, Medicare notices, VA debt notices, court summons, utility disconnect notices, eviction notices, medical bills, and general official correspondence.",
  },
  {
    category: "General",
    question: "Is GovLetter tax or legal advice?",
    answer: "No. GovLetter explains what your letter says and what options are generally available — it is not a substitute for advice from a licensed tax professional, enrolled agent, CPA, or attorney. For serious matters (levies, audits, large balances), always consult a qualified professional.",
  },
  {
    category: "Upload",
    question: "What file formats are supported?",
    answer: "GovLetter accepts PDF, JPG, PNG, and HEIC files up to 20 MB. Both text-based PDFs and scanned images (including phone photos) are supported.",
  },
  {
    category: "Upload",
    question: "How long does analysis take?",
    answer: "Most analyses complete in 30–60 seconds. Complex multi-page documents or scanned images may take slightly longer due to OCR processing.",
  },
  {
    category: "Upload",
    question: "Do I need to redact my SSN or personal information before uploading?",
    answer: "You don't have to, but you can. GovLetter uses your document data only to perform the analysis — we do not sell or share your documents. See our Privacy Policy for full details on retention and deletion.",
  },
  {
    category: "Results",
    question: "What does GovLetter show after analysis?",
    answer: "After analysis you will see: a plain-English explanation of what the letter means, the specific deadline (if any), a step-by-step list of actions to take, the urgency level (info / action needed / urgent), recommended IRS forms (if applicable), and links to official government resources.",
  },
  {
    category: "Results",
    question: "What do the urgency levels mean?",
    answer: "Info (blue): no immediate action required, informational only. Action needed (amber): you need to respond or take steps, but it is not yet a crisis. Urgent (red): a levy, seizure, or critical deadline is imminent — act now.",
  },
  {
    category: "Deadlines",
    question: "Are the deadlines accurate?",
    answer: "GovLetter extracts deadlines from the text of your notice. Always verify against the actual notice — the IRS and state agencies print the deadline on the letter itself, and that printed date is the authoritative one. Deadlines run from the notice date, not the date you received it.",
  },
  {
    category: "Pricing",
    question: "How much does GovLetter cost?",
    answer: "Your first document is free. After that, you can pay per document ($3.99 for Basic, $9.99 for Pro with response draft and PDF export) or choose a monthly plan starting at $9.99/month for 10 documents.",
  },
  {
    category: "Privacy & Security",
    question: "How is my document data protected?",
    answer: "Documents are transmitted over HTTPS, stored in an access-controlled database (Supabase/PostgreSQL), and processed by OpenAI GPT-4 via API. We do not train AI models on your data. Documents are deleted when you delete them from your account. See our Security page and Privacy Policy for details.",
  },
  {
    category: "Privacy & Security",
    question: "Does GovLetter contact the IRS or any agency on my behalf?",
    answer: "No. GovLetter is an analysis and explanation tool only. It does not file anything, make calls, or communicate with the IRS, SSA, or any other agency on your behalf.",
  },
];

function FAQSection({ items, title }: { items: FAQItem[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="text-lg font-semibold mb-3">{cat}</h2>
          <div className="space-y-2">
            {items
              .filter((i) => i.category === cat)
              .map((item, idx) => {
                const globalIdx = items.indexOf(item);
                const isOpen = openIndex === globalIdx;
                return (
                  <Card key={idx} className="overflow-hidden">
                    <button
                      className="w-full text-left"
                      onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                    >
                      <CardHeader className="pb-3 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-sm font-medium">{item.question}</CardTitle>
                          {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        </div>
                      </CardHeader>
                    </button>
                    {isOpen && (
                      <CardContent className="pt-0 pb-4">
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

const usFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: US_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export default function Help() {
  const faq = US_FAQ;

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO
        pageKey="help"
        path="/help"
        structuredData={usFaqSchema}
      />
      <div className="container mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              Help & FAQ
            </h1>
          </div>
          <p className="text-muted-foreground">
            Everything you need to know about understanding government letters with GovLetter.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
            <Link to="/irs-notices" className="block">
              <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-3 flex items-start gap-2">
                  <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">IRS notices</p>
                    <p className="text-xs text-muted-foreground">CP14, CP2000, LT11 and more</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/ssa-letters" className="block">
              <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-3 flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Social Security</p>
                    <p className="text-xs text-muted-foreground">Overpayment, benefit changes</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/state-tax-letters" className="block">
              <Card className="h-full hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="pt-4 pb-3 flex items-start gap-2">
                  <Archive className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">State tax notices</p>
                    <p className="text-xs text-muted-foreground">All 50 states covered</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
        </div>

        <FAQSection items={faq} title="FAQ" />

        <p className="text-xs text-muted-foreground border-t pt-4">
          GovLetter is a document-explanation tool, not a tax advisor or law firm. Outputs should be verified against your original notice. For complex tax situations, consult a qualified CPA, enrolled agent, or tax attorney.
        </p>
      </div>
    </div>
  );
}
