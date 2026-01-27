/**
 * Run document versioning migration via Supabase SQL.
 * Requires DATABASE_URL in .env (postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres)
 * Or run the SQL manually in Supabase Dashboard: SQL Editor → New query → paste → Run
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  import.meta.dirname,
  "../supabase/migrations/20260124000000_add_document_versioning_and_relations.sql"
);

const sql = readFileSync(migrationPath, "utf-8");
console.log("Migration SQL (first 500 chars):\n", sql.slice(0, 500), "\n...\n");
console.log("To run this migration:");
console.log("1. Go to https://supabase.com/dashboard → your project → SQL Editor");
console.log("2. New query → paste the contents of:");
console.log("   supabase/migrations/20260124000000_add_document_versioning_and_relations.sql");
console.log("3. Click Run");
console.log("\nOr set DATABASE_URL in .env and run: supabase db push --db-url \"$DATABASE_URL\"");
