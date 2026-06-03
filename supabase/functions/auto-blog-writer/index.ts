// auto-blog-writer: scheduled edge function that
//  1. Fetches trending topics from official agency RSS feeds (IRS, SSA, VA,
//     USCIS, Treasury) and Google Trends (unofficial, via trends.google.com CSV)
//  2. Picks the 1-2 most relevant topics for GovLetter's audience
//  3. Generates a full SEO-optimised, US-audience blog post via OpenAI
//  4. Saves it as a draft (is_published = false) in blog_posts
//  5. (optional) sends an email notification to the admin
//
// Called by pg_cron Mon/Wed/Fri at 07:00 UTC.
// Can also be triggered manually: POST /functions/v1/auto-blog-writer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Config ────────────────────────────────────────────────────────────────

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";

// Official agency RSS feeds — 100% free, directly relevant to our audience.
const RSS_FEEDS = [
  { name: "IRS Newsroom", url: "https://www.irs.gov/newsroom/irs-guidance/feed" },
  { name: "IRS Tax Tips", url: "https://www.irs.gov/newsroom/irs-tax-tips/feed" },
  { name: "SSA News", url: "https://blog.ssa.gov/feed/" },
  { name: "Treasury News", url: "https://home.treasury.gov/news/rss-feeds/press-releases" },
  { name: "VA News", url: "https://news.va.gov/feed/" },
];

// Google Trends topics we care about — maps to their topic IDs or query terms.
// We use the unofficial Trends CSV endpoint (no API key needed).
const TRENDS_QUERIES = [
  "IRS notice",
  "IRS payment plan",
  "IRS tax bill",
  "Social Security overpayment",
  "IRS penalty",
  "IRS letter",
  "tax debt relief",
  "IRS installment agreement",
];

// Keywords that flag an RSS item as relevant to GovLetter.
const RELEVANCE_KEYWORDS = [
  "IRS", "tax", "notice", "levy", "lien", "penalty", "refund", "audit",
  "Social Security", "SSA", "overpayment", "Medicare", "VA", "USCIS",
  "installment", "payment plan", "offer in compromise", "collection",
  "deadline", "balance due", "amended", "1040", "W-2", "1099",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) + "-" + Date.now().toString(36);
}

interface RssItem { title: string; description: string; link: string; pubDate: string; source: string }

async function fetchRss(feed: { name: string; url: string }): Promise<RssItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "GovLetter-BlogBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: RssItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of itemMatches) {
      const block = m[1];
      const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
      const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
        ?.replace(/<[^>]+>/g, " ")
        ?.replace(/\s+/g, " ")
        ?.trim() ?? "";
      const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
      const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
      if (title && isRelevant(title + " " + desc)) {
        items.push({ title, description: desc.slice(0, 300), link, pubDate, source: feed.name });
      }
    }
    return items.slice(0, 5);
  } catch (e) {
    console.warn(`RSS fetch failed for ${feed.name}:`, e);
    return [];
  }
}

async function fetchGoogleTrends(): Promise<string[]> {
  // Uses the unofficial Google Trends real-time trending searches endpoint.
  try {
    const res = await fetch(
      "https://trends.google.com/trends/hottrends/atom/feed?pn=p1",
      { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "GovLetter-BlogBot/1.0" } }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)]
      .map((m) => m[1].trim())
      .filter((t) => isRelevant(t))
      .slice(0, 5);
    return titles;
  } catch {
    return [];
  }
}

async function generateBlogPost(topics: { title: string; desc: string; source: string }[]): Promise<{
  title: string;
  slug: string;
  description: string;
  content: string;
  keywords: string;
  faq_schema: object | null;
} | null> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  const topicSummary = topics
    .slice(0, 3)
    .map((t, i) => `${i + 1}. [${t.source}] ${t.title} — ${t.desc}`)
    .join("\n");

  const systemPrompt = `You are a US tax and government-letter expert writing SEO-optimised blog posts for GovLetter.com.
GovLetter helps everyday Americans understand scary government letters (IRS, SSA, VA, USCIS, state tax) and take the right action.
Your audience: non-expert US adults who just received an official letter and are stressed.
Tone: calm, clear, empathetic, plain English. No jargon. Always include "not legal advice" disclaimer.
Output strict JSON only — no markdown, no code fences.`;

  const userPrompt = `Trending government-letter topics this week:
${topicSummary}

Pick the single most useful topic for our audience and write a complete blog post about it.

Return ONLY this JSON (no markdown, no extra text):
{
  "title": "Engaging, clear title (max 70 chars, include primary keyword)",
  "meta_description": "SEO meta description, 140-160 chars",
  "primary_keyword": "main search term (e.g. 'IRS CP14 notice')",
  "secondary_keywords": ["keyword2", "keyword3", "keyword4"],
  "content_html": "Full HTML article. Must include: <h1> title, intro paragraph, 3-5 <h2> sections, action checklist <ul>, <strong> key terms. Min 600 words. End with: <p class='disclaimer'>This article is for informational purposes only and is not legal or tax advice. Consult a qualified professional for your situation.</p>",
  "faq": [
    {"q": "Question?", "a": "Answer."},
    {"q": "Question?", "a": "Answer."},
    {"q": "Question?", "a": "Answer."}
  ]
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.6,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("AI response not valid JSON:", raw.slice(0, 500));
    return null;
  }

  const title = (parsed.title as string)?.trim() ?? "";
  if (!title) return null;

  const keywords = [
    parsed.primary_keyword,
    ...((parsed.secondary_keywords as string[]) ?? []),
  ].filter(Boolean).join(", ");

  // Build FAQ JSON-LD schema
  const faq_schema = Array.isArray(parsed.faq) && parsed.faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: (parsed.faq as { q: string; a: string }[]).map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }
    : null;

  return {
    title,
    slug: slugify(title),
    description: (parsed.meta_description as string) ?? title,
    content: (parsed.content_html as string) ?? "",
    keywords,
    faq_schema,
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results: { saved: number; skipped: number; errors: string[] } = { saved: 0, skipped: 0, errors: [] };

  try {
    // 1. Fetch RSS + Trends in parallel
    const [rssResults, trendingTerms] = await Promise.all([
      Promise.all(RSS_FEEDS.map(fetchRss)),
      fetchGoogleTrends(),
    ]);

    const allItems = rssResults.flat();
    console.log(`RSS items found: ${allItems.length}, trending terms: ${trendingTerms.length}`);

    // Add trending terms as pseudo-items
    for (const term of trendingTerms) {
      allItems.push({ title: term, description: `Trending search: ${term}`, link: "", pubDate: "", source: "Google Trends" });
    }

    if (allItems.length === 0) {
      return new Response(JSON.stringify({ message: "No relevant topics found today", ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check how many posts we've already auto-generated this week (avoid duplicates)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title")
      .eq("market", "us")
      .gte("created_at", weekAgo);

    const recentTitles = new Set((recentPosts ?? []).map((p) => p.title.toLowerCase()));

    // Deduplicate — don't generate a post about the same story we just covered
    const freshItems = allItems.filter(
      (item) => !recentTitles.has(item.title.toLowerCase())
    );

    if (freshItems.length === 0) {
      return new Response(JSON.stringify({ message: "All topics already covered this week", ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Generate ONE blog post (to avoid spamming)
    const post = await generateBlogPost(freshItems.slice(0, 6));
    if (!post) {
      results.errors.push("AI returned no valid content");
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Save as DRAFT in blog_posts
    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: post.title,
      slug: post.slug,
      description: post.description,
      content: post.content,
      keywords: post.keywords,
      faq_schema: post.faq_schema,
      market: "us",
      is_published: false,
      published_at: null,
      date_label: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      badge_text: "Auto-generated",
      badge_variant: "secondary",
    });

    if (insertError) {
      results.errors.push(`DB insert error: ${insertError.message}`);
    } else {
      results.saved++;
      console.log(`Saved draft: "${post.title}"`);

      // 5. Notify admin by email (optional — only if ADMIN_EMAIL is set)
      if (ADMIN_EMAIL) {
        try {
          await supabase.functions.invoke("send-accountant-report", {
            body: {
              to: ADMIN_EMAIL,
              subject: `✍️ New auto-generated blog draft: "${post.title}"`,
              html: `<p>A new blog post draft was automatically created and is waiting for your review.</p>
<p><strong>${post.title}</strong></p>
<p>${post.description}</p>
<p><a href="${SUPABASE_URL.replace('/rest/v1', '')}/admin/blog">Review in Blog Admin →</a></p>
<p style="color:#888;font-size:12px">This draft is NOT published. You need to review and publish it manually.</p>`,
            },
          });
        } catch (mailErr) {
          console.warn("Email notification failed (non-critical):", mailErr);
        }
      }
    }

  } catch (err) {
    const msg = (err as Error)?.message ?? "Unknown error";
    results.errors.push(msg);
    console.error("auto-blog-writer error:", msg);
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
