import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSEO } from "@/components/PageSEO";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { isUsMarket } from "@/lib/market";

const US_POSTS = [
  {
    title: "Social Security Overpayment Letter: What It Means and How to Fight It",
    slug: "social-security-overpayment-letter",
    excerpt: "The SSA is demanding money back — sometimes thousands of dollars. Here's what the letter means, your appeal rights, and how to request a waiver before the deadline.",
    badge: "🔥 Trending 2026",
    badgeVariant: "destructive" as const,
    date: "May 28, 2026",
  },
  {
    title: "IRS CP14 Notice: What It Means and What to Do",
    slug: "irs-cp14-notice-explained",
    excerpt: "A CP14 is the IRS's first balance-due notice. It's fixable — but ignoring it leads to CP501, CP504, and eventually a levy. Here's exactly what to do.",
    badge: "Most common",
    badgeVariant: "secondary" as const,
    date: "May 20, 2026",
  },
  {
    title: "IRS CP2000 Notice: It's Not a Bill — Here's What to Do",
    slug: "irs-cp2000-notice-explained",
    excerpt: "Three million CP2000s are sent every year. Most people panic — but it's a proposed adjustment, not a final bill. You have 30 days to agree or dispute.",
    badge: "3M sent/year",
    badgeVariant: "secondary" as const,
    date: "May 14, 2026",
  },
  {
    title: "IRS LT11 Notice: Final Notice Before Levy — Act Within 30 Days",
    slug: "irs-lt11-notice-final-levy",
    excerpt: "LT11 is the last stop before the IRS seizes wages and bank accounts. The 30-day CDP hearing window is your most powerful right — don't miss it.",
    badge: "Urgent",
    badgeVariant: "destructive" as const,
    date: "May 7, 2026",
  },
  {
    title: "IRS CP504 Notice: Last Warning Before State Refund Levy",
    slug: "irs-cp504-notice-explained",
    excerpt: "CP504 is the IRS's final notice before seizing your state tax refund. Act now — a payment plan or CDP hearing can stop the collection clock.",
    badge: "Pre-levy",
    badgeVariant: "destructive" as const,
    date: "April 30, 2026",
  },
  {
    title: "Got an IRS Letter? How to Read It in 5 Minutes",
    slug: "how-to-read-irs-letter",
    excerpt: "Every IRS letter has three things you need to find: the notice number, the deadline, and the specific action required. Here's the exact method.",
    date: "April 22, 2026",
  },
  {
    title: "State Tax Notice Explained: What to Do in Any State",
    slug: "state-tax-notice-explained",
    excerpt: "Got a balance-due or audit notice from your state? Each state has different rules, portals, and appeal windows. Here's what to do wherever you are.",
    date: "April 15, 2026",
  },
];

const HU_POSTS = [
  {
    title: "Mit jelent a NAV felszólítás és mit kell tenni?",
    slug: "mit-jelent-a-nav-felszolitas",
    excerpt: "Lépésről lépésre útmutató, ha NAV felszólító levelet kaptál.",
    date: "2026. január 20.",
  },
  {
    title: "Hogyan kell számlát könyvelőnek küldeni?",
    slug: "hogyan-kell-szamlat-konyvelonek-kuldeni",
    excerpt: "Gyakorlati workflow KKV-knak a számla OCR és export használatához.",
    date: "2026. február 10.",
  },
  {
    title: "Legjobb iratkezelő szoftver KKV-knak 2026-ban",
    slug: "legjobb-iratkezelo-szoftver-kkv-2026",
    excerpt: "Milyen szempontok alapján válassz dokumentumkezelő rendszert vállalkozásodnak.",
    date: "2026. március 1.",
  },
];

export default function BlogIndexPage() {
  const us = isUsMarket();
  const posts = us ? US_POSTS : HU_POSTS;

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="blog" path="/blog" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">
          {us ? "GovLetter Blog" : "AdminAI Blog"}
        </h1>
        <p className="text-muted-foreground">
          {us
            ? "Plain-English guides to IRS notices, state tax letters, Social Security mail, and official government correspondence."
            : "Gyakorlati útmutatók hivatalos dokumentumok és számlák kezeléséhez."}
        </p>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.slug} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-xl">
                    <Link className="hover:text-primary" to={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </CardTitle>
                  {"badge" in post && post.badge && (
                    <Badge variant={post.badgeVariant ?? "secondary"} className="shrink-0 text-xs">
                      {post.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{post.date}</p>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{post.excerpt}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-block mt-3 text-sm text-primary hover:underline"
                >
                  {us ? "Read article →" : "Cikk olvasása →"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
