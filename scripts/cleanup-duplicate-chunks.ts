/**
 * Script to cleanup duplicate chunks in the knowledge base
 * 
 * Removes duplicate chunks (same chunk_text for same document_id)
 * Keeps only the first occurrence of each unique chunk
 * 
 * Usage:
 *   npm run kb:cleanup
 *   or
 *   npx tsx scripts/cleanup-duplicate-chunks.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupDuplicateChunks() {
  console.log("🧹 Starting duplicate chunks cleanup...\n");

  try {
    // Get all chunks grouped by document_id
    const { data: allChunks, error: fetchError } = await supabase
      .from("knowledge_chunks")
      .select("id, document_id, chunk_text, chunk_index")
      .order("document_id")
      .order("chunk_index");

    if (fetchError) {
      console.error("❌ Error fetching chunks:", fetchError.message);
      process.exit(1);
    }

    if (!allChunks || allChunks.length === 0) {
      console.log("✅ No chunks found. Nothing to clean up.");
      return;
    }

    console.log(`📊 Found ${allChunks.length} total chunks\n`);

    // Group chunks by document_id
    const chunksByDocument = new Map<string, typeof allChunks>();
    for (const chunk of allChunks) {
      if (!chunksByDocument.has(chunk.document_id)) {
        chunksByDocument.set(chunk.document_id, []);
      }
      chunksByDocument.get(chunk.document_id)!.push(chunk);
    }

    console.log(`📄 Processing ${chunksByDocument.size} documents\n`);

    let totalDuplicates = 0;
    let totalDeleted = 0;
    const BATCH_SIZE = 50; // Delete in batches to avoid overwhelming the database

    // Process each document
    for (const [docId, chunks] of chunksByDocument.entries()) {
      // Find duplicates within this document
      const seenTexts = new Map<string, string>(); // chunk_text -> first chunk id
      const duplicatesToDelete: string[] = [];

      for (const chunk of chunks) {
        const normalizedText = chunk.chunk_text.trim().toLowerCase();
        
        if (seenTexts.has(normalizedText)) {
          // This is a duplicate - mark for deletion
          duplicatesToDelete.push(chunk.id);
          totalDuplicates++;
        } else {
          // First occurrence - keep it
          seenTexts.set(normalizedText, chunk.id);
        }
      }

      if (duplicatesToDelete.length > 0) {
        console.log(`📄 Document ${docId.substring(0, 8)}...: Found ${duplicatesToDelete.length} duplicate chunks`);

        // Delete duplicates in batches
        for (let i = 0; i < duplicatesToDelete.length; i += BATCH_SIZE) {
          const batch = duplicatesToDelete.slice(i, i + BATCH_SIZE);
          
          const { error: deleteError } = await supabase
            .from("knowledge_chunks")
            .delete()
            .in("id", batch);

          if (deleteError) {
            console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
          } else {
            totalDeleted += batch.length;
            console.log(`   ✅ Deleted ${batch.length} duplicate chunks`);
          }

          // Small delay between batches
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   📊 Total duplicates found: ${totalDuplicates}`);
    console.log(`   🗑️  Total deleted: ${totalDeleted}`);
    console.log(`   📄 Documents processed: ${chunksByDocument.size}`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

cleanupDuplicateChunks();
