import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type ExtractedFields = {
  taxpayer_name?: string | null;
  address?: string | null;
  city_state_zip?: string | null;
  tax_year?: string | null;
  notice_number?: string | null;
  account_number?: string | null;
  amount_due?: string | null;
  agency?: string | null;
};

type AnalysisResult = {
  simple_summary: string; // Includes real-life example (e.g., "Ez olyan, mint amikor Józsi...")
  confidence?: number; // Optional model confidence (0-1)
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
  state_code?: string | null; // US state code (e.g. CA, NY) when applicable
  issuer?: string | null; // Document issuer (e.g., "NAV", "bíróság", "önkormányzat")
  extracted_fields?: ExtractedFields | null; // Structured fields for form prefill
  // Legacy fields for backward compatibility
  what_is_it?: string;
  what_to_do?: string[] | string;
  deadline?: string | null;
};


type OCRProvider = "openai" | "glm";

type OCROptions = {
  provider: OCRProvider;
  openaiApiKey: string;
  glmApiKey?: string;
  glmApiUrl?: string;
  glmModel?: string;
  supabase?: ReturnType<typeof createClient>;
};


function uint8ToBase64(bytes: Uint8Array): string {
  // Avoid spreading large typed arrays which can crash with stack/arg limits.
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

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
                    const base64 = uint8ToBase64(imageBytes);
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
      improvements += "- When in doubt, use context clues (e.g., bank account numbers follow specific patterns, amounts are usually in USD or with a $ sign)\n";
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
 * Detect when a vision model returned a refusal / apology instead of OCR text.
 * Such responses must NOT be passed downstream as if they were document content.
 */
function looksLikeRefusal(text: string): boolean {
  const t = text.trim();
  if (t.length > 400) return false; // real OCR output is usually longer than a refusal
  return /^(i (?:can'?t|cannot|am unable|'?m unable|'?m sorry|am sorry)\b|sorry,|i'?m not able\b|unfortunately,? i)/i.test(t)
    || /\b(can'?t|cannot|unable to) (?:help|assist)\b.*\bimage/i.test(t);
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
                role: "system",
                content:
                  "You are a precise OCR transcription engine. You will be given a photo or scan of a US government, tax, or official document. Transcribe ALL visible text exactly as it appears — preserve line breaks, dates, amounts, and account numbers. Pay special attention to handwritten digits, carefully distinguishing 0/O, 1/I, 5/S, 6/G. If part of the image is blurry or unclear, transcribe what you can and mark the rest with [illegible]. Output ONLY the transcribed text. Never refuse, never apologize, and never add commentary or explanations.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: await (async () => {
                      // Base OCR prompt
                      let ocrPrompt = `Transcribe all text from this document image, exactly as shown. Return only the extracted text, no analysis or commentary.`;

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
                      detail: "high",
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

        if (extractedText && looksLikeRefusal(extractedText)) {
          console.warn(`Page ${i + 1}: Vision model refused OCR ("${extractedText.slice(0, 80)}…"), discarding`);
        } else if (extractedText) {
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


async function extractTextWithGLMOCR(
  imageBase64Array: string[],
  glmApiKey: string,
  glmApiUrl: string,
  glmModel: string,
  supabase?: ReturnType<typeof createClient>,
): Promise<string> {
  const textParts: string[] = [];
  const maxPages = 10;
  const pagesToProcess = Math.min(imageBase64Array.length, maxPages);

  for (let i = 0; i < pagesToProcess; i++) {
    const imageBase64 = imageBase64Array[i];
    let ocrPrompt = `Extract all text from this US government/official document image.
Return only the extracted text, no analysis.`;

    if (supabase) {
      const ocrImprovements = await getOCRImprovements(supabase);
      if (ocrImprovements) ocrPrompt += ocrImprovements;
    }

    const response = await fetch(glmApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${glmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: glmModel,
        messages: [
          {
            role: "system",
            content:
              "You are a precise OCR transcription engine. Transcribe ALL visible text from the document image exactly as it appears. Output only the transcribed text. Never refuse, apologize, or add commentary.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: ocrPrompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GLM OCR API error for page ${i + 1}: ${errorText}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content;
    if (extractedText && looksLikeRefusal(extractedText)) {
      console.warn(`GLM page ${i + 1}: model refused OCR, discarding`);
    } else if (extractedText) {
      textParts.push(extractedText);
    }
  }

  const fullText = textParts.join("\n\n").trim();
  if (!fullText) throw new Error("GLM OCR extracted no text");
  return fullText;
}

async function extractTextWithVisionProvider(
  imageBase64Array: string[],
  options: OCROptions,
): Promise<{ text: string; providerUsed: OCRProvider }> {
  if (options.provider === "glm") {
    if (!options.glmApiKey) {
      console.warn("GLM OCR selected but GLM_OCR_API_KEY is missing, falling back to OpenAI OCR");
    } else {
      try {
        const text = await extractTextWithGLMOCR(
          imageBase64Array,
          options.glmApiKey,
          options.glmApiUrl || "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          options.glmModel || "glm-4.5v",
          options.supabase,
        );
        return { text, providerUsed: "glm" };
      } catch (glmErr) {
        console.warn("GLM OCR failed, falling back to OpenAI OCR:", glmErr);
      }
    }
  }

  const text = await extractTextWithVisionOCR(imageBase64Array, options.openaiApiKey, options.supabase);
  return { text, providerUsed: "openai" };
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


/** US English-only document analysis. */
function isUsMarket(): boolean {
  return true; // GovLetter is US-only
}

function getUsLanguagePrompt(todayStr: string): string {
  return `You are an expert U.S. official and financial correspondence assistant. Analyze letters from federal agencies, state tax authorities, courts, banks, utilities, insurers, landlords, and employers. Respond strictly with JSON:

{
  "simple_summary": "Clear plain-English explanation for a non-expert. If the notice is addressed to the reader, explain their situation directly. Use present tense. Be supportive and actionable.",
  "legal_summary": "Professional interpretation in English only. NO fictional names. Cite statutes only when explicitly in the document (IRC, 26 U.S.C., state revenue code, SSA, FCRA, etc.).",
  "todo_simple": ["simple step 1", "simple step 2"],
  "todo_legal": ["legal step 1", "legal step 2"],
  "deadlines": ["YYYY-MM-DD"] or [],
  "deadline_descriptions": ["relative or absolute date description"] or [],
  "severity": "info" | "action_needed" | "urgent",
  "bank_account": "string or null",
  "amount": "string or null",
  "recipient_name": "string or null",
  "detected_category": "tax" | "healthcare" | "education" | "social" | "transport" | "property" | "business" | "other" or null,
  "detected_tags": ["tag1", "tag2"] or [],
  "mentioned_laws": ["26 U.S.C. §6331", "IRC §6651"] or [],
  "doc_type": "irs_notice_balance_due" | "irs_notice_intent_to_levy" | "irs_notice_deficiency" | "irs_notice_cp2000" | "irs_identity_verification" | "irs_audit" | "irs_penalty" | "irs_lien" | "irs_notice_generic" | "state_tax_balance_due" | "state_tax_audit" | "state_tax_refund_offset" | "state_tax_generic" | "state_tax_CA_balance_due" (pattern: state_tax_XX_balance_due for any US state) | "ssa_overpayment" | "ssa_benefit_change" | "ssa_generic" | "uscis_rfe" | "uscis_biometrics" | "uscis_decision" | "medicare_premium" | "medicare_lis" | "medicare_generic" | "medicaid_notice" | "va_debt" | "va_benefit" | "unemployment_determination" | "court_summons" | "court_judgment" | "child_support" | "wage_garnishment" | "bank_collection" | "credit_card_chargeoff" | "mortgage_default" | "utility_disconnect" | "hoa_violation" | "eviction_notice" | "medical_bill" | "insurance_eob" | "official_letter_generic" | "unknown",
  "state_code": "two-letter US state code or null (e.g. CA, NY, TX)",
  "issuer": "irs" | "state_tax_authority" | "ssa" | "uscis" | "cms" | "va" | "court" | "bank" | "utility" | "hoa" | "landlord" | "hospital" | "insurer" | "employer" | "other" or null,
  "extracted_fields": {
    "taxpayer_name": "the recipient/taxpayer full name exactly as printed, or null",
    "address": "street address line of the recipient, or null",
    "city_state_zip": "city, state, ZIP of the recipient, or null",
    "tax_year": "the tax year or period the notice concerns (e.g. \"2023\"), or null",
    "notice_number": "the notice/letter identifier (e.g. \"CP14\", \"LT11\"), or null",
    "account_number": "account, case, or reference number, or null",
    "amount_due": "the amount owed/in question as printed (keep the $ and decimals), or null",
    "agency": "the issuing agency name as printed (e.g. \"Internal Revenue Service\"), or null"
  }
}

IMPORTANT RULES:
1. ALL output must be in English.
2. doc_type: pick the best match from the enum. For IRS mail be specific:
   - Notice of Deficiency / "90-day letter" (CP3219A, CP3219N, Letter 3219/531, mentions petitioning U.S. Tax Court) → irs_notice_deficiency
   - CP2000 / underreported income / proposed changes from matched 1099/W-2 data → irs_notice_cp2000
   - Identity verification (5071C, 4883C, 5747C, 6330C, "verify your identity", idverify.irs.gov) → irs_identity_verification
   - Audit / examination (Letter 566, 525, 915, 2205, 3572, CP75/CP75A EITC) → irs_audit
   - Penalty notice where a penalty is assessed (failure to file/pay, accuracy) → irs_penalty
   - Notice of Federal Tax Lien (Letter 3172, CP504B mentioning a lien) → irs_lien
   - Intent to levy (CP504, LT11, Letter 1058) → irs_notice_intent_to_levy
   - Balance due (CP14, CP501/502/503) → irs_notice_balance_due
   - Any other IRS letter → irs_notice_generic
   Then: state department of revenue → state_tax_XX_balance_due (XX = state code), or state_tax_generic if unknown; Social Security → ssa_*; Medicaid eligibility/denial/renewal → medicaid_notice; Medicare → medicare_*; USCIS → uscis_*; VA → va_*; unemployment office → unemployment_determination; court papers → court_* or child_support; a wage/bank garnishment order (not an IRS levy) → wage_garnishment; debt collectors/banks → bank_*; mortgage servicer default/foreclosure → mortgage_default; utilities → utility_disconnect; HOA → hoa_violation; landlord eviction/pay-or-quit → eviction_notice; medical → medical_bill or insurance_eob; unclear official letter → official_letter_generic or unknown.
3. state_code: required when issuer is state_tax_authority or state unemployment; null for federal-only letters.
4. mentioned_laws: explicit citations only. Empty array if none.
5. deadlines: YYYY-MM-DD; compute relative dates from today (${todayStr}).
6. PAYMENT DATA: fill bank_account, amount, recipient_name only for actual payment obligations.
7. Not tax or legal advice—describe options and deadlines from the document text.`;
}

// GovLetter is US-only — always analyse in English.
async function resolveAnalysisLanguage(_text: string, _openaiApiKey: string): Promise<string> {
  return "en";
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
  limit: number = 5,
  stateCode: string | null = null
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
      _limit: limit * 2,
      _market: "us",
      _state_code: stateCode,
    });

    if (error) {
      console.warn("Knowledge base search error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No relevant knowledge base chunks found");
      return [];
    }

    if (isUsMarket() && (!data || data.length === 0)) {
      console.log("No US knowledge base chunks found");
      return [];
    }

    const scopedData = data;

    // Filter by relevance threshold (cosine similarity > 0.7)
    const relevantChunks = scopedData
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
      return `[${isUsMarket() ? "Source" : "Forrás"} ${index + 1}: ${chunk.document_title}]\n${chunk.chunk_text}`;
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
  const rulesIndexEn = basePrompt.indexOf("IMPORTANT RULES:");
  const idx = rulesIndex !== -1 ? rulesIndex : rulesIndexEn;
  if (idx !== -1) {
    return basePrompt.slice(0, idx) + kbContext + "\n\n" + basePrompt.slice(idx);
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
    const feedbackQuery = supabase
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


type PromptConfig = {
  id: string;
  system_prompt: string;
  schema_prompt: string | null;
};

async function getActivePromptConfig(
  supabase: ReturnType<typeof createClient>,
  languageCode: string,
  docType: string = "general",
): Promise<PromptConfig | null> {
  try {
    const { data } = await supabase
      .from("ai_prompt_versions")
      .select("id, system_prompt, schema_prompt")
      .eq("doc_type", docType)
      .eq("language_code", languageCode)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as PromptConfig | null) ?? null;
  } catch (error) {
    console.warn("Failed to load active AI prompt config:", error);
    return null;
  }
}

async function getDynamicFieldInstructions(
  supabase: ReturnType<typeof createClient>,
  docType: string = "general",
): Promise<string> {
  try {
    const { data } = await supabase
      .from("ai_field_definitions")
      .select("field_key, display_name, data_type, is_required, prompt_snippet")
      .eq("doc_type", docType)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!data || data.length === 0) {
      return "";
    }

    const rows = (data as Array<{
      field_key: string;
      display_name: string;
      data_type: string;
      is_required: boolean;
      prompt_snippet: string | null;
    }>).map((f) => {
      const req = f.is_required ? "required" : "optional";
      const hint = f.prompt_snippet ? `; hint: ${f.prompt_snippet}` : "";
      return `- ${f.field_key} (${f.data_type}, ${req}) - ${f.display_name}${hint}`;
    });

    return `

DYNAMIC FIELD REQUIREMENTS:
${rows.join("\n")}`;
  } catch (error) {
    console.warn("Failed to load AI field definitions:", error);
    return "";
  }
}

function getLanguagePrompt(_language: string, todayStr: string): string {
  // GovLetter is US-only — always use the US English prompt.
  return getUsLanguagePrompt(todayStr);
}

/**
 * Analyze extracted text using OpenAI GPT-4o
 */
async function analyzeWithOpenAI(
  text: string, 
  openaiApiKey: string,
  supabase?: ReturnType<typeof createClient>,
  category?: string | null
): Promise<{ analysis: AnalysisResult; promptVersionId: string | null; detectedLanguage: string }> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Detect document language
  console.log("Detecting document language...");
  const detectedLanguage = await resolveAnalysisLanguage(text, openaiApiKey);
  console.log(`✅ Detected language: ${detectedLanguage}`);
  
  // Get language-specific prompt
  let systemPrompt = getLanguagePrompt(detectedLanguage, todayStr);
  let activePromptVersionId: string | null = null;

  // Apply admin-managed prompt config if available
  if (supabase) {
    const promptConfig = await getActivePromptConfig(supabase, detectedLanguage, "general");
    if (promptConfig) {
      activePromptVersionId = promptConfig.id;
      const mergedPrompt = [promptConfig.system_prompt, systemPrompt, promptConfig.schema_prompt || ""]
        .filter(Boolean)
        .join("\n\n");
      systemPrompt = mergedPrompt;
    }

    const dynamicFieldInstructions = await getDynamicFieldInstructions(supabase, "general");
    if (dynamicFieldInstructions) {
      systemPrompt += dynamicFieldInstructions;
    }
  }
  
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
          content: `${"Document text"}:\n\n${text.slice(0, 15000)}`,
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

  // Keep confidence in valid range if model returned it
  if (typeof result.confidence === "number") {
    result.confidence = Math.max(0, Math.min(1, result.confidence));
  }
  
  // Normalize deadlines - convert relative dates to absolute dates
  if (result.deadlines && result.deadlines.length > 0) {
    result.deadlines = normalizeDeadlines(result.deadlines);
  }
  
  return {
    analysis: result,
    promptVersionId: activePromptVersionId,
    detectedLanguage,
  };
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
    const configuredOCRProvider = (Deno.env.get("OCR_PROVIDER") ?? "openai").toLowerCase() === "glm" ? "glm" : "openai";
    const glmApiKey = Deno.env.get("GLM_OCR_API_KEY") ?? "";
    const glmApiUrl = Deno.env.get("GLM_OCR_API_URL") ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const glmModel = Deno.env.get("GLM_OCR_MODEL") ?? "glm-4.5v";

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

    // Determine file type from both extension and blob MIME (more reliable for mobile camera uploads)
    const fileExtension = file_url.split('.').pop()?.toLowerCase() || '';
    const blobMimeType = (fileBlob.type || '').toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
    const isImageByExtension = imageExtensions.includes(fileExtension);
    const isImageByMime = blobMimeType.startsWith('image/');
    const isImage = isImageByExtension || isImageByMime;
    const isPDF = fileExtension === 'pdf' || blobMimeType === 'application/pdf';

    if (!isImage && !isPDF) {
      throw new Error(`Unsupported file type for analysis: extension=${fileExtension || 'unknown'}, mime=${blobMimeType || 'unknown'}`);
    }

    let extractedText = "";
    let usedOCR = false;

    if (isImage) {
      // Handle image files - direct OCR processing
      console.log(`Processing image file (${fileExtension})...`);
      
      try {
        // Convert image blob to base64
        const arrayBuffer = await fileBlob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const base64 = uint8ToBase64(uint8);
        
        // Determine MIME type
        let mimeType = blobMimeType || 'image/jpeg';
        if (!mimeType.startsWith('image/')) {
          if (fileExtension === 'png') mimeType = 'image/png';
          else if (fileExtension === 'heic') mimeType = 'image/heic';
          else if (fileExtension === 'heif') mimeType = 'image/heif';
          else if (fileExtension === 'webp') mimeType = 'image/webp';
          else mimeType = 'image/jpeg';
        }
        
        const imageBase64 = `data:${mimeType};base64,${base64}`;
        
        console.log(`Extracting text from image using ${configuredOCRProvider.toUpperCase()} OCR provider...`);
        const ocrResult = await extractTextWithVisionProvider([imageBase64], {
          provider: configuredOCRProvider,
          openaiApiKey,
          glmApiKey,
          glmApiUrl,
          glmModel,
          supabase,
        });
        extractedText = ocrResult.text;
        usedOCR = true;
        console.log(`✅ OCR extraction successful from image via ${ocrResult.providerUsed}`);
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
          
          console.log(`Extracting text using ${configuredOCRProvider.toUpperCase()} OCR provider...`);
          const ocrResult = await extractTextWithVisionProvider(pageImages, {
            provider: configuredOCRProvider,
            openaiApiKey,
            glmApiKey,
            glmApiUrl,
            glmModel,
            supabase,
          });
          extractedText = ocrResult.text;
          usedOCR = true;
          console.log(`✅ OCR extraction successful via ${ocrResult.providerUsed}`);
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
    const analysisResponse = await analyzeWithOpenAI(extractedText, openaiApiKey, supabase, documentCategory);
    const analysis = analysisResponse.analysis;
    
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

    let playbookFormKey: string | null = null;
    let playbookRequiredForms: string[] = [];
    try {
      const { data: playbookRows, error: playbookErr } = await supabase.rpc("get_matching_playbook", {
        _category: analysis.detected_category ?? null,
        _tags: analysis.detected_tags ?? null,
        _content_keywords: analysis.detected_tags ?? null,
        _doc_type: analysis.doc_type ?? null,
        _state_code: analysis.state_code ?? null,
        _agency: analysis.issuer ?? null,
        _market: "us",
      });
      if (playbookErr) {
        console.warn("get_matching_playbook:", playbookErr.message);
      } else if (playbookRows && playbookRows.length > 0) {
        const rf = (playbookRows[0] as { related_forms?: string[] }).related_forms;
        if (Array.isArray(rf) && rf.length > 0) {
          playbookRequiredForms = [...rf];
          playbookFormKey = rf[0] ?? null;
        }
      }
    } catch (pb) {
      console.warn("Playbook lookup failed:", pb);
    }

    const mentionedLaws = Array.isArray(analysis.mentioned_laws) ? analysis.mentioned_laws : [];
    const deadlineDesc = Array.isArray(analysis.deadline_descriptions) ? analysis.deadline_descriptions : [];

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
        mentioned_laws: mentionedLaws,
        doc_type: analysis.doc_type || null,
        issuer: analysis.issuer || null,
        state_code: analysis.state_code || null,
        agency: analysis.issuer || null,
        extracted_fields: analysis.extracted_fields || null,
        deadline_descriptions: deadlineDesc,
        form_key: playbookFormKey,
        required_forms: playbookRequiredForms.length > 0 ? playbookRequiredForms : null,
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


    // Log extraction run for admin quality analytics
    try {
      await supabase
        .from("ai_extraction_runs")
        .insert({
          document_id,
          analysis_id: insertedAnalysis.id,
          user_id: null,
          prompt_version_id: analysisResponse.promptVersionId,
          model: "gpt-4o",
          language_code: analysisResponse.detectedLanguage,
          doc_type: analysis.doc_type || "general",
          status: "success",
          confidence: typeof analysis.confidence === "number" ? analysis.confidence : null,
          extracted_fields: {
            simple_summary: analysis.simple_summary,
            legal_summary: analysis.legal_summary,
            todo_simple: analysis.todo_simple,
            todo_legal: analysis.todo_legal,
            deadlines: analysis.deadlines,
            severity: analysis.severity,
          },
          raw_output: JSON.stringify(analysis),
        });
    } catch (runLogError) {
      console.warn("Failed to log ai_extraction_run:", runLogError);
    }

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
