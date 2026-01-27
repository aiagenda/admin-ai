/**
 * Script to create chunks for existing knowledge base documents
 * that don't have chunks yet.
 * 
 * Usage:
 *   npx tsx scripts/create-chunks-for-existing.ts
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

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const MAX_CONTENT_LENGTH = 30000;

function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());
    start = end - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

async function processDocument(docId: string, title: string, content: string) {
  console.log(`\n📄 Processing: ${title}`);
  
  // Check if chunks already exist
  const { data: existingChunks } = await supabase
    .from("knowledge_chunks")
    .select("id")
    .eq("document_id", docId)
    .limit(1);

  if (existingChunks && existingChunks.length > 0) {
    console.log(`   ✓ Already has chunks, skipping...`);
    return;
  }

  // Truncate content early to save memory
  const truncatedContent = content.slice(0, MAX_CONTENT_LENGTH);
  console.log(`   📝 Content length: ${truncatedContent.length} characters`);
  
  // Incremental chunking - process one chunk at a time to avoid memory issues
  let chunkIndex = 0;
  let start = 0;
  const totalLength = truncatedContent.length;
  let created = 0;
  
  // First, count how many chunks we'll create (without storing them)
  let tempStart = 0;
  let estimatedChunks = 0;
  while (tempStart < totalLength) {
    const end = Math.min(tempStart + CHUNK_SIZE, totalLength);
    estimatedChunks++;
    const oldTempStart = tempStart;
    tempStart = end - CHUNK_OVERLAP;
    
    // Fix: Prevent infinite loop - if tempStart didn't advance, we've reached the end
    if (tempStart <= oldTempStart && tempStart < totalLength) {
      break;
    }
  }
  console.log(`   🔪 Will create approximately ${estimatedChunks} chunks (processing incrementally)`);
  
  // Process and insert chunks one at a time
  const INSERT_BATCH_SIZE = 2; // Insert 2 chunks at a time
  let batchInserts: any[] = [];
  
  while (start < totalLength) {
    const end = Math.min(start + CHUNK_SIZE, totalLength);
    const chunk = truncatedContent.slice(start, end).trim();
    
    if (chunk.length > 0) {
      batchInserts.push({
        document_id: docId,
        chunk_text: chunk,
        chunk_index: chunkIndex,
        embedding: null,
        metadata: {
          chunk_size: chunk.length,
          total_chunks: estimatedChunks,
        },
      });
      chunkIndex++;
    }
    
    // Fix: If we've reached the end, don't calculate new start - just break after inserting
    if (end >= totalLength) {
      // Insert remaining batch before breaking
      if (batchInserts.length > 0) {
        const { error } = await supabase.from("knowledge_chunks").insert(batchInserts);
        if (!error) created += batchInserts.length;
      }
      break;
    }
    
    start = end - CHUNK_OVERLAP;
    
    // Insert batch when it reaches the batch size
    if (batchInserts.length >= INSERT_BATCH_SIZE) {
      if (batchInserts.length > 0) {
        const { error } = await supabase.from("knowledge_chunks").insert(batchInserts);
        
        if (error) {
          console.error(`   ❌ Error inserting chunks: ${error.message}`);
        } else {
          created += batchInserts.length;
          console.log(`   ✅ Saved ${created}/${estimatedChunks} chunks`);
        }
        
        // Clear batch to free memory immediately
        batchInserts = [];
        
        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`   ✅ Created ${created} chunks for ${title}`);
}

async function main() {
  console.log("🚀 Creating chunks for existing documents...\n");

  // Get all documents
  const { data: documents, error } = await supabase
    .from("knowledge_documents")
    .select("id, title, content")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error.message);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log("No documents found.");
    process.exit(0);
  }

  console.log(`Found ${documents.length} documents\n`);

  // Process each document
  for (const doc of documents) {
    await processDocument(doc.id, doc.title, doc.content);
  }

  console.log("\n✅ Chunk creation complete!");
  console.log("\nNext step: Run 'npm run kb:embeddings' to generate embeddings for the chunks.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

