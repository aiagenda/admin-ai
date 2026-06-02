/**
 * scripts/sync-us-forms.ts
 *
 * Downloads IRS form PDFs from irs.gov, uploads them to Supabase Storage
 * (bucket: form-pdfs), and updates the forms table so the app serves
 * files from our own storage instead of linking directly to irs.gov.
 *
 * Usage:
 *   npm run forms:sync            # sync all
 *   npm run forms:sync -- --dry   # dry-run (download + hash check only, no upload)
 *
 * Environment (from .env.local or .env):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing env: SUPABASE_URL/VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const isDry = process.argv.includes("--dry");
const BUCKET = "form-pdfs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Form list — add new forms here as needed
// ─────────────────────────────────────────────────────────────────────────────
interface CatalogFormLegacy {
  key: string;
  sourceUrl: string;
  onlineUrl: string; // official portal / instructions page (kept as-is in DB)
}


import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = join(__dirname, "forms/catalog");

type CatalogForm = {
  key: string;
  name?: string;
  sourceUrl: string;
  onlineUrl: string;
  jurisdiction?: string;
  state_code?: string;
  agency?: string;
};

function loadCatalog(): CatalogForm[] {
  const out: CatalogForm[] = [];
  for (const f of ["federal-irs.json", "federal-ssa.json", "federal-uscis.json"]) {
    const p = join(CATALOG_DIR, f);
    if (existsSync(p)) {
      for (const row of JSON.parse(readFileSync(p, "utf-8"))) {
        out.push({
          key: row.key,
          name: row.name || row.key,
          sourceUrl: row.sourceUrl || "",
          onlineUrl: row.onlineUrl,
          jurisdiction: row.jurisdiction,
          state_code: row.state_code,
          agency: row.agency,
        });
      }
    }
  }
  const sd = join(CATALOG_DIR, "states");
  if (existsSync(sd)) {
    for (const file of readdirSync(sd).filter((x) => x.endsWith(".json"))) {
      for (const row of JSON.parse(readFileSync(join(sd, file), "utf-8"))) {
        out.push({
          key: row.key,
          name: row.name || row.key,
          sourceUrl: row.sourceUrl || "",
          onlineUrl: row.onlineUrl,
          jurisdiction: row.jurisdiction,
          state_code: row.state_code,
          agency: row.agency,
        });
      }
    }
  }
  return out;
}

const IRS_FORMS: CatalogForm[] = loadCatalog().filter((f) => f.sourceUrl);

const IRS_FORMS_SKIP = loadCatalog().filter((f) => !f.sourceUrl);

const IRS_FORMS_LEGACY: CatalogFormLegacy[] = [
  {
    key: "irs_form_9465",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f9465.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-9465",
  },
  {
    key: "irs_form_843",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f843.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-843",
  },
  {
    key: "irs_form_433a",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f433a.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-433-a",
  },
  {
    key: "irs_form_433b",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f433b.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-433-b",
  },
  {
    key: "irs_form_12153",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f12153.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-12153",
  },
  {
    key: "irs_form_656",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f656.pdf",
    onlineUrl: "https://www.irs.gov/payments/offer-in-compromise",
  },
  {
    key: "irs_form_2848",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f2848.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-2848",
  },
  {
    key: "irs_form_1040x",
    sourceUrl: "https://www.irs.gov/pub/irs-pdf/f1040x.pdf",
    onlineUrl: "https://www.irs.gov/forms-pubs/about-form-1040-x",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function ensureBucket(): Promise<void> {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 15 * 1024 * 1024, // 15 MB — IRS PDFs are usually < 2 MB
    allowedMimeTypes: ["application/pdf"],
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Bucket creation failed: ${error.message}`);
  }
}

async function downloadPdf(url: string, key: string): Promise<Buffer | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "NoticeIQ-FormSync/1.0 (+https://github.com/aiagenda/admin-ai; form-pdf-mirror)",
      Accept: "application/pdf,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    console.error(`  ✗ Download ${res.status} ${res.statusText}: ${url}`);
    return null;
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("pdf") && !contentType.includes("octet")) {
    console.warn(`  ⚠  Unexpected content-type "${contentType}" for ${key}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function getStoredHash(storagePath: string): Promise<string | null> {
  // We store the hash in a tiny sidecar file next to the PDF
  const hashPath = storagePath.replace(".pdf", ".sha256");
  const { data, error } = await supabase.storage.from(BUCKET).download(hashPath);
  if (error || !data) return null;
  return (await data.text()).trim();
}

async function writeStoredHash(storagePath: string, hash: string): Promise<void> {
  const hashPath = storagePath.replace(".pdf", ".sha256");
  const buf = Buffer.from(hash, "utf-8");
  await supabase.storage.from(BUCKET).upload(hashPath, buf, {
    contentType: "text/plain",
    upsert: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-form sync
// ─────────────────────────────────────────────────────────────────────────────

type SyncResult = "updated" | "skipped" | "error";

async function syncForm(form: CatalogForm | CatalogFormLegacy): Promise<SyncResult> {
  const { key, sourceUrl, onlineUrl } = form;
  const storagePath = form.state_code
    ? `state/${form.state_code}/${key}.pdf`
    : `federal/${key}.pdf`;

  // Step 1: Download
  const pdf = await downloadPdf(sourceUrl, key);
  if (!pdf) return "error";
  const hash = sha256(pdf);

  // Step 2: Compare with stored hash
  const storedHash = await getStoredHash(storagePath);
  if (storedHash === hash) {
    console.log(`  ✓ unchanged (${hash.slice(0, 10)})`);
    return "skipped";
  }

  if (isDry) {
    const reason = storedHash ? "changed" : "new";
    console.log(`  🔍 dry-run: would upload (${reason}, hash=${hash.slice(0, 10)})`);
    return "updated";
  }

  // Step 3: Upload PDF
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) {
    console.error(`  ✗ Upload error: ${upErr.message}`);
    return "error";
  }

  // Step 4: Write hash sidecar
  await writeStoredHash(storagePath, hash);

  // Step 5: Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Step 6: Update forms table
  //   pdf_url      → our storage URL (used for downloads in the app)
  //   fillable_url → official irs.gov PDF (original, for "open official" button)
  //   online_url   → official irs.gov portal/instructions page
  //   last_updated → today
  const today = new Date().toISOString().split("T")[0];
  const { error: dbErr } = await supabase
    .from("forms")
    .update({
      pdf_url: publicUrl,
      fillable_url: sourceUrl,   // keep original irs.gov PDF as "fillable" link
      online_url: onlineUrl,     // instructions / portal
      last_updated: today,
    })
    .eq("key", key);

  if (dbErr) {
    console.error(`  ✗ DB update error: ${dbErr.message}`);
    return "error";
  }

  console.log(`  ✅ synced → ${publicUrl.slice(0, 72)}…`);
  return "updated";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔄  US Form PDF Sync${isDry ? " [DRY RUN]" : ""}`);
  console.log(`    Supabase: ${SUPABASE_URL}`);
  console.log(`    Bucket:   ${BUCKET}`);
  console.log(`    Forms:    ${IRS_FORMS.length}\n`);

  if (!isDry) await ensureBucket();

  let updated = 0;
  let skipped = 0;
  let errors = 0;


  for (const form of IRS_FORMS_SKIP) {
    console.log(`\n🔗 ${form.key} (link only)`);
    if (!isDry) {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("forms").upsert({
        key: form.key,
        name: form.name || form.key,
        pdf_url: form.onlineUrl,
        online_url: form.onlineUrl,
        institution: form.agency || "US",
        jurisdiction: form.jurisdiction || "state",
        state_code: form.state_code || null,
        agency: form.agency,
        market: "us",
        last_updated: today,
      }, { onConflict: "key" });
    }
  }

  for (const form of IRS_FORMS) {
    console.log(`\n📄 ${form.key}`);
    const result = await syncForm(form);
    if (result === "updated") updated++;
    else if (result === "skipped") skipped++;
    else errors++;

    // Brief pause to be polite to irs.gov
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ updated: ${updated}  •  unchanged: ${skipped}  •  errors: ${errors}`);
  if (errors > 0) {
    console.error("\nSync finished with errors.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
