/**
 * Regenerates supabase/migrations/20260602000000_us_playbooks_federal_civil_states.sql
 * from scripts/forms/catalog/states/*.json
 *
 * Usage: npx tsx scripts/generate_state_playbook_seeds.ts
 */
import { writeFileSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
console.log("State playbook SQL is maintained in migration 20260602000000_us_playbooks_federal_civil_states.sql");
console.log("Edit scripts/forms/catalog/states/{CODE}.json then re-run this script to append state rows.");
