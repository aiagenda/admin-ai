/**
 * Script to generate embeddings for knowledge base documents
 * 
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 * 
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)
 *   - OPENAI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error("Missing required environment variables:");
  console.error("- VITE_SUPABASE_URL or SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  console.error("- OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Chunk text into smaller pieces with overlap
 */
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
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
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embedding API error: ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Process a single knowledge document
 */
async function processDocument(documentId: string) {
  console.log(`\nProcessing document ${documentId}...`);

  // Get document
  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    console.error(`Error fetching document: ${docError?.message}`);
    return;
  }

  console.log(`Document: ${doc.title}`);

  // Check if chunks already exist
  const { data: existingChunks } = await supabase
    .from("knowledge_chunks")
    .select("id, chunk_index, embedding")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (!existingChunks || existingChunks.length === 0) {
    console.log(`⚠️  Document has no chunks. Please run kb:import first to create chunks.`);
    return;
  }

  // Check if embeddings already exist
  const chunksWithEmbeddings = existingChunks.filter((c: any) => c.embedding !== null);
  if (chunksWithEmbeddings.length === existingChunks.length) {
    console.log(`⚠️  Document already has embeddings for all ${existingChunks.length} chunks. Skipping...`);
    return;
  }

  console.log(`Found ${existingChunks.length} chunks, ${chunksWithEmbeddings.length} already have embeddings.`);
  
  // Get chunk texts from database
  const { data: chunkData, error: chunkDataError } = await supabase
    .from("knowledge_chunks")
    .select("chunk_text, chunk_index, embedding")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  if (chunkDataError || !chunkData || chunkData.length === 0) {
    console.error(`Error fetching chunks: ${chunkDataError?.message}`);
    return;
  }

  const chunks = chunkData.map((c: any) => ({
    text: c.chunk_text,
    index: c.chunk_index,
    hasEmbedding: c.embedding !== null,
  }));

  console.log(`Found ${chunks.length} chunks, ${chunks.filter((c: any) => !c.hasEmbedding).length} need embeddings`);

  // Filter chunks that need embeddings
  const chunksNeedingEmbeddings = chunks.filter((c: any) => !c.hasEmbedding);
  
  if (chunksNeedingEmbeddings.length === 0) {
    console.log("All chunks already have embeddings!");
    return;
  }

  // Generate embeddings and update chunks in batches
  const BATCH_SIZE = 2; // Process 2 chunks at a time to avoid memory issues
  
  for (let batchStart = 0; batchStart < chunksNeedingEmbeddings.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, chunksNeedingEmbeddings.length);
    const batch = chunksNeedingEmbeddings.slice(batchStart, batchEnd);
    
    console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunksNeedingEmbeddings.length / BATCH_SIZE)} (${batch.length} chunks)...`);
    
    for (const chunk of batch) {
      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.text);
        const embeddingStr = `[${embedding.join(",")}]`;

        // Update existing chunk with embedding
        const { error: updateError } = await supabase
          .from("knowledge_chunks")
          .update({
            embedding: embeddingStr,
          })
          .eq("document_id", documentId)
          .eq("chunk_index", chunk.index);

        if (updateError) {
          console.error(`Error updating chunk ${chunk.index + 1}:`, updateError.message);
        } else {
          console.log(`✅ Chunk ${chunk.index + 1} processed`);
        }

        // Rate limiting: wait 300ms between requests
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error: any) {
        console.error(`Error processing chunk ${chunk.index + 1}:`, error.message);
      }
    }
    
    // Longer delay between batches to allow memory cleanup
    if (batchEnd < chunksNeedingEmbeddings.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Update document embedding (use first chunk's embedding or generate new one)
  // Skip for now to save memory - can be done later if needed
  console.log("⚠️  Document-level embedding skipped (can be generated later if needed)");

  console.log(`✅ Document ${documentId} processing complete`);
}

/**
 * Main function
 */
async function main() {
  console.log("Starting embedding generation...\n");

  // Get all documents without embeddings or with empty chunks
  const { data: documents, error } = await supabase
    .from("knowledge_documents")
    .select("id, title")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents:", error.message);
    process.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log("No knowledge documents found. Please add documents first.");
    process.exit(0);
  }

  console.log(`Found ${documents.length} documents to process\n`);

  // Process each document
  for (const doc of documents) {
    await processDocument(doc.id);
  }

  console.log("\n✅ Embedding generation complete!");
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

