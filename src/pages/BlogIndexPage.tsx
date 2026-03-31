import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { Link } from "react-router-dom";

const posts = [
  {
    title: "Mit jelent a NAV felszólítás és mit kell tenni?",
    slug: "mit-jelent-a-nav-felszolitas",
    excerpt: "Lépésről lépésre útmutató, ha NAV felszólító levelet kaptál.",
  },
  {
    title: "Hogyan kell számlát könyvelőnek küldeni?",
    slug: "hogyan-kell-szamlat-konyvelonek-kuldeni",
    excerpt: "Gyakorlati workflow KKV-knak a számla OCR és export használatához.",
  },
  {
    title: "Legjobb iratkezelő szoftver KKV-knak 2026-ban",
    slug: "legjobb-iratkezelo-szoftver-kkv-2026",
    excerpt: "Milyen szempontok alapján válassz dokumentumkezelő rendszert vállalkozásodnak.",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <SEOHead
        title="AdminAI Blog - NAV, számla OCR, iratkezelés"
        description="AdminAI blog: NAV felszólítás értelmezés, számla OCR workflow-k és iratkezelő tippek magyar vállalkozásoknak."
        path="/blog"
        keywords="NAV felszólítás, számla OCR, iratkezelő szoftver KKV, dokumentumfeldolgozás"
      />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">AdminAI Blog</h1>
        <p className="text-muted-foreground">Gyakorlati útmutatók hivatalos dokumentumok és számlák kezeléséhez.</p>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.slug}>
              <CardHeader>
                <CardTitle className="text-xl">
                  <Link className="hover:text-primary" to={`/blog/${post.slug}`}>{post.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{post.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
