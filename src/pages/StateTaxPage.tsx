import { PageSEO } from "@/components/PageSEO";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATES = [
  { code: "AL", name: "Alabama", agency: "Alabama Department of Revenue", portal: "https://www.revenue.alabama.gov/" },
  { code: "AK", name: "Alaska", agency: "Alaska Department of Revenue", portal: "https://tax.alaska.gov/" },
  { code: "AZ", name: "Arizona", agency: "Arizona Department of Revenue", portal: "https://azdor.gov/" },
  { code: "AR", name: "Arkansas", agency: "Department of Finance and Administration", portal: "https://www.dfa.arkansas.gov/" },
  { code: "CA", name: "California", agency: "Franchise Tax Board (FTB)", portal: "https://www.ftb.ca.gov/" },
  { code: "CO", name: "Colorado", agency: "Colorado Department of Revenue", portal: "https://tax.colorado.gov/" },
  { code: "CT", name: "Connecticut", agency: "Department of Revenue Services", portal: "https://portal.ct.gov/drs" },
  { code: "DE", name: "Delaware", agency: "Division of Revenue", portal: "https://revenue.delaware.gov/" },
  { code: "FL", name: "Florida", agency: "Department of Revenue", portal: "https://floridarevenue.com/" },
  { code: "GA", name: "Georgia", agency: "Department of Revenue", portal: "https://dor.georgia.gov/" },
  { code: "HI", name: "Hawaii", agency: "Department of Taxation", portal: "https://tax.hawaii.gov/" },
  { code: "ID", name: "Idaho", agency: "State Tax Commission", portal: "https://tax.idaho.gov/" },
  { code: "IL", name: "Illinois", agency: "Department of Revenue", portal: "https://tax.illinois.gov/" },
  { code: "IN", name: "Indiana", agency: "Department of Revenue", portal: "https://www.in.gov/dor/" },
  { code: "IA", name: "Iowa", agency: "Department of Revenue", portal: "https://tax.iowa.gov/" },
  { code: "KS", name: "Kansas", agency: "Department of Revenue", portal: "https://www.ksrevenue.gov/" },
  { code: "KY", name: "Kentucky", agency: "Department of Revenue", portal: "https://revenue.ky.gov/" },
  { code: "LA", name: "Louisiana", agency: "Department of Revenue", portal: "https://revenue.louisiana.gov/" },
  { code: "ME", name: "Maine", agency: "Maine Revenue Services", portal: "https://www.maine.gov/revenue/" },
  { code: "MD", name: "Maryland", agency: "Comptroller of Maryland", portal: "https://www.marylandtaxes.gov/" },
  { code: "MA", name: "Massachusetts", agency: "Department of Revenue", portal: "https://www.mass.gov/dor" },
  { code: "MI", name: "Michigan", agency: "Department of Treasury", portal: "https://www.michigan.gov/taxes" },
  { code: "MN", name: "Minnesota", agency: "Department of Revenue", portal: "https://www.revenue.state.mn.us/" },
  { code: "MS", name: "Mississippi", agency: "Department of Revenue", portal: "https://www.dor.ms.gov/" },
  { code: "MO", name: "Missouri", agency: "Department of Revenue", portal: "https://dor.mo.gov/" },
  { code: "MT", name: "Montana", agency: "Department of Revenue", portal: "https://mtrevenue.gov/" },
  { code: "NE", name: "Nebraska", agency: "Department of Revenue", portal: "https://revenue.nebraska.gov/" },
  { code: "NV", name: "Nevada", agency: "Department of Taxation", portal: "https://tax.nv.gov/" },
  { code: "NH", name: "New Hampshire", agency: "Department of Revenue Administration", portal: "https://www.revenue.nh.gov/" },
  { code: "NJ", name: "New Jersey", agency: "Division of Taxation", portal: "https://www.njtaxation.org/" },
  { code: "NM", name: "New Mexico", agency: "Taxation and Revenue Department", portal: "https://www.tax.newmexico.gov/" },
  { code: "NY", name: "New York", agency: "Department of Taxation and Finance", portal: "https://www.tax.ny.gov/" },
  { code: "NC", name: "North Carolina", agency: "Department of Revenue", portal: "https://www.ncdor.gov/" },
  { code: "ND", name: "North Dakota", agency: "Office of State Tax Commissioner", portal: "https://www.nd.gov/tax/" },
  { code: "OH", name: "Ohio", agency: "Department of Taxation", portal: "https://tax.ohio.gov/" },
  { code: "OK", name: "Oklahoma", agency: "Tax Commission", portal: "https://www.oktax.state.ok.us/" },
  { code: "OR", name: "Oregon", agency: "Department of Revenue", portal: "https://www.oregon.gov/dor/" },
  { code: "PA", name: "Pennsylvania", agency: "Department of Revenue", portal: "https://www.revenue.pa.gov/" },
  { code: "RI", name: "Rhode Island", agency: "Division of Taxation", portal: "https://tax.ri.gov/" },
  { code: "SC", name: "South Carolina", agency: "Department of Revenue", portal: "https://dor.sc.gov/" },
  { code: "SD", name: "South Dakota", agency: "Department of Revenue", portal: "https://dor.sd.gov/" },
  { code: "TN", name: "Tennessee", agency: "Department of Revenue", portal: "https://www.tn.gov/revenue/" },
  { code: "TX", name: "Texas", agency: "Comptroller of Public Accounts", portal: "https://comptroller.texas.gov/" },
  { code: "UT", name: "Utah", agency: "State Tax Commission", portal: "https://tax.utah.gov/" },
  { code: "VT", name: "Vermont", agency: "Department of Taxes", portal: "https://tax.vermont.gov/" },
  { code: "VA", name: "Virginia", agency: "Department of Taxation", portal: "https://www.tax.virginia.gov/" },
  { code: "WA", name: "Washington", agency: "Department of Revenue", portal: "https://dor.wa.gov/" },
  { code: "WV", name: "West Virginia", agency: "State Tax Department", portal: "https://tax.wv.gov/" },
  { code: "WI", name: "Wisconsin", agency: "Department of Revenue", portal: "https://www.revenue.wi.gov/" },
  { code: "WY", name: "Wyoming", agency: "Department of Revenue", portal: "https://revenue.wyo.gov/" },
  { code: "DC", name: "Washington D.C.", agency: "Office of Tax and Revenue", portal: "https://otr.cfo.dc.gov/" },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What should I do when I get a state tax notice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Find the notice type, identify the deadline, and verify the figures against your state return. Use your state's online portal to view your account and respond. Many states allow payment plans online.",
      },
    },
    {
      "@type": "Question",
      name: "Is a state tax notice related to an IRS notice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not directly, but the IRS shares federal return adjustments with states. An IRS audit or CP2000 adjustment often triggers a corresponding state notice weeks or months later.",
      },
    },
    {
      "@type": "Question",
      name: "How long do I have to respond to a state tax notice?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Deadlines vary by state, but common windows are 30, 60, or 90 days. Some states require payment before allowing an appeal. Always check the specific date on your notice.",
      },
    },
  ],
};

export default function StateTaxPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO
        pageKey="stateTaxLetters"
        path="/state-tax-letters"
        structuredData={faqSchema}
      />

      <div className="container mx-auto max-w-5xl space-y-8">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl font-bold">State Tax Notice Explained</h1>
          <p className="text-xl text-muted-foreground">
            Every state has its own tax authority, notice codes, and appeal rules. Find your state below for the direct portal — or upload your notice for an instant plain-English explanation.
          </p>
        </div>

        <div className="p-5 rounded-xl border bg-muted/40 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <p className="font-medium text-sm">Don't know what your notice means?</p>
            <p className="text-sm text-muted-foreground mt-1">Upload it. GovLetter identifies the notice type, finds your deadline, and explains your options — for any state, in plain English.</p>
          </div>
          <Button onClick={() => navigate("/upload")} className="shrink-0">Upload notice — free →</Button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">State tax authorities — all 50 states</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STATES.map((state) => (
              <Card key={state.code} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{state.name}</p>
                    <p className="text-xs text-muted-foreground">{state.agency}</p>
                  </div>
                  <a
                    href={state.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Portal →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
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
          GovLetter is a document-explanation tool, not a tax advisor. For personalized guidance, consult a CPA or tax attorney licensed in your state.
        </p>
      </div>
    </div>
  );
}
