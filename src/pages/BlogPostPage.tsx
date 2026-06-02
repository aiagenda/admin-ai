import { SEOHead } from "@/components/SEOHead";
import { PageSEO } from "@/components/PageSEO";
import { useParams, Link } from "react-router-dom";
import { getSiteOrigin } from "@/lib/site";
import { useTranslation } from "react-i18next";

type PostEntry = {
  title: string;
  description: string;
  content: string[];
  keywords: string;
  datePublished: string;
  dateModified: string;
};

const POSTS: Record<string, PostEntry> = {
  "mit-jelent-a-nav-felszolitas": {
    title: "Mit jelent a NAV felszólítás és mit kell tenni?",
    description:
      "Gyakorlati útmutató NAV felszólítás esetére: határidők, teendők, hogyan értelmezd gyorsan a hivatalos levelet.",
    content: [
      "Ha NAV felszólítást kapsz, a legfontosabb a határidő és a pontos kötelezettség azonosítása. A dokumentumok gyakran rövid, jogi nyelvű mondatokban írják le, mit kell tenni, emiatt könnyű félreérteni a lényeget.",
      "Első lépésként ellenőrizd, milyen ügyre vonatkozik a levél: hiánypótlás, fizetési felszólítás vagy adategyeztetés. Ez meghatározza, hogy azonnali fizetési kötelezettséged van-e, vagy dokumentumot kell benyújtanod.",
      "Második lépésként jegyezd fel a határidőt és a szükséges mellékleteket. Ha több dokumentumra hivatkozik a levél, érdemes egy listát készíteni arról, mi áll rendelkezésre és mi hiányzik.",
      "Harmadik lépésként döntsd el, hogy önállóan intézed, vagy könyvelővel egyeztetsz. Az AdminAI ebben segít: közérthető összefoglalót ad, kiemeli a teendőket és a kritikus dátumokat.",
      "A cél nem csak az, hogy megértsd a levelet, hanem az is, hogy időben és pontosan reagálj. Ezzel csökkenthető a bírság vagy további eljárás kockázata.",
    ],
    keywords: "NAV felszólítás, NAV levél, adóhatósági felszólítás, határidő, teendők, hivatalos levél, AdminAI",
    datePublished: "2026-01-20T08:00:00+01:00",
    dateModified: "2026-04-15T10:00:00+01:00",
  },
  "hogyan-kell-szamlat-konyvelonek-kuldeni": {
    title: "Hogyan kell számlát könyvelőnek küldeni? Lépésről lépésre",
    description:
      "Számla OCR és export workflow KKV-knak: így készítsd elő a számlákat könyvelésre gyorsan és átláthatóan.",
    content: [
      "A könyvelőnek küldött számlák akkor hasznosak, ha egységes formátumban, hiánytalan adatokkal érkeznek. A szétszórt PDF-ek és fotók plusz adminisztrációt okoznak mindkét oldalon.",
      "Jó workflow: gyűjtsd egy helyre a számlákat, futtasd OCR-rel, ellenőrizd a kulcsmezőket (dátum, összeg, partner), majd exportáld táblázatba. Így a könyvelő gyorsabban tud dolgozni.",
      "Érdemes havi rutinban gondolkodni: heti gyűjtés, havi zárás előtti export, és egy rövid ellenőrzőlista. Ezzel elkerülhető, hogy a hónap végén egyszerre torlódjon fel minden.",
      "Az AdminAI könyvelés modulja ezt a folyamatot támogatja: számla OCR, kategorizálás, export és visszakereshető archívum egy felületen.",
      "A cél a kevesebb kézi adatbevitel és a jobb pontosság. Ez különösen fontos, ha több projekt vagy több ügyfél számláit kezeled párhuzamosan.",
    ],
    keywords: "számla könyvelőnek, számla OCR, könyvelés KKV, számlák export, könyvelői workflow, AdminAI",
    datePublished: "2026-02-10T08:00:00+01:00",
    dateModified: "2026-04-15T10:00:00+01:00",
  },
  "legjobb-iratkezelo-szoftver-kkv-2026": {
    title: "Legjobb iratkezelő szoftver KKV-knak 2026-ban",
    description:
      "Milyen iratkezelő szoftvert válasszon egy KKV? Fő szempontok, összehasonlítási keretrendszer és gyakorlati checklist.",
    content: [
      "Az iratkezelő szoftver kiválasztásánál a KKV-k gyakran csak az árat nézik, pedig a valódi megtakarítást a workflow adja: milyen gyorsan találod meg a dokumentumot, hogyan kezeled a határidőket, és mennyire egyszerű az átadás a könyvelőnek.",
      "Fontos szempont a kereshetőség, verziókezelés, jogosultságok, export lehetőségek, és hogy van-e AI támogatás a dokumentum értelmezéséhez. Egy modern rendszer nem csak tárol, hanem döntést is támogat.",
      "Ha hivatalos leveleket is kezelsz, akkor külön előny, ha a rendszer teendőlistát és határidő-fókuszt ad. Így nem maradnak el kritikus lépések.",
      "Az AdminAI ebben a kategóriában azoknak jó választás, akik a dokumentum értelmezést és a számla OCR-t egy rendszerben szeretnék kezelni.",
      "Javaslat: vezess be egy 30 napos pilotot, mérd a feldolgozási időt és a hibaarányt, és ez alapján dönts véglegesen.",
    ],
    keywords: "iratkezelő szoftver KKV, digitális iratkezelés, dokumentum archívum, vállalati dokumentum 2026, AdminAI",
    datePublished: "2026-03-01T08:00:00+01:00",
    dateModified: "2026-04-15T10:00:00+01:00",
  },
};

function articleJsonLd(post: PostEntry, slug: string, brandName: string, inLanguage: string) {
  const base = getSiteOrigin();
  const pageUrl = `${base}/blog/${slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    author: { "@type": "Organization", name: brandName, url: base },
    publisher: {
      "@type": "Organization",
      name: brandName,
      logo: { "@type": "ImageObject", url: `${base}/icon-512.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    inLanguage: inLanguage,
  };
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = (slug && POSTS[slug]) || null;
  const { t: navT } = useTranslation("nav");
  const { i18n } = useTranslation();

  const brand = navT("brand");
  const ogLocale = i18n.language?.startsWith("en") ? "en_US" : "hu_HU";
  const schemaArticleLang = i18n.language?.startsWith("en") ? "en" : "hu";

  if (!post || !slug) {
    return (
      <div className="min-h-screen py-12 px-4">
        <PageSEO pageKey="notFound" path={slug ? `/blog/${slug}` : "/blog"} noindex />
        <div className="container mx-auto max-w-3xl space-y-4">
          <h1 className="text-3xl font-bold">A cikk nem található</h1>
          <Link to="/blog" className="text-primary underline">Vissza a bloghoz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <SEOHead
        title={`${post.title} | ${brand} Blog`}
        description={post.description}
        path={`/blog/${slug}`}
        keywords={post.keywords}
        ogType="article"
        ogSiteName={brand}
        ogLocale={ogLocale}
        articlePublishedTime={post.datePublished}
        articleModifiedTime={post.dateModified}
        structuredData={articleJsonLd(post, slug, brand, schemaArticleLang)}
      />
      <article className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <p className="text-muted-foreground">{post.description}</p>

        {post.content.map((p, i) => (
          <p key={i} className="leading-7">{p}</p>
        ))}

        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-2">Kapcsolódó oldalak:</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/nav-hatarozat-ertelmezes" className="text-primary underline">NAV határozat értelmezés</Link>
            <Link to="/szamla-ocr" className="text-primary underline">Számla OCR</Link>
            <Link to="/dokumentum-archivum" className="text-primary underline">Dokumentum archívum</Link>
          </div>
        </div>
      </article>
    </div>
  );
}
