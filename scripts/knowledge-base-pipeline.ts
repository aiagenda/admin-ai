/**
 * Unified Knowledge Base Pipeline
 * 
 * All-in-one script for scraping, chunking, and generating embeddings
 * 
 * Usage:
 *   npm run kb:import
 *   or
 *   npx tsx scripts/knowledge-base-pipeline.ts
 * 
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *   - OPENAI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as https from "https";
import * as http from "http";
import { load } from "cheerio";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required environment variables:");
  if (!SUPABASE_URL) console.error("  ❌ VITE_SUPABASE_URL or SUPABASE_URL");
  if (!SUPABASE_KEY) console.error("  ❌ SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!OPENAI_API_KEY) console.error("  ❌ OPENAI_API_KEY");
  console.error("\nPlease add the missing variables to your .env file.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const RATE_LIMIT_DELAY = 2500; // 2.5 seconds between requests
const CHUNK_SIZE = 1000; // Increased chunk size to reduce number of chunks
const CHUNK_OVERLAP = 200;
const MAX_CONTENT_LENGTH = 30000; // Reduced to prevent memory issues

// Statistics
const stats = {
  documentsScraped: 0,
  documentsSkipped: 0,
  documentsFailed: 0,
  chunksCreated: 0,
  embeddingsGenerated: 0,
  errors: [] as string[],
};

/**
 * Fetch HTML content from URL with proper headers and redirect following
 */
function fetchUrl(url: string, maxRedirects: number = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error("Too many redirects"));
      return;
    }

    const protocol = url.startsWith("https") ? https : http;
    
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AdminAI-KB-Bot/1.0; +https://adminai.hu)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
      },
      maxRedirects: 5,
      followRedirect: true,
    };

    const req = protocol.get(url, options, (res) => {
      // Handle redirects (301, 302, 307, 308)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode)) {
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`Redirect without Location header: ${res.statusCode}`));
          return;
        }
        
        // Handle relative redirects
        const redirectUrl = location.startsWith("http") 
          ? location 
          : new URL(location, url).toString();
        
        console.log(`   ↪️  Redirecting to: ${redirectUrl}`);
        return fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Extract clean text from HTML using Cheerio
 */
function extractText(html: string, url: string): string {
  try {
    const $ = load(html);
    
    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, .advertisement, .ads").remove();
    
    // Try to find main content area
    let content = "";
    const selectors = [
      "main",
      "article",
      ".content",
      "#content",
      ".main-content",
      "body",
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        if (content.length > 500) {
          break;
        }
      }
    }

    // Fallback to body if no main content found
    if (content.length < 500) {
      content = $("body").text();
    }

    // Clean up text
    content = content
      .replace(/\s+/g, " ") // Multiple spaces to single space
      .replace(/\n\s*\n/g, "\n\n") // Multiple newlines to double newline
      .trim();

    return content;
  } catch (error: any) {
    console.warn(`Error parsing HTML for ${url}: ${error.message}`);
    // Fallback to basic extraction
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    return text;
  }
}

/**
 * Extract page title from HTML
 */
function extractPageTitle(html: string): string {
  try {
    const $ = load(html);
    return $("title").first().text().trim().replace(/\s+/g, " ") || "";
  } catch {
    return "";
  }
}

/**
 * NAV hub: extract all nav.gov.hu links from HTML (absolute URL + link text)
 */
function extractHubLinks(html: string, baseUrl: string): { url: string; linkText: string }[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const out: { url: string; linkText: string }[] = [];
  try {
    const $ = load(html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      let abs: URL;
      try {
        abs = new URL(href, baseUrl);
      } catch {
        return;
      }
      if (abs.hostname !== base.hostname) return;
      const url = abs.href;
      if (seen.has(url)) return;
      seen.add(url);
      const linkText = $(el).text().trim().replace(/\s+/g, " ") || url;
      out.push({ url, linkText });
    });
  } catch {
    // ignore
  }
  return out;
}

const NAV_HUB_URL = "https://nav.gov.hu/adatbazisok";

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());
    start = end - overlap; // Overlap for context preservation
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string, retries: number = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 8000), // Limit input length
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          console.warn(`Rate limit hit, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const data = await response.json();
      stats.embeddingsGenerated++;
      return data.data[0].embedding;
    } catch (error: any) {
      if (attempt === retries) {
        throw error;
      }
      console.warn(`Embedding generation attempt ${attempt} failed: ${error.message}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error("Failed to generate embedding after retries");
}

/**
 * Process a single document: scrape, chunk, and generate embeddings
 */
async function processDocument(
  url: string,
  title: string,
  category: string,
  sourceType: string,
  sourceInstitution: string,
  options?: { useTitleFromHtml?: boolean }
): Promise<string | null> {
  try {
    console.log(`\n📄 Processing: ${title}`);
    console.log(`   URL: ${url}`);

      // Check if document already exists
      const { data: existing } = await supabase
        .from("knowledge_documents")
        .select("id, content")
        .eq("source_url", url)
        .maybeSingle();

      if (existing) {
        // Check if chunks exist
        const { data: existingChunks } = await supabase
          .from("knowledge_chunks")
          .select("id")
          .eq("document_id", existing.id)
          .limit(1);

        if (existingChunks && existingChunks.length > 0) {
          console.log(`   ✓ Already exists with chunks, skipping...`);
          stats.documentsSkipped++;
          return existing.id;
        } else {
          console.log(`   ⚠️  Exists but no chunks. Skipping chunk creation (use separate script for existing docs).`);
          console.log(`   💡 Tip: Run chunks creation separately for existing documents to avoid memory issues.`);
          stats.documentsSkipped++;
          return existing.id;
        }
      }

    // Fetch and extract content
    console.log(`   🔍 Fetching content...`);
    const html = await fetchUrl(url);
    if (options?.useTitleFromHtml) {
      const pageTitle = extractPageTitle(html);
      if (pageTitle) title = pageTitle;
    }
    const content = extractText(html, url);

    if (content.length < 100) {
      const error = `Content too short (${content.length} chars) for ${title}`;
      console.warn(`   ⚠️  ${error}`);
      stats.documentsFailed++;
      stats.errors.push(error);
      return null;
    }

    const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH);
    console.log(`   ✓ Extracted ${truncatedContent.length} characters`);

    // Insert document
    console.log(`   💾 Saving to database...`);
    const { data: newDoc, error: insertError } = await supabase
      .from("knowledge_documents")
      .insert({
        title,
        content: truncatedContent,
        category,
        source_type: sourceType,
        source_url: url,
        source_institution: sourceInstitution,
      })
      .select("id")
      .single();

    if (insertError || !newDoc) {
      const error = `Failed to insert document: ${insertError?.message || "Unknown error"}`;
      console.error(`   ❌ ${error}`);
      stats.documentsFailed++;
      stats.errors.push(error);
      return null;
    }

    console.log(`   ✅ Document saved (ID: ${newDoc.id})`);
    stats.documentsScraped++;

    // Chunk the content
    console.log(`   🔪 Chunking content...`);
    const chunks = chunkText(truncatedContent, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`   ✓ Generated ${chunks.length} chunks`);

    // Insert chunks without embeddings (embeddings will be generated separately)
    console.log(`   💾 Saving chunks to database...`);
    const chunkInserts = chunks.map((chunk, i) => ({
      document_id: newDoc.id,
      chunk_text: chunk,
      chunk_index: i,
      embedding: null, // Will be generated later
      metadata: {
        chunk_size: chunk.length,
        total_chunks: chunks.length,
      },
    }));

    // Insert chunks in batches to avoid memory issues
    const CHUNK_BATCH_SIZE = 10;
    for (let i = 0; i < chunkInserts.length; i += CHUNK_BATCH_SIZE) {
      const batch = chunkInserts.slice(i, i + CHUNK_BATCH_SIZE);
      const { error: chunkError } = await supabase.from("knowledge_chunks").insert(batch);
      
      if (chunkError) {
        console.error(`      ❌ Error inserting chunks ${i + 1}-${Math.min(i + CHUNK_BATCH_SIZE, chunkInserts.length)}: ${chunkError.message}`);
        stats.errors.push(`Chunks ${i + 1}-${Math.min(i + CHUNK_BATCH_SIZE, chunkInserts.length)} of ${title}: ${chunkError.message}`);
      } else {
        stats.chunksCreated += batch.length;
        console.log(`      ✅ Saved chunks ${i + 1}-${Math.min(i + CHUNK_BATCH_SIZE, chunkInserts.length)}/${chunkInserts.length}`);
      }
      
      // Small delay between batches
      if (i + CHUNK_BATCH_SIZE < chunkInserts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`   ⚠️  Note: Embeddings will be generated separately using: npm run kb:embeddings`);

    console.log(`   ✅ Complete: ${title}`);
    return newDoc.id;
  } catch (error: any) {
    const errorMsg = `Error processing ${title}: ${error.message}`;
    console.error(`   ❌ ${errorMsg}`);
    stats.documentsFailed++;
    stats.errors.push(errorMsg);
    return null;
  }
}

/**
 * Knowledge base sources configuration
 * NAV: frissített, működő URL-ek (adatbazisok hub + ügyféliránytű).
 */
const KNOWLEDGE_SOURCES = [
  // NAV (Nemzeti Adó- és Vámhivatal)
  {
    url: "https://nav.gov.hu/adatbazisok",
    title: "NAV - Adatbázisok (hub)",
    category: "adozas",
    sourceType: "official",
    sourceInstitution: "NAV",
  },
  {
    url: "https://nav.gov.hu/ugyfeliranytu",
    title: "NAV - Ügyféliránytű",
    category: "adozas",
    sourceType: "official",
    sourceInstitution: "NAV",
  },
  {
    url: "https://nav.gov.hu/ugyfeliranytu/elethelyzetek-adozasa",
    title: "NAV - Élethelyzetek adózása",
    category: "adozas",
    sourceType: "official",
    sourceInstitution: "NAV",
  },
  // TB (Társadalombiztosítási)
  {
    url: "https://www.tb.gov.hu/",
    title: "TB - Főoldal",
    category: "egeszsegugy",
    sourceType: "official",
    sourceInstitution: "TB",
  },
  {
    url: "https://www.tb.gov.hu/tb/gyik",
    title: "TB - GYIK",
    category: "egeszsegugy",
    sourceType: "faq",
    sourceInstitution: "TB",
  },
  // EESZT
  {
    url: "https://www.eeszt.gov.hu/hu/nyilvanos-portal",
    title: "EESZT - Nyilvános portál",
    category: "egeszsegugy",
    sourceType: "official",
    sourceInstitution: "EESZT",
  },
];

/**
 * Main pipeline function
 */
async function main() {
  console.log("🚀 Starting Knowledge Base Pipeline...\n");
  console.log("=".repeat(60));
  console.log("Configuration:");
  console.log(`  - Rate limit delay: ${RATE_LIMIT_DELAY}ms`);
  console.log(`  - Chunk size: ${CHUNK_SIZE} characters`);
  console.log(`  - Chunk overlap: ${CHUNK_OVERLAP} characters`);
  console.log(`  - Max content length: ${MAX_CONTENT_LENGTH} characters`);
  console.log(`  - Sources to process: ${KNOWLEDGE_SOURCES.length}`);
  console.log("=".repeat(60));
  console.log();

  const startTime = Date.now();

  // Process each source
  for (let i = 0; i < KNOWLEDGE_SOURCES.length; i++) {
    const source = KNOWLEDGE_SOURCES[i];
    console.log(`\n[${i + 1}/${KNOWLEDGE_SOURCES.length}] Processing source...`);

    if (source.url === NAV_HUB_URL) {
      // NAV Adatbázisok hub: szedjük le az összes aloldalt
      console.log(`   🔗 Hub crawl: ${source.title}`);
      const hubHtml = await fetchUrl(source.url);
      const links = extractHubLinks(hubHtml, source.url);
      console.log(`   📎 ${links.length} aloldal található`);
      for (let j = 0; j < links.length; j++) {
        const link = links[j];
        await processDocument(
          link.url,
          link.linkText,
          source.category,
          source.sourceType,
          source.sourceInstitution,
          { useTitleFromHtml: true }
        );
        if (j < links.length - 1) {
          console.log(`\n⏳ Rate limiting (${RATE_LIMIT_DELAY}ms)...`);
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
      }
    } else {
      await processDocument(
        source.url,
        source.title,
        source.category,
        source.sourceType,
        source.sourceInstitution
      );
    }

    // Rate limiting between sources
    if (i < KNOWLEDGE_SOURCES.length - 1) {
      console.log(`\n⏳ Rate limiting (${RATE_LIMIT_DELAY}ms)...`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print statistics
  console.log("\n" + "=".repeat(60));
  console.log("📊 Pipeline Statistics");
  console.log("=".repeat(60));
  console.log(`✅ Documents scraped: ${stats.documentsScraped}`);
  console.log(`⏭️  Documents skipped: ${stats.documentsSkipped}`);
  console.log(`❌ Documents failed: ${stats.documentsFailed}`);
  console.log(`🔪 Chunks created: ${stats.chunksCreated}`);
  console.log(`🧠 Embeddings generated: ${stats.embeddingsGenerated}`);
  console.log(`⏱️  Total time: ${duration}s`);
  console.log("=".repeat(60));

  if (stats.errors.length > 0) {
    console.log("\n⚠️  Errors encountered:");
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log("\n✅ Pipeline complete!");
  console.log("\nNext steps:");
  console.log("1. Review imported documents in Knowledge Base Admin (/admin/knowledge-base)");
  console.log("2. Test RAG integration in document analysis");
  console.log("3. Add more sources to KNOWLEDGE_SOURCES array as needed");
}

// Run the pipeline
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});

