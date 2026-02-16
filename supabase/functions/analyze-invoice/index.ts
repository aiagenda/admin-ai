import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Extract text from PDF using pdfjs-serverless (Deno-compatible, no workers needed)
 * This works for text-based PDFs
 */
async function extractTextWithPdfJs(uint8Array: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.3.0");
    const { getDocument } = pdfjs;
    
    const pdf = await getDocument({ data: uint8Array }).promise;
    const textParts: string[] = [];

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
 * Convert PDF pages to images for OCR
 * For scanned PDFs with embedded images
 */
async function convertPdfPagesToImages(uint8Array: Uint8Array): Promise<string[]> {
  try {
    const pdfjs = await import("https://esm.sh/pdfjs-serverless@0.3.0");
    const { getDocument } = pdfjs;
    
    const pdf = await getDocument({ data: uint8Array }).promise;
    const imageBase64Array: string[] = [];
    const maxPages = 5; // Limit for invoices (usually 1-2 pages)
    
    console.log(`PDF has ${pdf.numPages} page(s), extracting images from first ${Math.min(pdf.numPages, maxPages)}`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages && pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const opList = await page.getOperatorList();
        const resources = (opList as any).resources;
        
        let imageFound = false;
        if (resources) {
          const xObjects = (resources as any).get?.("XObject");
          if (xObjects) {
            for (const [_name, xObject] of xObjects.entries()) {
              if (xObject && (xObject as any).subtype === "Image") {
                try {
                  const imgData = await (xObject as any).getImageData();
                  if (imgData && imgData.data) {
                    // Chunk-based base64 to avoid stack overflow
                    const imageBytes = new Uint8Array(imgData.data);
                    let b64 = "";
                    const chunkSize = 8192;
                    for (let i = 0; i < imageBytes.length; i += chunkSize) {
                      const chunk = imageBytes.slice(i, i + chunkSize);
                      b64 += String.fromCharCode.apply(null, Array.from(chunk));
                    }
                    imageBase64Array.push(`data:image/png;base64,${btoa(b64)}`);
                    imageFound = true;
                    console.log(`✅ Extracted image from page ${pageNum}`);
                    break;
                  }
                } catch (imgError) {
                  console.warn(`Failed to extract image from page ${pageNum}:`, imgError);
                }
              }
            }
          }
        }
        
        if (!imageFound) {
          console.warn(`Page ${pageNum} has no embedded images`);
        }
      } catch (pageError) {
        console.warn(`Failed to process page ${pageNum}:`, pageError);
      }
    }
    
    if (imageBase64Array.length === 0) {
      throw new Error("No embedded images found in PDF - may need to use text extraction instead");
    }
    
    console.log(`✅ Extracted ${imageBase64Array.length} image(s) from PDF`);
    return imageBase64Array;
  } catch (error) {
    console.error("PDF to image conversion error:", error);
    throw error;
  }
}

type LineItem = {
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  net_amount: number | null;
  vat_rate: string | null;
  vat_amount: number | null;
  gross_amount: number | null;
};

type InvoiceAnalysisResult = {
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  due_date: string | null; // YYYY-MM-DD
  fulfillment_date: string | null; // Teljesítés dátuma
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_tax_id: string | null;
  net_amount: number | null;
  vat_rate: string | null; // "27%", "18%", "5%", "AAM", "TAM"
  vat_amount: number | null;
  gross_amount: number | null;
  currency: string;
  item_description: string | null;
  line_items: LineItem[] | null; // Részletes tételek
  payment_method: string | null; // készpénz, átutalás, kártya
  expense_category: string | null; // fuel, office, travel, accommodation, food, phone, software, maintenance, marketing, other
  has_handwritten_content: boolean;
  ai_confidence: number; // 0.0-1.0
};

/**
 * Get OCR improvements from user feedback (reused from analyze-document)
 */
async function getOCRImprovements(supabase: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data: feedbackData, error } = await supabase
      .from("ocr_feedback")
      .select("handwritten_numbers_detected, handwritten_numbers_correct, ocr_accuracy, feedback_comment, correct_amount, correct_bank_account, extracted_amount, extracted_bank_account, correct_invoice_number, extracted_invoice_number, correct_vendor_name, extracted_vendor_name")
      .eq("handwritten_numbers_detected", true)
      .in("ocr_accuracy", ["fair", "poor"])
      .limit(30);

    if (error || !feedbackData || feedbackData.length === 0) {
      return "";
    }

    const corrections: string[] = [];
    const commonMistakes: string[] = [];

    feedbackData.forEach((feedback: any) => {
      if (feedback.handwritten_numbers_correct === false) {
        if (feedback.correct_amount && feedback.extracted_amount) {
          corrections.push(`Amount: "${feedback.extracted_amount}" → "${feedback.correct_amount}"`);
        }
        if (feedback.correct_invoice_number && feedback.extracted_invoice_number) {
          corrections.push(`Invoice#: "${feedback.extracted_invoice_number}" → "${feedback.correct_invoice_number}"`);
        }
      }

      if (feedback.feedback_comment) {
        const comment = feedback.feedback_comment.toLowerCase();
        if (comment.includes("0") || comment.includes("o")) commonMistakes.push("0 vs O confusion");
        if (comment.includes("1") || comment.includes("i") || comment.includes("l")) commonMistakes.push("1 vs I vs L confusion");
        if (comment.includes("5") || comment.includes("s")) commonMistakes.push("5 vs S confusion");
        if (comment.includes("6") || comment.includes("g")) commonMistakes.push("6 vs G confusion");
        if (comment.includes("8") || comment.includes("b")) commonMistakes.push("8 vs B confusion");
      }
    });

    if (corrections.length === 0 && commonMistakes.length === 0) {
      return "";
    }

    let improvements = "\n\nIMPORTANT - LEARNED FROM USER FEEDBACK:\n";
    
    if (commonMistakes.length > 0) {
      const uniqueMistakes = Array.from(new Set(commonMistakes));
      improvements += `- Common handwritten digit confusions: ${uniqueMistakes.join(", ")}\n`;
    }

    if (corrections.length > 0) {
      improvements += `- Recent corrections:\n`;
      corrections.slice(0, 5).forEach((correction) => {
        improvements += `  * ${correction}\n`;
      });
    }

    improvements += "- Triple-check all handwritten digits, especially in amounts and invoice numbers\n";

    console.log(`✅ Applied OCR improvements from ${feedbackData.length} feedback entries`);
    return improvements;
  } catch (error) {
    console.warn("Failed to get OCR improvements:", error);
    return "";
  }
}

/**
 * Extract text from image using OpenAI Vision (OCR)
 */
async function extractTextWithVision(
  imageBase64: string,
  openaiApiKey: string,
  ocrImprovements: string
): Promise<string> {
  const ocrPrompt = `Extract all text from this Hungarian invoice/receipt image.

Pay EXTRA attention to:
- Invoice number (számlaszám)
- Dates (dátum, teljesítés, fizetési határidő)
- Vendor/seller name and address (eladó/kibocsátó)
- Tax ID (adószám)
- ALL amounts - net, VAT, gross (nettó, ÁFA, bruttó)
- VAT rate (ÁFA kulcs: 27%, 18%, 5%, AAM, TAM)
- Item descriptions (tételek)

HANDWRITTEN numbers are common - be very careful:
- Carefully distinguish: 0 vs O, 1 vs I vs L, 5 vs S, 6 vs G, 8 vs B
- For amounts, verify the number makes sense in context
${ocrImprovements}

Return ONLY the extracted text, preserving structure. No analysis.`;

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
            { type: "text", text: ocrPrompt },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Analyze invoice text and extract structured data
 */
async function analyzeInvoice(
  text: string,
  openaiApiKey: string
): Promise<InvoiceAnalysisResult> {
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are an expert Hungarian invoice analyzer. Extract ALL data from the invoice text.

Return ONLY valid JSON with this exact structure:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "fulfillment_date": "YYYY-MM-DD or null (teljesítés dátuma)",
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "vendor_tax_id": "string (Hungarian format: 12345678-1-12) or null",
  "net_amount": number or null (TOTAL net),
  "vat_rate": "27%" | "18%" | "5%" | "AAM" | "TAM" | "0%" | null (main rate),
  "vat_amount": number or null (TOTAL VAT),
  "gross_amount": number or null (TOTAL gross),
  "currency": "HUF" | "EUR" | "USD",
  "item_description": "string - short summary of all items",
  "line_items": [
    {
      "description": "tétel megnevezése",
      "quantity": number or null,
      "unit": "db" | "óra" | "km" | "m2" | null,
      "unit_price": number or null,
      "net_amount": number or null,
      "vat_rate": "27%" | null,
      "vat_amount": number or null,
      "gross_amount": number or null
    }
  ] or null if only 1 item,
  "payment_method": "készpénz" | "átutalás" | "bankkártya" | null,
  "expense_category": "fuel" | "office" | "travel" | "accommodation" | "food" | "phone" | "software" | "maintenance" | "marketing" | "other",
  "has_handwritten_content": boolean,
  "ai_confidence": 0.0-1.0
}

RULES:
1. Amounts must be NUMBERS (not strings). Remove thousands separators. Example: "10 600 Ft" → 10600
2. Dates in YYYY-MM-DD format
3. line_items: Extract EACH line item separately if there are multiple items on the invoice (e.g., "villanyszerelés" and "kiszállási díj" are 2 separate items)
4. expense_category - choose based on vendor/item:
   - fuel: gas stations, petrol (MOL, Shell, OMV, benzin, gázolaj)
   - office: office supplies, stationery (irodaszer, papír)
   - travel: transport, parking, tolls (vonat, busz, taxi, parkolás, útdíj)
   - accommodation: hotels, airbnb (szállás, hotel)
   - food: restaurants, catering (étterem, vendéglátás)
   - phone: telecom, internet (Telekom, Vodafone, internet)
   - software: subscriptions, SaaS (előfizetés, szoftver)
   - maintenance: repairs, services (karbantartás, javítás)
   - marketing: ads, promo (reklám, marketing)
   - other: anything else
5. has_handwritten_content: true if you detected any handwritten numbers/text
6. ai_confidence: your confidence in the extraction (0.5-1.0)
7. If relative date like "fizetési határidő: 8 nap", calculate from invoice_date. Today is ${today}.
8. fulfillment_date: Look for "teljesítés" or "teljesítés dátuma" - often same as invoice_date

ONLY return the JSON object, no other text.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Invoice text:\n\n${text.slice(0, 10000)}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let invoiceId: string | undefined;

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.invoice_id || !body.file_url) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing invoice_id or file_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    invoiceId = body.invoice_id;
    const fileUrl = body.file_url;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      throw new Error("Missing environment variables");
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download file
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(fileUrl);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Get MIME type from blob or filename
    let mimeType = fileBlob.type;
    const ext = fileUrl.split(".").pop()?.toLowerCase() || "";
    
    if (!mimeType || mimeType === "application/octet-stream") {
      if (ext === "png") mimeType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "gif") mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "pdf") mimeType = "application/pdf";
      else if (ext === "heic" || ext === "heif") mimeType = "image/heic";
      else if (ext === "tiff" || ext === "tif") mimeType = "image/tiff";
      else if (ext === "bmp") mimeType = "image/bmp";
      else mimeType = "image/jpeg"; // default
    }

    console.log(`File MIME type: ${mimeType}, Size: ${fileBlob.size} bytes, Extension: ${ext}`);

    // Check for unsupported formats
    if (mimeType === "image/heic" || mimeType === "image/heif" || ext === "heic" || ext === "heif") {
      throw new Error("HEIC/HEIF formátum nem támogatott. Kérjük konvertáld JPG vagy PNG formátumba.");
    }

    // Check file size - OpenAI has limits
    if (fileBlob.size > 20 * 1024 * 1024) {
      throw new Error("A fájl túl nagy. Maximum méret: 20MB.");
    }

    // Convert to uint8 array
    const arrayBuffer = await fileBlob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Get OCR improvements from user feedback
    const ocrImprovements = await getOCRImprovements(supabase);

    let extractedText = "";

    // Handle PDF files
    if (mimeType === "application/pdf") {
      console.log("Processing PDF file...");
      
      // Try text extraction first (for text-based PDFs)
      try {
        console.log("Attempting PDF text extraction...");
        extractedText = await extractTextWithPdfJs(uint8);
        console.log(`✅ Extracted ${extractedText.length} characters from PDF text`);
      } catch (textError) {
        console.log("PDF text extraction failed, trying image extraction...", textError);
        
        // Fallback: extract images from PDF and OCR them
        try {
          const pdfImages = await convertPdfPagesToImages(uint8);
          console.log(`Extracted ${pdfImages.length} images from PDF, running OCR...`);
          
          const textParts: string[] = [];
          for (let i = 0; i < pdfImages.length; i++) {
            console.log(`OCR on PDF page ${i + 1}...`);
            const pageText = await extractTextWithVision(pdfImages[i], openaiApiKey, ocrImprovements);
            textParts.push(pageText);
          }
          extractedText = textParts.join("\n\n---\n\n");
          console.log(`✅ Extracted ${extractedText.length} characters from PDF via OCR`);
        } catch (imageError) {
          console.error("PDF image extraction failed:", imageError);
          throw new Error("Nem sikerült feldolgozni a PDF fájlt. Próbáld meg képként feltölteni (JPG, PNG).");
        }
      }
    } else {
      // Handle image files (JPG, PNG, GIF, WebP, BMP, TIFF)
      console.log("Processing image file...");
      
      // Convert to base64 (chunk-based to avoid stack overflow)
      let base64 = "";
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.slice(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64 = btoa(base64);

      // For TIFF/BMP, try to process but warn about potential issues
      if (mimeType === "image/tiff" || mimeType === "image/bmp") {
        console.warn(`${mimeType} may have limited support - attempting anyway`);
      }

      const imageBase64 = `data:${mimeType};base64,${base64}`;
      console.log(`Base64 length: ${imageBase64.length} characters`);

      // Extract text with Vision OCR
      console.log("Extracting text with Vision OCR...");
      extractedText = await extractTextWithVision(imageBase64, openaiApiKey, ocrImprovements);
      console.log(`✅ Extracted ${extractedText.length} characters from image`);
    }

    if (!extractedText || extractedText.length < 10) {
      throw new Error("Nem sikerült szöveget kinyerni a fájlból. Ellenőrizd, hogy a kép/PDF olvasható-e.");
    }

    // Analyze invoice
    console.log("Analyzing invoice...");
    const analysis = await analyzeInvoice(extractedText, openaiApiKey);
    console.log("Analysis complete:", analysis);

    // Update invoice record
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        invoice_number: analysis.invoice_number,
        invoice_date: analysis.invoice_date,
        due_date: analysis.due_date,
        fulfillment_date: analysis.fulfillment_date,
        vendor_name: analysis.vendor_name,
        vendor_address: analysis.vendor_address,
        vendor_tax_id: analysis.vendor_tax_id,
        net_amount: analysis.net_amount,
        vat_rate: analysis.vat_rate,
        vat_amount: analysis.vat_amount,
        gross_amount: analysis.gross_amount,
        currency: analysis.currency || "HUF",
        item_description: analysis.item_description,
        line_items: analysis.line_items,
        payment_method: analysis.payment_method,
        expense_category: analysis.expense_category,
        has_handwritten_content: analysis.has_handwritten_content,
        ai_confidence: analysis.ai_confidence,
        raw_ai_response: analysis,
        status: "completed",
      })
      .eq("id", invoiceId);

    if (updateError) {
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    console.log(`✅ Invoice ${invoiceId} processed successfully`);

    return new Response(
      JSON.stringify({ success: true, invoice_id: invoiceId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("analyze-invoice error:", err);

    if (invoiceId && supabase) {
      try {
        await supabase
          .from("invoices")
          .update({ status: "error" })
          .eq("id", invoiceId);
      } catch (updateErr) {
        console.error("Failed to update invoice status:", updateErr);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
