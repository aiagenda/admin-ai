/**
 * Verify Knowledge Base Sources
 *
 * Fetches each KNOWLEDGE_SOURCES URL, extracts text, and prints a table:
 * what succeeded, what failed, and how much content was extracted.
 *
 * Usage:
 *   npm run kb:verify
 *   or
 *   npx tsx scripts/verify-knowledge-sources.ts
 *
 * No environment variables required (read-only check).
 */

import * as https from "https";
import * as http from "http";
import { load } from "cheerio";

const RATE_LIMIT_MS = 2000;
const MIN_CONTENT_LENGTH = 100;
const PREVIEW_LEN = 80;
const NAV_HUB_URL = "https://nav.gov.hu/adatbazisok";

const KNOWLEDGE_SOURCES = [
  { url: NAV_HUB_URL, title: "NAV - Adatbázisok (hub)", category: "adozas", isHub: true as const },
  { url: "https://nav.gov.hu/ugyfeliranytu", title: "NAV - Ügyféliránytű", category: "adozas", isHub: false as const },
  { url: "https://nav.gov.hu/ugyfeliranytu/elethelyzetek-adozasa", title: "NAV - Élethelyzetek adózása", category: "adozas", isHub: false as const },
  { url: "https://www.tb.gov.hu/", title: "TB - Főoldal", category: "egeszsegugy", isHub: false as const },
  { url: "https://www.tb.gov.hu/tb/gyik", title: "TB - GYIK", category: "egeszsegugy", isHub: false as const },
  { url: "https://www.eeszt.gov.hu/hu/nyilvanos-portal", title: "EESZT - Nyilvános portál", category: "egeszsegugy", isHub: false as const },
];

function fetchUrl(url: string, maxRedirects: number = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error("Too many redirects"));
      return;
    }
    const protocol = url.startsWith("https") ? https : http;
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GovLetter-KB-Bot/1.0; +https://govletter.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hu-HU,hu;q=0.9,en;q=0.8",
      },
    };
    const req = protocol.get(url, options, (res) => {
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode)) {
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`Redirect without Location: ${res.statusCode}`));
          return;
        }
        const redirectUrl = location.startsWith("http") ? location : new URL(location, url).toString();
        fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

function extractText(html: string): string {
  try {
    const $ = load(html);
    $("script, style, nav, header, footer, aside, .advertisement, .ads").remove();
    let content = "";
    const selectors = ["main", "article", ".content", "#content", ".main-content", "body"];
    for (const selector of selectors) {
      const el = $(selector);
      if (el.length > 0) {
        content = el.text();
        if (content.length > 500) break;
      }
    }
    if (content.length < 500) content = $("body").text();
    return content.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();
  } catch {
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
    return text.replace(/\s+/g, " ").trim();
  }
}

function preview(text: string, maxLen: number = PREVIEW_LEN): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "…";
}

function extractPageTitle(html: string): string {
  try {
    const $ = load(html);
    return $("title").first().text().trim().replace(/\s+/g, " ") || "";
  } catch {
    return "";
  }
}

/** NAV hub: kinyeri a nav.gov.hu-ra mutató linkeket (abszolút URL + link szöveg). */
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

type Row = { index: number; title: string; url: string; status: "OK" | "FAIL" | "TÚL_RÖVID"; chars: number; preview: string; error?: string; fromHub?: boolean };

async function main() {
  console.log("🔍 Knowledge Base források ellenőrzése\n");
  console.log("=".repeat(70));

  const results: Row[] = [];

  for (let i = 0; i < KNOWLEDGE_SOURCES.length; i++) {
    const src = KNOWLEDGE_SOURCES[i];

    if (src.url === NAV_HUB_URL && src.isHub) {
      // NAV Adatbázisok hub: szedjük le az összes aloldalt
      process.stdout.write(`  [${i + 1}/${KNOWLEDGE_SOURCES.length}] ${src.title} (hub crawl) ... `);
      try {
        const hubHtml = await fetchUrl(src.url);
        const links = extractHubLinks(hubHtml, src.url);
        console.log(`${links.length} link található`);
        let hubOk = 0;
        let hubFail = 0;
        for (let j = 0; j < links.length; j++) {
          const link = links[j];
          process.stdout.write(`    [${j + 1}/${links.length}] ${link.linkText.slice(0, 50)}${link.linkText.length > 50 ? "…" : ""} ... `);
          try {
            const html = await fetchUrl(link.url);
            const text = extractText(html);
            const pageTitle = extractPageTitle(html) || link.linkText;
            const len = text.length;
            if (len < MIN_CONTENT_LENGTH) {
              results.push({
                index: 0,
                title: `NAV hub: ${pageTitle}`,
                url: link.url,
                status: "TÚL_RÖVID",
                chars: len,
                preview: preview(text),
                error: `Csak ${len} karakter`,
                fromHub: true,
              });
              console.log("⚠️  túl rövid");
            } else {
              results.push({
                index: 0,
                title: `NAV hub: ${pageTitle}`,
                url: link.url,
                status: "OK",
                chars: len,
                preview: preview(text),
                fromHub: true,
              });
              hubOk++;
              console.log(`✅ ${len} karakter`);
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            results.push({
              index: 0,
              title: `NAV hub: ${link.linkText}`,
              url: link.url,
              status: "FAIL",
              chars: 0,
              preview: "",
              error: msg,
              fromHub: true,
            });
            hubFail++;
            console.log("❌ " + msg);
          }
          if (j < links.length - 1) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
        }
        console.log(`    → Hub összesen: ${hubOk} sikeres, ${hubFail} sikertelen`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          index: i + 1,
          title: src.title,
          url: src.url,
          status: "FAIL",
          chars: 0,
          preview: "",
          error: msg,
        });
        console.log("❌ " + msg);
      }
    } else {
      process.stdout.write(`  [${i + 1}/${KNOWLEDGE_SOURCES.length}] ${src.title} ... `);
      try {
        const html = await fetchUrl(src.url);
        const text = extractText(html);
        const len = text.length;

        if (len < MIN_CONTENT_LENGTH) {
          results.push({
            index: i + 1,
            title: src.title,
            url: src.url,
            status: "TÚL_RÖVID",
            chars: len,
            preview: preview(text),
            error: `Csak ${len} karakter`,
          });
          console.log("⚠️  túl rövid");
        } else {
          results.push({
            index: i + 1,
            title: src.title,
            url: src.url,
            status: "OK",
            chars: len,
            preview: preview(text),
          });
          console.log(`✅ ${len} karakter`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          index: i + 1,
          title: src.title,
          url: src.url,
          status: "FAIL",
          chars: 0,
          preview: "",
          error: msg,
        });
        console.log("❌ " + msg);
      }
    }

    if (i < KNOWLEDGE_SOURCES.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📋 Összesítő – mit sikerült kinyerni\n");

  const ok = results.filter((r) => r.status === "OK");
  const fail = results.filter((r) => r.status === "FAIL");
  const short = results.filter((r) => r.status === "TÚL_RÖVID");
  const hubOk = results.filter((r) => r.fromHub && r.status === "OK");
  const hubFail = results.filter((r) => r.fromHub && r.status === "FAIL");
  const okNonHub = ok.filter((r) => !r.fromHub);

  if (hubOk.length > 0) {
    console.log("  NAV Adatbázisok hub – aloldalak (cím megnevezések):");
    hubOk.forEach((r) => console.log(`    • ${r.title}`));
    hubOk.forEach((r) => console.log(`      ${r.chars} karakter | ${r.preview}`));
    console.log(`    Összesen: ${hubOk.length} dokumentum sikerült kinyerni (a tudástárhoz hozzáadható).\n`);
  }

  console.log("  Sikerült (OK) – egyéb források:");
  if (okNonHub.length === 0) {
    console.log("    (egyik sem)");
  } else {
    okNonHub.forEach((r) => console.log(`    • ${r.title}`));
    okNonHub.forEach((r) => console.log(`      ${r.chars} karakter | ${r.preview}`));
  }

  console.log("\n  Túl rövid tartalom:");
  if (short.length === 0) {
    console.log("    (nincs)");
  } else {
    short.forEach((r) => console.log(`    • ${r.title} – ${r.error}`));
  }

  console.log("\n  Sikertelen (hiba / 404 / timeout) – linkek:");
  if (fail.length === 0) {
    console.log("    (nincs)");
  } else {
    fail.forEach((r) => console.log(`    • ${r.title} — ${r.url}`));
    fail.forEach((r) => console.log(`      ${r.error}`));
  }

  const totalOk = ok.length;
  console.log("\n" + "=".repeat(70));
  console.log(`  Összesen: ${totalOk} dokumentum sikerült kinyerni (ebből NAV hub aloldalak: ${hubOk.length}, egyéb források: ${okNonHub.length}).`);
  console.log("=".repeat(70));
  console.log("\n✅ Ellenőrzés kész.");
}

main().catch((err) => {
  console.error("❌ Hiba:", err);
  process.exit(1);
});
