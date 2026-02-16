import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type AnalysisResult = {
  simple_summary: string; // Includes real-life example (e.g., "Ez olyan, mint amikor Józsi...")
  legal_summary: string; // Professional legal interpretation, NO examples
  todo_simple: string[]; // Simple, everyday language steps
  todo_legal: string[]; // Professional legal action items
  deadlines: string[]; // Array of dates in YYYY-MM-DD format
  deadline_descriptions?: string[]; // Optional: original date descriptions (e.g., "2 hét múlva")
  severity: "info" | "action_needed" | "urgent";
  bank_account: string | null;
  amount: string | null;
  recipient_name: string | null;
  detected_category?: string | null; // Auto-detected category
  detected_tags?: string[] | null; // Auto-detected tags
  mentioned_laws?: string[] | null; // Explicit law references found in document (e.g., ["Art. 123. §", "Áfa tv. 55. §"])
  doc_type?: string | null; // Document type for playbook matching (e.g., "nav_missing_info", "nav_fine", "execution")
  issuer?: string | null; // Document issuer (e.g., "NAV", "bíróság", "önkormányzat")
  // Legacy fields for backward compatibility
  what_is_it?: string;
  what_to_do?: string[] | string;
  deadline?: string | null;
};

/**
 * Extract text from PDF using pdfjs-serverless (Deno-compatible, no workers needed)
 * This works for text-based PDFs
 */
async function extractTextWithPdfJs(uint8Array: Uint8Array): Promise<string> {
  try {
    // Use pdfjs-serverless - designed for Deno/serverless (no workers needed)
    const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.3.0");
    const { getDocument } = pdfjs;
    
    const pdf = await getDocument({ data: uint8Array }).promise;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ");
      if (pageText.trim()) {
        textParts.push(pageText.trim());
      }
    }

    const fullText = textParts.join("\n\n").trim();
    if (!fullText || fullText.length === 0) {
      throw new Error("PDF contains no extractable text (may be image-based)");
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF.js text extraction error:", error);
    throw error;
  }
}

/**
 * Convert PDF pages to images using pdfjs-serverless (Deno-compatible, no workers)
 * Extracts embedded images from PDF pages for OCR
 * Note: This works for scanned PDFs with embedded images
 */
async function convertPdfPagesToImages(uint8Array: Uint8Array): Promise<string[]> {
  try {
    // Use pdfjs-serverless - designed for Deno/serverless (no workers needed)
    const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.3.0");
    const { getDocument } = pdfjs;
    
    const pdf = await getDocument({ data: uint8Array }).promise;
    const imageBase64Array: string[] = [];
    const maxPages = 10; // Limit to prevent excessive processing
    
    console.log(`PDF has ${pdf.numPages} page(s), extracting images from first ${Math.min(pdf.numPages, maxPages)}`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages && pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Try to extract embedded images from the page
        // This works for scanned PDFs that contain embedded images
        const opList = await page.getOperatorList();
        const resources = (opList as any).resources;
        
        let imageFound = false;
        if (resources) {
          const xObjects = (resources as any).get?.("XObject");
          if (xObjects) {
            for (const [name, xObject] of xObjects.entries()) {
              if (xObject && (xObject as any).subtype === "Image") {
                try {
                  const imgData = await (xObject as any).getImageData();
                  if (imgData && imgData.data) {
                    const imageBytes = new Uint8Array(imgData.data);
                    const base64 = btoa(String.fromCharCode(...imageBytes));
                    imageBase64Array.push(`data:image/png;base64,${base64}`);
                    imageFound = true;
                    console.log(`✅ Extracted image from page ${pageNum}`);
                    break; // Use first image found on page
                  }
                } catch (imgError) {
                  console.warn(`Failed to extract image from page ${pageNum}:`, imgError);
                }
              }
            }
          }
        }
        
        if (!imageFound) {
          console.warn(`Page ${pageNum} has no embedded images - this page may not be processable via OCR`);
        }
      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError);
      }
    }
    
    if (imageBase64Array.length === 0) {
      throw new Error(
        "No embedded images found in PDF. " +
        "This PDF may be text-based (should use text extraction) or may require a different conversion method. " +
        "Scanned PDFs typically contain embedded images that can be extracted."
      );
    }
    
    console.log(`✅ Extracted ${imageBase64Array.length} image(s) from PDF`);
    return imageBase64Array;
  } catch (error) {
    console.error("PDF to image conversion error:", error);
    throw new Error(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get OCR improvements based on user feedback
 * Analyzes patterns in OCR feedback to refine the OCR prompt
 */
async function getOCRImprovements(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  try {
    // Get recent OCR feedback with corrections
    const { data: feedbackData, error } = await supabase
      .from("ocr_feedback")
      .select("handwritten_numbers_detected, handwritten_numbers_correct, ocr_accuracy, feedback_comment, correct_amount, correct_bank_account, extracted_amount, extracted_bank_account")
      .eq("handwritten_numbers_detected", true)
      .in("ocr_accuracy", ["fair", "poor"])
      .limit(20); // Get recent poor/fair accuracy feedback

    if (error || !feedbackData || feedbackData.length === 0) {
      return ""; // No feedback to learn from
    }

    // Analyze patterns
    const corrections: string[] = [];
    const commonMistakes: string[] = [];

    feedbackData.forEach((feedback) => {
      // If there was a correction, note the pattern
      if (feedback.handwritten_numbers_correct === false) {
        if (feedback.correct_amount && feedback.extracted_amount) {
          corrections.push(`Amount: "${feedback.extracted_amount}" → "${feedback.correct_amount}"`);
        }
        if (feedback.correct_bank_account && feedback.extracted_bank_account) {
          corrections.push(`Bank account: "${feedback.extracted_bank_account}" → "${feedback.correct_bank_account}"`);
        }
      }

      // Collect common mistakes from comments
      if (feedback.feedback_comment) {
        const comment = feedback.feedback_comment.toLowerCase();
        if (comment.includes("0") || comment.includes("o")) {
          commonMistakes.push("0 vs O confusion");
        }
        if (comment.includes("1") || comment.includes("i") || comment.includes("l")) {
          commonMistakes.push("1 vs I vs L confusion");
        }
        if (comment.includes("5") || comment.includes("s")) {
          commonMistakes.push("5 vs S confusion");
        }
        if (comment.includes("6") || comment.includes("g")) {
          commonMistakes.push("6 vs G confusion");
        }
      }
    });

    if (corrections.length === 0 && commonMistakes.length === 0) {
      return ""; // No patterns to learn from
    }

    // Build improvement instructions
    let improvements = "\n\nIMPORTANT: Based on user feedback, pay EXTRA attention to these common handwritten number recognition issues:\n";
    
    if (commonMistakes.length > 0) {
      const uniqueMistakes = Array.from(new Set(commonMistakes));
      improvements += `- Common character confusions: ${uniqueMistakes.join(", ")}\n`;
      improvements += "- When in doubt, use context clues (e.g., bank account numbers follow specific patterns, amounts are usually in HUF)\n";
    }

    if (corrections.length > 0) {
      improvements += `- Recent corrections suggest these patterns (learn from them):\n`;
      corrections.slice(0, 3).forEach((correction) => {
        improvements += `  * ${correction}\n`;
      });
    }

    improvements += "- Double-check every handwritten digit, especially in amounts and bank account numbers\n";
    improvements += "- If a digit is ambiguous, try to infer from context (e.g., typical Hungarian bank account format, reasonable amount ranges)\n";

    console.log(`✅ Applied OCR improvements based on ${feedbackData.length} feedback entries`);
    return improvements;
  } catch (error) {
    console.warn("Failed to get OCR improvements:", error);
    return ""; // Fail silently
  }
}

/**
 * Extract text using OpenAI Vision API (OCR)
 * This is the most accurate method for scanned PDFs
 */
async function extractTextWithVisionOCR(
  imageBase64Array: string[], 
  openaiApiKey: string,
  supabase?: ReturnType<typeof createClient>
): Promise<string> {
  try {
    const textParts: string[] = [];
    const maxPages = 10; // Limit to prevent excessive costs
    const pagesToProcess = Math.min(imageBase64Array.length, maxPages);

    if (imageBase64Array.length > maxPages) {
      console.warn(`PDF has ${imageBase64Array.length} pages, processing first ${maxPages} to limit costs`);
    }

    // Process each page image with OpenAI Vision API
    for (let i = 0; i < pagesToProcess; i++) {
      const imageBase64 = imageBase64Array[i];
      
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: await (async () => {
                      // Base OCR prompt
                      let ocrPrompt = `Extract all text from this Hungarian administrative document image. 
Pay special attention to HANDWRITTEN NUMBERS:
- Amounts (összeg) may be handwritten - extract them carefully, digit by digit
- Bank account numbers (bankszámlaszám) may contain handwritten digits - be very careful with similar-looking characters (0 vs O, 1 vs I, 5 vs S, 6 vs G)
- Dates may be handwritten - extract them in YYYY-MM-DD format
- When in doubt about a handwritten digit, try to identify it based on context

Preserve formatting, dates, amounts, account numbers, and all details exactly as shown. Return only the extracted text, no analysis.`;

                      // Add learned improvements if supabase client is available
                      if (supabase) {
                        const ocrImprovements = await getOCRImprovements(supabase);
                        if (ocrImprovements) {
                          ocrPrompt += ocrImprovements;
                        }
                      }

                      return ocrPrompt;
                    })(),
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageBase64,
                    },
                  },
                ],
              },
            ],
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get("retry-after");
            throw new Error(`OpenAI API rate limit exceeded. Retry after ${retryAfter || "some time"} seconds.`);
          }
          
          const errorText = await response.text();
          throw new Error(`OpenAI Vision API error for page ${i + 1}: ${errorText}`);
        }

        const data = await response.json();
        const extractedText = data.choices?.[0]?.message?.content;
        
        if (extractedText) {
          textParts.push(extractedText);
          console.log(`Page ${i + 1}/${pagesToProcess}: Extracted ${extractedText.length} characters`);
        } else {
          console.warn(`Page ${i + 1}: No text extracted from image`);
        }
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        if (i === 0 && textParts.length === 0) {
          throw pageError;
        }
      }
    }

    const fullText = textParts.join("\n\n").trim();
    if (!fullText || fullText.length === 0) {
      throw new Error("Vision OCR extracted no text from any pages");
    }

    console.log(`✅ Vision OCR: Extracted ${fullText.length} characters from ${textParts.length}/${pagesToProcess} page(s)`);
    return fullText;
  } catch (error) {
    console.error("Vision OCR error:", error);
    throw new Error(`Failed to extract text using Vision OCR: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Convert relative date strings to YYYY-MM-DD format
 * Handles Hungarian relative dates like "2 hét múlva", "következő hónap", etc.
 */
function parseRelativeDate(dateStr: string): string | null {
  const today = new Date();
  const lowerStr = dateStr.toLowerCase().trim();
  
  // Hungarian relative date patterns
  const patterns: Array<[RegExp, (match: RegExpMatchArray) => Date]> = [
    // "X nap múlva" / "X napon belül"
    [/^(\d+)\s*(nap|napot|napra)\s*(múlva|belül|később)$/i, (m) => {
      const days = parseInt(m[1]);
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date;
    }],
    // "X hét múlva" / "X héten belül"
    [/^(\d+)\s*(hét|hetet|hétre)\s*(múlva|belül|később)$/i, (m) => {
      const weeks = parseInt(m[1]);
      const date = new Date(today);
      date.setDate(date.getDate() + (weeks * 7));
      return date;
    }],
    // "X hónap múlva" / "X hónapon belül"
    [/^(\d+)\s*(hónap|hónapot|hónapra)\s*(múlva|belül|később)$/i, (m) => {
      const months = parseInt(m[1]);
      const date = new Date(today);
      date.setMonth(date.getMonth() + months);
      return date;
    }],
    // "következő hét" / "jövő hét"
    [/^(következő|jövő)\s*(hét|hetet)$/i, () => {
      const date = new Date(today);
      const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilMonday);
      return date;
    }],
    // "következő hónap" / "jövő hónap"
    [/^(következő|jövő)\s*(hónap|hónapot)$/i, () => {
      const date = new Date(today);
      date.setMonth(date.getMonth() + 1);
      date.setDate(1); // First day of next month
      return date;
    }],
    // "holnap"
    [/^holnap$/i, () => {
      const date = new Date(today);
      date.setDate(date.getDate() + 1);
      return date;
    }],
    // "jövő hét hétfője" / "jövő hét pénteke"
    [/^jövő\s*(?:hét|hetet)\s*(hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap)(?:je)?$/i, (m) => {
      const dayNames = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
      const targetDay = dayNames.indexOf(m[1]);
      const date = new Date(today);
      const daysUntilTarget = (targetDay + 7 - date.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilTarget);
      return date;
    }],
  ];
  
  // Try to match patterns
  for (const [pattern, converter] of patterns) {
    const match = lowerStr.match(pattern);
    if (match) {
      try {
        const date = converter(match);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch (e) {
        console.warn(`Failed to parse relative date: ${dateStr}`, e);
      }
    }
  }
  
  // Try to parse as absolute date (YYYY-MM-DD, DD.MM.YYYY, etc.)
  try {
    // Try ISO format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return dateStr;
      }
    }
    
    // Try DD.MM.YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  } catch (e) {
    console.warn(`Failed to parse date: ${dateStr}`, e);
  }
  
  return null;
}

/**
 * Normalize deadlines array - convert relative dates to absolute dates
 */
function normalizeDeadlines(deadlines: string[]): string[] {
  const normalized: string[] = [];
  const today = new Date();
  
  for (const deadline of deadlines) {
    if (!deadline || deadline.trim() === "") continue;
    
    // Try to parse as relative date
    const parsed = parseRelativeDate(deadline);
    if (parsed) {
      normalized.push(parsed);
    } else {
      // If parsing fails, try to extract date from the string
      // This handles cases like "2024. január 15." or "2024-01-15"
      const dateMatch = deadline.match(/(\d{4})[.\-]?\s*(\d{1,2})[.\-]?\s*(\d{1,2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        try {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            normalized.push(date.toISOString().split('T')[0]);
          }
        } catch (e) {
          console.warn(`Failed to normalize deadline: ${deadline}`, e);
        }
      }
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(normalized)].sort();
}

/**
 * Detect document language using OpenAI (simple detection)
 */
async function detectLanguage(text: string, openaiApiKey: string): Promise<string> {
  try {
    // Use a small sample of text for language detection
    const sample = text.slice(0, 500);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Detect the language of the following text. Respond with ONLY the ISO 639-1 language code (e.g., 'hu' for Hungarian, 'en' for English, 'de' for German, 'ro' for Romanian, 'sk' for Slovak). If uncertain, default to 'hu'.",
          },
          {
            role: "user",
            content: sample,
          },
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.warn("Language detection failed, defaulting to Hungarian");
      return "hu";
    }

    const data = await response.json();
    const detectedLang = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "hu";
    
    // Validate language code (common European languages)
    const validLanguages = ["hu", "en", "de", "ro", "sk", "cs", "pl", "hr", "sr", "sl"];
    return validLanguages.includes(detectedLang) ? detectedLang : "hu";
  } catch (error) {
    console.warn("Language detection error, defaulting to Hungarian:", error);
    return "hu";
  }
}

/**
 * Search knowledge base using vector similarity
 * Returns relevant chunks based on document text and category
 * Includes caching and relevance threshold optimization
 */
async function searchKnowledgeBase(
  queryText: string,
  category: string | null,
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  limit: number = 5
): Promise<Array<{ chunk_text: string; document_title: string; similarity: number }>> {
  try {
    // Generate embedding for the query text
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: queryText.slice(0, 8000), // Limit input length
      }),
    });

    if (!embeddingResponse.ok) {
      console.warn("Failed to generate embedding for KB search");
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.warn("Invalid embedding response");
      return [];
    }

    // Convert to PostgreSQL vector format: [0.1, 0.2, ...]
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Search knowledge base using RPC function
    const { data, error } = await supabase.rpc("search_knowledge_base", {
      _query_embedding: vectorString,
      _category: category,
      _limit: limit * 2, // Get more results for filtering
    });

    if (error) {
      console.warn("Knowledge base search error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No relevant knowledge base chunks found");
      return [];
    }

    // Filter by relevance threshold (cosine similarity > 0.7)
    const relevantChunks = data
      .filter((item: any) => item.similarity > 0.7)
      .slice(0, limit)
      .map((item: any) => ({
        chunk_text: item.chunk_text,
        document_title: item.document_title,
        similarity: item.similarity,
      }));

    if (relevantChunks.length === 0) {
      console.log("No chunks above relevance threshold (0.7)");
      return [];
    }

    console.log(`✅ Found ${relevantChunks.length} relevant KB chunks (similarity > 0.7)`);
    return relevantChunks;
  } catch (error) {
    console.warn("Knowledge base search failed:", error);
    return []; // Fail silently, don't break the analysis
  }
}

/**
 * Get relevant context from knowledge base
 * Combines multiple chunks into a coherent context string
 */
async function getRelevantContext(
  documentText: string,
  category: string | null,
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<string> {
  try {
    // Use a sample of the document text for search (first 2000 characters)
    const searchQuery = documentText.slice(0, 2000);
    
    console.log("Searching knowledge base for relevant context...");
    const chunks = await searchKnowledgeBase(searchQuery, category, supabase, openaiApiKey, 5);

    if (chunks.length === 0) {
      console.log("ℹ️ No relevant knowledge base context found");
      return "";
    }

    console.log(`✅ Found ${chunks.length} relevant knowledge base chunks`);

    // Combine chunks into context
    const contextParts = chunks.map((chunk, index) => {
      return `[Forrás ${index + 1}: ${chunk.document_title}]\n${chunk.chunk_text}`;
    });

    const context = contextParts.join("\n\n---\n\n");

    return `\n\nRELEVANT OFFICIAL INFORMATION FROM KNOWLEDGE BASE:\n${context}\n\nUse this official information to provide accurate, non-misleading instructions. If the information contradicts the document, prioritize the official knowledge base information.`;
  } catch (error) {
    console.warn("Failed to get relevant context:", error);
    return ""; // Fail silently
  }
}

/**
 * Enhance prompt with knowledge base context
 */
function enhancePromptWithKB(basePrompt: string, kbContext: string): string {
  if (!kbContext || kbContext.trim() === "") {
    return basePrompt;
  }

  // Insert KB context before the important rules section
  const rulesIndex = basePrompt.indexOf("FONTOS SZABÁLYOK:");
  if (rulesIndex !== -1) {
    return basePrompt.slice(0, rulesIndex) + kbContext + "\n\n" + basePrompt.slice(rulesIndex);
  }

  // If no rules section, append at the end
  return basePrompt + kbContext;
}

/**
 * Get feedback-based improvements for prompts
 * Analyzes negative feedback to improve AI responses
 */
async function getFeedbackImprovements(
  supabase: ReturnType<typeof createClient>,
  category: string | null,
  language: string
): Promise<string> {
  try {
    // Get negative feedback from similar documents (same category)
    let feedbackQuery = supabase
      .from("analysis_feedback")
      .select("feedback_type, comment, summary_type")
      .in("feedback_type", ["not_helpful", "confusing"])
      .limit(50); // Limit to recent feedback

    // If we have a category, try to get feedback from similar documents
    // Note: We can't directly filter by category, so we'll get general feedback
    // In a production system, you'd join with documents/analyses tables
    
    const { data: feedbackData, error } = await feedbackQuery;
    
    if (error || !feedbackData || feedbackData.length === 0) {
      return ""; // No feedback to learn from
    }

    // Analyze feedback patterns
    const confusingCount = feedbackData.filter(f => f.feedback_type === "confusing").length;
    const notHelpfulCount = feedbackData.filter(f => f.feedback_type === "not_helpful").length;
    const totalNegative = feedbackData.length;
    
    // Get common issues from comments
    const comments = feedbackData
      .filter(f => f.comment && f.comment.trim().length > 0)
      .map(f => f.comment)
      .slice(0, 10); // Limit to 10 most recent comments

    // Build improvement suggestions
    const improvements: string[] = [];

    if (confusingCount > totalNegative * 0.4) {
      // More than 40% of negative feedback is "confusing"
      improvements.push("CRITICAL: Many users find the explanations confusing. Make the simple_summary even simpler and more straightforward. Use shorter sentences and avoid complex legal terms.");
    }

    if (notHelpfulCount > totalNegative * 0.4) {
      // More than 40% of negative feedback is "not_helpful"
      improvements.push("CRITICAL: Many users find the analysis not helpful. Provide more actionable and specific information. Include concrete steps and examples.");
    }

    // Analyze comments for specific issues
    if (comments.length > 0) {
      const commentText = comments.join(" ").toLowerCase();
      
      if (commentText.includes("túl bonyolult") || commentText.includes("too complex") || commentText.includes("zu kompliziert")) {
        improvements.push("Users report explanations are too complex. Simplify language and use everyday terms.");
      }
      
      if (commentText.includes("nem elég részletes") || commentText.includes("not detailed enough") || commentText.includes("nicht detailliert genug")) {
        improvements.push("Users want more detailed information. Provide more comprehensive explanations.");
      }
      
      if (commentText.includes("nem érthető") || commentText.includes("not clear") || commentText.includes("nicht klar")) {
        improvements.push("Users find explanations unclear. Use clearer language and structure.");
      }
    }

    if (improvements.length === 0) {
      return "";
    }

    return `\n\nFEEDBACK-BASED IMPROVEMENTS (apply these to improve user satisfaction):\n${improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n")}\n`;
  } catch (error) {
    console.warn("Failed to get feedback improvements:", error);
    return ""; // Fail silently, don't break the analysis
  }
}

/**
 * Get language-specific prompt instructions
 */
function getLanguagePrompt(language: string, todayStr: string): string {
  const languagePrompts: Record<string, string> = {
    hu: `You are an expert Hungarian administrative assistant. Analyze the provided document text and respond strictly with JSON containing:

{
  "simple_summary": "TEGEZŐ, barátias, közvetlen magyarázat magyar nyelven – mintha egy jó barátod magyarázná el, aki segíteni akar. SOHA ne magázz (ne használj Ön/Önnek szavakat), mindig tegezz (te/neked/nálad). Legyen emberi, támogató hangnem. FONTOS: Ha a dokumentum KONKRÉT, SZEMÉLYRE SZÓLÓ ügy (pl. felszólítás, értesítés, határozat neked címezve), akkor NE használj 'Képzeld el' vagy hasonló példa-bevezetőt – egyszerűen magyarázd el közvetlenül, mi a helyzeted és mit kell tenned. Példát CSAK akkor adj, ha a dokumentum általános tájékoztató jellegű és a példa segít megérteni az absztrakt fogalmakat.",
  "legal_summary": "Professzionális jogi értelmezés magyar nyelven, TILOS benne példa vagy mindennapi nevek. Csak tiszta, szakmai jogi leírás a dokumentum jogi tartalmáról.",
  "todo_simple": ["egyszerű lépés 1", "egyszerű lépés 2"],
  "todo_legal": ["jogi lépés 1", "jogi lépés 2"],
  "deadlines": ["YYYY-MM-DD"] vagy [] ha nincs határidő,
  "deadline_descriptions": ["relatív vagy abszolút dátum leírás"] vagy [] - opcionális,
  "severity": "info" | "action_needed" | "urgent",
  "bank_account": "string vagy null",
  "amount": "string vagy null",
  "recipient_name": "string vagy null",
  "detected_category": "adozas" | "egeszsegugy" | "oktatas" | "szocialis" | "kozlekedes" | "ingatlan" | "uzlet" | "egyeb" vagy null,
  "detected_tags": ["tag1", "tag2"] vagy [] ha nincs tag,
  "mentioned_laws": ["Art. 123. §", "Áfa tv. 55. §"] vagy [] - a dokumentumban EXPLICIT említett jogszabályok és paragrafusok,
  "doc_type": "nav_missing_info" | "nav_fine" | "nav_payment_demand" | "execution" | "official_decision" | "invoice" | "unknown",
  "issuer": "NAV" | "bíróság" | "önkormányzat" | "bank" | "közmű" | "egyéb" vagy null
}

FONTOS SZABÁLYOK:
1. simple_summary: MINDIG TEGEZZ, soha ne magázz! Írj barátias, közvetlen stílusban, mintha egy jó haveroddal beszélnél. KRITIKUS: Ha a dokumentum KONKRÉT személyre szóló ügy (fizetési felszólítás, adóellenőrzés értesítő, határozat, stb.), akkor NE írj "Képzeld el" vagy "Például" bevezetőt – egyszerűen mondd el közvetlenül, mi történik és mit kell tennie. Példát CSAK általános tájékoztató dokumentumoknál adj, ahol segít megérteni az absztrakt fogalmakat. A magyarázat legyen emberi, támogató, kerüld a hivatalos megfogalmazásokat!
2. legal_summary SOHA ne tartalmaz példát vagy mindennapi neveket, csak professzionális jogi értelmezés.
3. deadlines: tömb formátumban YYYY-MM-DD formátumban. Ha a dokumentumban relatív dátum van (pl. "2 hét múlva", "következő hónap"), számold ki a pontos dátumot a mai dátumhoz képest (ma: ${todayStr}).
4. detected_category: válassz egyet a következők közül: "adozas", "egeszsegugy", "oktatas", "szocialis", "kozlekedes", "ingatlan", "uzlet", "egyeb" vagy null.
5. mentioned_laws: ha a dokumentumban EXPLICIT jogszabály hivatkozás van (pl. "Art. 123. §", "2017. évi CL. törvény", "Áfa tv.", "Ákr.", "Vht."), írd ki őket ebbe a tömbbe. Ha nincs, üres tömb [].
6. doc_type: válaszd ki a dokumentum típusát: "nav_missing_info" (NAV hiánypótlás), "nav_fine" (NAV bírság/pótlék), "nav_payment_demand" (NAV fizetési felszólítás), "execution" (végrehajtás), "official_decision" (hatósági határozat), "invoice" (számla), "unknown" (ismeretlen).
7. issuer: ki küldte a dokumentumot? "NAV", "bíróság", "önkormányzat", "bank", "közmű", "egyéb" vagy null.
8. FIZETÉSI ADATOK SZABÁLYA: A "bank_account", "amount" és "recipient_name" mezőket CSAK akkor töltsd ki, ha a dokumentum TÉNYLEGES FIZETÉSI KÖTELEZETTSÉGET tartalmaz (pl. számla, bírság, felszólítás fizetésre, tartozás). Ha a dokumentum csak TÁJÉKOZTATÁS vagy ÉRTESÍTÉS (pl. végrehajtási jog törlése, jogosultság igazolása, státusz értesítés), akkor ezek a mezők legyenek NULL. A "recipient_name" SOHA ne legyen kitöltve önmagában - csak akkor, ha van mellette "bank_account" VAGY "amount" is.`,
    
    en: `You are an expert administrative assistant. Analyze the provided document text and respond strictly with JSON containing:

{
  "simple_summary": "Simple but not oversimplified explanation in English. Include a short, relatable example with everyday names – always in PRESENT TENSE (not past). VARY the opening of the example: e.g. 'Here is an example:', 'Imagine that', 'For example:', 'An everyday example:', 'Picture this:' – do not always use the same phrase. Then describe the situation (e.g. Mary has a debt…, she can choose to…). Do not use past tense in the example (not: owed, paid, sent).",
  "legal_summary": "Professional legal interpretation in English, NO examples or everyday names. Only clean, professional legal description of the document's legal content.",
  "todo_simple": ["simple step 1", "simple step 2"],
  "todo_legal": ["legal step 1", "legal step 2"],
  "deadlines": ["YYYY-MM-DD"] or [] if no deadline,
  "deadline_descriptions": ["relative or absolute date description"] or [] - optional,
  "severity": "info" | "action_needed" | "urgent",
  "bank_account": "string or null",
  "amount": "string or null",
  "recipient_name": "string or null",
  "detected_category": "tax" | "healthcare" | "education" | "social" | "transport" | "property" | "business" | "other" or null,
  "detected_tags": ["tag1", "tag2"] or [] if no tags,
  "mentioned_laws": ["Art. 123. §", "VAT Act 55. §"] or [] - EXPLICIT law references found in the document,
  "doc_type": "nav_missing_info" | "nav_fine" | "nav_payment_demand" | "execution" | "official_decision" | "invoice" | "unknown",
  "issuer": "tax_authority" | "court" | "municipality" | "bank" | "utility" | "other" or null
}

IMPORTANT RULES:
1. simple_summary: Always write the example in PRESENT TENSE (has debt, must pay, can request – NOT: owed, paid, sent). Vary the example opening (Here is an example: / Imagine that / For example: / An everyday example: / Picture this:). Keep it clear but not oversimplified; short, relatable example with everyday names (Mary, Peter, etc.).
2. legal_summary MUST NEVER include examples or everyday names, only professional legal interpretation.
3. deadlines: array format in YYYY-MM-DD. If the document contains relative dates (e.g., "2 weeks from now", "next month"), calculate the exact date relative to today (today: ${todayStr}).
4. detected_category: choose one from: "tax", "healthcare", "education", "social", "transport", "property", "business", "other" or null.
5. mentioned_laws: if the document EXPLICITLY references laws (e.g., "Art. 123. §", "Act CL of 2017", "VAT Act"), list them here. If none, empty array [].
6. doc_type: choose document type: "nav_missing_info" (missing info request), "nav_fine" (fine/penalty), "nav_payment_demand" (payment demand), "execution" (enforcement), "official_decision" (official decision), "invoice" (invoice), "unknown".
7. issuer: who sent the document? "tax_authority", "court", "municipality", "bank", "utility", "other" or null.
8. PAYMENT DATA RULE: Only fill "bank_account", "amount" and "recipient_name" if the document contains an ACTUAL PAYMENT OBLIGATION (e.g., invoice, fine, payment demand, debt). If the document is only INFORMATIONAL or a NOTIFICATION (e.g., removal of enforcement rights, eligibility confirmation, status update), these fields should be NULL. "recipient_name" should NEVER be filled alone - only if there is also "bank_account" OR "amount".`,
    
    de: `Sie sind ein Experte für Verwaltungsangelegenheiten. Analysieren Sie den bereitgestellten Dokumententext und antworten Sie strikt mit JSON:

{
  "simple_summary": "Einfache, aber nicht zu vereinfachende Erklärung auf Deutsch. Enthalte ein kurzes, nachvollziehbares Beispiel mit alltäglichen Namen – immer im PRÄSENS (nicht in der Vergangenheit). VARIERE die Einleitung des Beispiels: z.B. «Hier ein Beispiel:», «Stell dir vor, dass», «Ein Beispiel:», «Zum Beispiel:», «Stell dir zum Beispiel vor:» – nicht immer dieselbe Formulierung. Danach die Situation (z.B. Maria hat eine Schuld…, sie kann wählen…). Kein Präteritum im Beispiel (nicht: hatte, zahlte, sandte).",
  "legal_summary": "Professionelle rechtliche Interpretation auf Deutsch, KEINE Beispiele oder alltägliche Namen. Nur saubere, professionelle rechtliche Beschreibung des rechtlichen Inhalts des Dokuments.",
  "todo_simple": ["einfacher Schritt 1", "einfacher Schritt 2"],
  "todo_legal": ["rechtlicher Schritt 1", "rechtlicher Schritt 2"],
  "deadlines": ["YYYY-MM-DD"] oder [] wenn kein Termin,
  "deadline_descriptions": ["relative oder absolute Datumsbeschreibung"] oder [] - optional,
  "severity": "info" | "action_needed" | "urgent",
  "bank_account": "string oder null",
  "amount": "string oder null",
  "recipient_name": "string oder null",
  "detected_category": "steuern" | "gesundheitswesen" | "bildung" | "soziales" | "verkehr" | "immobilien" | "geschäft" | "sonstiges" oder null,
  "detected_tags": ["tag1", "tag2"] oder [] wenn keine Tags,
  "mentioned_laws": ["Art. 123. §", "UStG 55. §"] oder [] - EXPLIZIT im Dokument erwähnte Gesetze,
  "doc_type": "nav_missing_info" | "nav_fine" | "nav_payment_demand" | "execution" | "official_decision" | "invoice" | "unknown",
  "issuer": "finanzamt" | "gericht" | "gemeinde" | "bank" | "versorger" | "sonstiges" oder null
}

WICHTIGE REGELN:
1. simple_summary: Das Beispiel immer im PRÄSENS formulieren (hat Schulden, muss zahlen, kann beantragen – NICHT: hatte, zahlte, sandte). Die Beispieleinleitung variieren (Hier ein Beispiel: / Stell dir vor, dass / Ein Beispiel: / Zum Beispiel: / Stell dir zum Beispiel vor:). Klar, aber nicht zu vereinfacht; kurzes, nachvollziehbares Beispiel mit alltäglichen Namen (Maria, Peter, etc.).
2. legal_summary DARF NIEMALS Beispiele oder alltägliche Namen enthalten, nur professionelle rechtliche Interpretation.
3. deadlines: Array-Format in YYYY-MM-DD. Wenn das Dokument relative Daten enthält (z.B. "in 2 Wochen", "nächsten Monat"), berechnen Sie das genaue Datum relativ zu heute (heute: ${todayStr}).
4. detected_category: wählen Sie eine aus: "steuern", "gesundheitswesen", "bildung", "soziales", "verkehr", "immobilien", "geschäft", "sonstiges" oder null.
5. mentioned_laws: wenn das Dokument EXPLIZIT auf Gesetze verweist (z.B. "Art. 123. §", "Gesetz CL von 2017", "UStG"), listen Sie sie hier auf. Wenn keine, leeres Array [].
6. doc_type: wählen Sie Dokumenttyp: "nav_missing_info" (Fehlende Info), "nav_fine" (Strafe), "nav_payment_demand" (Zahlungsaufforderung), "execution" (Vollstreckung), "official_decision" (Behördenbescheid), "invoice" (Rechnung), "unknown".
7. issuer: wer hat das Dokument gesendet? "finanzamt", "gericht", "gemeinde", "bank", "versorger", "sonstiges" oder null.
8. ZAHLUNGSDATEN-REGEL: Füllen Sie "bank_account", "amount" und "recipient_name" NUR aus, wenn das Dokument eine TATSÄCHLICHE ZAHLUNGSPFLICHT enthält (z.B. Rechnung, Strafe, Zahlungsaufforderung, Schulden). Wenn das Dokument nur INFORMATIV oder eine BENACHRICHTIGUNG ist (z.B. Aufhebung von Vollstreckungsrechten, Berechtigungsbestätigung, Statusmeldung), sollten diese Felder NULL sein. "recipient_name" sollte NIEMALS allein ausgefüllt werden - nur wenn auch "bank_account" ODER "amount" vorhanden ist.`,
  };

  return languagePrompts[language] || languagePrompts.hu;
}

/**
 * Analyze extracted text using OpenAI GPT-4o
 */
async function analyzeWithOpenAI(
  text: string, 
  openaiApiKey: string,
  supabase?: ReturnType<typeof createClient>,
  category?: string | null
): Promise<AnalysisResult> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Detect document language
  console.log("Detecting document language...");
  const detectedLanguage = await detectLanguage(text, openaiApiKey);
  console.log(`✅ Detected language: ${detectedLanguage}`);
  
  // Get language-specific prompt
  let systemPrompt = getLanguagePrompt(detectedLanguage, todayStr);
  
  // Get relevant context from knowledge base
  let kbContext = "";
  if (supabase && openaiApiKey) {
    kbContext = await getRelevantContext(text, category || null, supabase, openaiApiKey);
    if (kbContext) {
      systemPrompt = enhancePromptWithKB(systemPrompt, kbContext);
      console.log("✅ Enhanced prompt with knowledge base context");
    }
  }
  
  // Learn from user feedback and improve prompt
  if (supabase) {
    console.log("Analyzing user feedback to improve prompts...");
    const feedbackImprovements = await getFeedbackImprovements(supabase, category || null, detectedLanguage);
    if (feedbackImprovements) {
      systemPrompt += feedbackImprovements;
      console.log("✅ Applied feedback-based improvements to prompt");
    } else {
      console.log("ℹ️ No feedback data available for improvements");
    }
  }
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Dokumentum szövege:\n\n${text.slice(0, 15000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI API returned empty content");
  }
  
  const result: AnalysisResult = JSON.parse(content);
  
  // Normalize deadlines - convert relative dates to absolute dates
  if (result.deadlines && result.deadlines.length > 0) {
    result.deadlines = normalizeDeadlines(result.deadlines);
  }
  
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Declare variables outside try block for error handler access
  let supabase: ReturnType<typeof createClient> | null = null;
  let documentIdForErrorHandling: string | undefined = undefined;

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || !body.document_id || !body.file_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: document_id and file_url are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { document_id, file_url } = body;
    documentIdForErrorHandling = document_id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error: missing Supabase credentials");
    }

    if (!openaiApiKey) {
      throw new Error("Server configuration error: missing OpenAI API key");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(file_url);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file: ${downloadError?.message ?? "Unknown error"}`);
    }

    // Determine file type from URL extension
    const fileExtension = file_url.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf' || !isImage; // Default to PDF if unknown

    let extractedText = "";
    let usedOCR = false;

    if (isImage) {
      // Handle image files - direct OCR processing
      console.log(`Processing image file (${fileExtension})...`);
      
      try {
        // Convert image blob to base64
        const arrayBuffer = await fileBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...uint8));
        
        // Determine MIME type
        let mimeType = 'image/jpeg';
        if (fileExtension === 'png') mimeType = 'image/png';
        else if (fileExtension === 'heic') mimeType = 'image/heic';
        
        const imageBase64 = `data:${mimeType};base64,${base64}`;
        
        console.log("Extracting text from image using OpenAI Vision OCR...");
        extractedText = await extractTextWithVisionOCR([imageBase64], openaiApiKey, supabase);
        usedOCR = true;
        console.log("✅ OCR extraction successful from image");
      } catch (ocrError) {
        console.error("OCR extraction from image failed:", ocrError);
        throw new Error(
          `Failed to extract text from image using OCR: ${ocrError instanceof Error ? ocrError.message : "Unknown"}`
        );
      }
    } else {
      // Handle PDF files - existing logic
      const arrayBuffer = await fileBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      
      // Strategy: Try text extraction first (fast, free), then fallback to OCR
      try {
        console.log("Attempting text extraction with pdfjs-serverless...");
        extractedText = await extractTextWithPdfJs(uint8);
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("PDF text extraction returned empty content");
        }
        console.log("✅ Text extracted successfully using pdfjs-serverless");
      } catch (textError) {
        console.warn("Text extraction failed, falling back to OCR:", textError);
        
        // Fallback: Convert PDF to images, then use OpenAI Vision OCR
        try {
          console.log("Converting PDF pages to images...");
          const pageImages = await convertPdfPagesToImages(uint8);
          console.log(`Converted ${pageImages.length} page(s) to images`);
          
          console.log("Extracting text using OpenAI Vision OCR...");
          extractedText = await extractTextWithVisionOCR(pageImages, openaiApiKey, supabase);
          usedOCR = true;
          console.log("✅ OCR extraction successful");
        } catch (ocrError) {
          console.error("OCR extraction also failed:", ocrError);
          throw new Error(
            `Failed to extract text from PDF using both methods. ` +
            `Text extraction error: ${textError instanceof Error ? textError.message : "Unknown"}. ` +
            `OCR error: ${ocrError instanceof Error ? ocrError.message : "Unknown"}`
          );
        }
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error(`Failed to extract any text from ${isImage ? 'image' : 'PDF'}`);
    }
    
    if (usedOCR) {
      console.log("⚠️ OCR was used - this incurs OpenAI Vision API costs");
    }

    // Get document category for feedback-based improvements (if available)
    const { data: docData } = await supabase
      .from("documents")
      .select("category")
      .eq("id", document_id)
      .single();
    
    const documentCategory = docData?.category || null;
    
    // Analyze the extracted text with OpenAI
    console.log("Analyzing text with OpenAI GPT-4o...");
    const analysis = await analyzeWithOpenAI(extractedText, openaiApiKey, supabase, documentCategory);
    
    // Prepare todo arrays as JSON strings
    const todoSimpleString = JSON.stringify(analysis.todo_simple || []);
    const todoLegalString = JSON.stringify(analysis.todo_legal || []);
    
    // Get first deadline for backward compatibility (deadline field)
    const firstDeadline = analysis.deadlines && analysis.deadlines.length > 0 
      ? analysis.deadlines[0] 
      : null;
    
    // Legacy fields for backward compatibility
    const whatToDoString = Array.isArray(analysis.what_to_do)
      ? JSON.stringify(analysis.what_to_do)
      : analysis.what_to_do 
        ? JSON.stringify([analysis.what_to_do])
        : todoSimpleString; // Fallback to todo_simple if what_to_do not provided

    const { data: insertedAnalysis, error: insertError } = await supabase
      .from("analyses")
      .insert({
        document_id,
        // New fields
        simple_summary: analysis.simple_summary,
        legal_summary: analysis.legal_summary,
        todo_simple: todoSimpleString,
        todo_legal: todoLegalString,
        deadline: firstDeadline || analysis.deadline || null,
        severity: analysis.severity ?? "info",
        bank_account: analysis.bank_account,
        amount: analysis.amount,
        recipient_name: analysis.recipient_name,
        detected_category: analysis.detected_category || null,
        detected_tags: analysis.detected_tags || [],
        // Legacy fields for backward compatibility
        what_is_it: analysis.what_is_it || analysis.simple_summary,
        what_to_do: whatToDoString,
      })
      .select()
      .single();

    if (insertError || !insertedAnalysis) {
      throw new Error(`Failed to save analysis: ${insertError?.message ?? "Unknown error"}`);
    }

    // Update document with category and tags from analysis
    await supabase
      .from("documents")
      .update({ 
        status: "completed",
        category: analysis.detected_category || null,
        tags: analysis.detected_tags || [],
      })
      .eq("id", document_id);

  return new Response(
    JSON.stringify({
      success: true,
        analysis_id: insertedAnalysis.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("analyze-document error:", err);
    
    try {
      if (documentIdForErrorHandling && supabase) {
        await supabase.from("documents").update({ status: "error" }).eq("id", documentIdForErrorHandling);
      }
    } catch (updateErr) {
      console.error("Failed to update document status:", updateErr);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error",
    }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
  }
});
