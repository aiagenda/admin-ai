import { useEffect, useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useParams, Link } from "react-router-dom";
import { getSiteOrigin } from "@/lib/site";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { staticPost, type BlogPostEntry } from "@/data/blog-static";
import { fetchPublishedBlogPost } from "@/lib/blog-api";

function articleJsonLd(post: BlogPostEntry, slug: string, brandName: string) {
  const base = getSiteOrigin();
  const pageUrl = `${base}/blog/${slug}`;
  const data: Record<string, unknown>[] = [
    {
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
    },
  ];
  if (post.faqSchema && post.faqSchema.length > 0) {
    data.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqSchema.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return data;
}

function renderContent(text: string) {
  if (text.startsWith("**") && text.includes(".** ")) {
    const end = text.indexOf(".** ");
    const heading = text.slice(2, end + 1);
    const body = text.slice(end + 4);
    return (
      <p key={text}>
        <strong>{heading}.</strong> {body}
      </p>
    );
  }
  return <p key={text}>{text}</p>;
}

export default function BlogPostPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t } = useTranslation("nav");
  const navigate = useNavigate();
  const brandName = t("brand");

  const [post, setPost] = useState<BlogPostEntry | null>(() => staticPost(slug) ?? null);
  const [loading, setLoading] = useState(!post);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      const cms = await fetchPublishedBlogPost(slug);
      if (cancelled) return;
      if (cms) {
        setPost(cms);
        setLoading(false);
        return;
      }
      const fallback = staticPost(slug);
      if (fallback) {
        setPost(fallback);
        setLoading(false);
        return;
      }
      setPost(null);
      setNotFound(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <h1 className="text-3xl font-bold">Article not found</h1>
          <Button onClick={() => navigate("/blog")}>← Back to blog</Button>
        </div>
      </div>
    );
  }

  const structuredData = articleJsonLd(post, slug, brandName);

  return (
    <div className="min-h-screen py-12 px-4">
      <SEOHead
        title={`${post.title} | ${brandName}`}
        description={post.description}
        path={`/blog/${slug}`}
        keywords={post.keywords}
        ogType="article"
        articlePublishedTime={post.datePublished}
        articleModifiedTime={post.dateModified}
        structuredData={structuredData}
      />

      <article className="container mx-auto max-w-3xl space-y-6">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to blog
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{post.title}</h1>

        <p className="text-muted-foreground text-sm">
          {`Published ${new Date(post.datePublished).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-[15px] leading-relaxed">
          {post.content.map((para, i) => (
            <div key={i}>{renderContent(para)}</div>
          ))}
        </div>

        <div className="mt-8 p-5 rounded-xl border bg-muted/40 space-y-3">
          <p className="font-medium text-base">Understand your specific notice instantly</p>
          <p className="text-sm text-muted-foreground">
            Upload a photo or PDF of your letter. GovLetter identifies the notice type, extracts your deadlines, and gives you plain-English next steps in under 60 seconds.
          </p>
          <Button onClick={() => navigate("/upload")}>Upload your letter — first one free →</Button>
        </div>

        {post.faqSchema && post.faqSchema.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">
              Frequently asked questions
            </h2>
            {post.faqSchema.map((item, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-1">
                <p className="font-medium text-sm">{item.question}</p>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
