#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, existsSync, copyFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIP_NAME = "GovLetter_US_complete_test_pack.zip";
const STAGING = path.join(ROOT, "test-documents", "_pack_staging");
const OUT_PUBLIC = path.join(ROOT, "public", "downloads");

function stageDir(stageSub, srcDir) {
  if (!existsSync(srcDir)) return 0;
  const dest = path.join(STAGING, stageSub);
  mkdirSync(dest, { recursive: true });
  execSync(`cp -R "${srcDir}/." "${dest}/"`);
  return readdirSync(dest).length;
}

mkdirSync(STAGING, { recursive: true });
const noticesDir = path.join(STAGING, "notices");
mkdirSync(noticesDir, { recursive: true });
let n = 0;
for (const f of readdirSync(path.join(ROOT, "test-documents"))) {
  if (/^\d{2}_.*\.pdf$/i.test(f)) {
    copyFileSync(path.join(ROOT, "test-documents", f), path.join(noticesDir, f));
    n++;
  }
}
console.log(`Staged ${n} notice PDFs`);

stageDir("us_federal", path.join(ROOT, "test-documents", "us", "federal"));
stageDir("us_state", path.join(ROOT, "test-documents", "us", "state"));
stageDir("us_civil", path.join(ROOT, "test-documents", "us", "civil"));
stageDir("invoices_typed", path.join(ROOT, "test-documents", "us", "invoices", "typed_pdf"));
stageDir("invoices_handwritten", path.join(ROOT, "test-documents", "us", "invoices", "handwritten_png"));

const manifest = path.join(ROOT, "test-documents", "US_TEST_MANIFEST.md");
if (existsSync(manifest)) copyFileSync(manifest, path.join(STAGING, "US_TEST_MANIFEST.md"));

mkdirSync(OUT_PUBLIC, { recursive: true });
const zipPublic = path.join(OUT_PUBLIC, ZIP_NAME);
const zipRepo = path.join(ROOT, "test-documents", ZIP_NAME);
for (const z of [zipPublic, zipRepo]) {
  if (existsSync(z)) execSync(`rm -f "${z}"`);
}
execSync(`cd "${STAGING}" && zip -qr "${zipPublic}" .`);
copyFileSync(zipPublic, zipRepo);
execSync(`rm -rf "${STAGING}"`);

const bytes = Number(execSync(`stat -f%z "${zipPublic}"`, { encoding: "utf8" }));
console.log(`\n✓ ${zipPublic} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`✓ ${zipRepo}`);
console.log(`\nDownload (after deploy): https://www.govletter.com/downloads/${ZIP_NAME}`);
console.log(`GitHub raw (branch): https://github.com/aiagenda/admin-ai/raw/HEAD/public/downloads/${ZIP_NAME}`);
