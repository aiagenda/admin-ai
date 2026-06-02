import { supabase } from "@/integrations/supabase/client";
import type { BlogListItem, BlogPostEntry } from "@/data/blog-static";

type DbBlogRow = {
  title: string;
  slug: string;
  description: string;
  content: string;
  keywords: string;
  market: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  date_label: string | null;
  badge_text: string | null;
  badge_variant: string | null;
  faq_schema: { question: string; answer: string }[] | null;
};

function marketFilter(us: boolean) {
  const m = us ? "us" : "hu";
  return `market.eq.${m},market.eq.both`;
}

function rowToListItem(row: DbBlogRow, us: boolean): BlogListItem {
  const date =
    row.date_label?.trim() ||
    new Date(row.published_at || row.created_at).toLocaleDateString(
      us ? "en-US" : "hu-HU",
      { year: "numeric", month: "long", day: "numeric" },
    );
  const variant = row.badge_variant;
  const badgeVariant =
    variant === "destructive" || variant === "default" || variant === "outline"
      ? variant
      : "secondary";

  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.description,
    badge: row.badge_text || undefined,
    badgeVariant: row.badge_text ? badgeVariant : undefined,
    date,
  };
}

function rowToPost(row: DbBlogRow): BlogPostEntry {
  const faq = Array.isArray(row.faq_schema) ? row.faq_schema : undefined;
  return {
    title: row.title,
    description: row.description,
    content: row.content.split(/\n{2,}/).filter(Boolean),
    keywords: row.keywords,
    datePublished: row.published_at || row.created_at,
    dateModified: row.updated_at,
    faqSchema: faq?.length ? faq : undefined,
  };
}

export async function fetchPublishedBlogList(us: boolean): Promise<BlogListItem[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "title, slug, description, content, keywords, market, published_at, created_at, updated_at, date_label, badge_text, badge_variant, faq_schema",
    )
    .eq("is_published", true)
    .or(marketFilter(us))
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return (data as DbBlogRow[]).map((row) => rowToListItem(row, us));
}

export async function fetchPublishedBlogPost(
  slug: string,
  us: boolean,
): Promise<BlogPostEntry | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "title, slug, description, content, keywords, market, published_at, created_at, updated_at, date_label, badge_text, badge_variant, faq_schema",
    )
    .eq("is_published", true)
    .eq("slug", slug)
    .or(marketFilter(us))
    .maybeSingle();

  if (error || !data) return null;
  return rowToPost(data as DbBlogRow);
}

export function mergeBlogLists(cms: BlogListItem[], fallback: BlogListItem[]): BlogListItem[] {
  const cmsSlugs = new Set(cms.map((p) => p.slug));
  const extras = fallback.filter((p) => !cmsSlugs.has(p.slug));
  return [...cms, ...extras];
}
