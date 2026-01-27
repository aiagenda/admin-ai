/**
 * Web scraping script for Hungarian administrative knowledge base
 * 
 * Usage:
 *   npx tsx scripts/scrape-knowledge-base.ts
 * 
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *   - OPENAI_API_KEY (optional, for content summarization)
 * 
 * This script scrapes official Hungarian administrative sources and
 * imports them into the knowledge base.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as https from "https";
import * as http from "http";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables:");
  console.error("- VITE_SUPABASE_URL or SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetch HTML content from URL
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    protocol
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Simple HTML to text extraction (basic implementation)
 * In production, use a proper HTML parser like Cheerio
 */
function extractText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}

/**
 * Scrape NAV (Nemzeti Adó- és Vámhivatal) pages
 */
async function scrapeNAV() {
  console.log("\n=== NAV scraping ===");
  
  const navUrls = [
    {
      url: "https://www.nav.gov.hu/nav/ado/adozasi_informaciok",
      title: "Adózási információk",
      category: "adozas",
      source_institution: "NAV",
    },
    // Add more NAV URLs here
  ];

  for (const item of navUrls) {
    try {
      console.log(`Fetching: ${item.url}`);
      const html = await fetchUrl(item.url);
      const content = extractText(html);
      
      if (content.length < 100) {
        console.warn(`⚠️  Content too short for ${item.title}, skipping...`);
        continue;
      }

      // Check if document already exists
      const { data: existing } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("source_url", item.url)
        .single();

      if (existing) {
        console.log(`✓ Already exists: ${item.title}`);
        continue;
      }

      // Insert into knowledge base
      const { error } = await supabase.from("knowledge_documents").insert({
        title: item.title,
        content: content.slice(0, 50000), // Limit content length
        category: item.category,
        source_type: "official",
        source_url: item.url,
        source_institution: item.source_institution,
      });

      if (error) {
        console.error(`Error inserting ${item.title}:`, error.message);
      } else {
        console.log(`✅ Inserted: ${item.title}`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`Error scraping ${item.url}:`, error.message);
    }
  }
}

/**
 * Scrape TB (Társadalombiztosítási) pages
 */
async function scrapeTB() {
  console.log("\n=== TB scraping ===");
  
  const tbUrls = [
    {
      url: "https://www.tb.gov.hu/",
      title: "TB főoldal",
      category: "egeszsegugy",
      source_institution: "TB",
    },
    // Add more TB URLs here
  ];

  for (const item of tbUrls) {
    try {
      console.log(`Fetching: ${item.url}`);
      const html = await fetchUrl(item.url);
      const content = extractText(html);
      
      if (content.length < 100) {
        console.warn(`⚠️  Content too short for ${item.title}, skipping...`);
        continue;
      }

      // Check if document already exists
      const { data: existing } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("source_url", item.url)
        .single();

      if (existing) {
        console.log(`✓ Already exists: ${item.title}`);
        continue;
      }

      // Insert into knowledge base
      const { error } = await supabase.from("knowledge_documents").insert({
        title: item.title,
        content: content.slice(0, 50000),
        category: item.category,
        source_type: "official",
        source_url: item.url,
        source_institution: item.source_institution,
      });

      if (error) {
        console.error(`Error inserting ${item.title}:`, error.message);
      } else {
        console.log(`✅ Inserted: ${item.title}`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`Error scraping ${item.url}:`, error.message);
    }
  }
}

/**
 * Manual import function for adding documents manually
 */
async function manualImport() {
  console.log("\n=== Manual Import ===");
  console.log("Use the Knowledge Base Admin interface to add documents manually.");
  console.log("Or add them directly to the knowledge_documents table in Supabase.");
}

/**
 * Main function
 */
async function main() {
  console.log("Starting knowledge base scraping...\n");
  console.log("⚠️  NOTE: This is a basic implementation.");
  console.log("For production use, consider:");
  console.log("  - Using Cheerio for proper HTML parsing");
  console.log("  - Handling JavaScript-rendered content (Puppeteer/Playwright)");
  console.log("  - Respecting robots.txt");
  console.log("  - Implementing proper rate limiting");
  console.log("  - Adding content validation and cleaning\n");

  try {
    // Scrape different sources
    await scrapeNAV();
    await scrapeTB();
    
    // Manual import reminder
    await manualImport();

    console.log("\n✅ Scraping complete!");
    console.log("\nNext steps:");
    console.log("1. Review imported documents in Knowledge Base Admin");
    console.log("2. Run generate-embeddings.ts to create embeddings");
    console.log("3. Test RAG integration in document analysis");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

