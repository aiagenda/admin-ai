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
  net_amount: number | null; // line subtotal (pre-tax)
  sales_tax_rate: string | null;
  sales_tax_amount: number | null;
  gross_amount: number | null; // line total
};

type InvoiceAnalysisResult = {
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  due_date: string | null; // YYYY-MM-DD
  vendor_name: string | null;
  vendor_address: string | null;
  vendor_tax_id: string | null; // US EIN (XX-XXXXXXX) or SSN
  net_amount: number | null; // Subtotal (pre-tax)
  sales_tax_rate: string | null; // e.g. "8.25%", "0%"
  sales_tax_amount: number | null;
  gross_amount: number | null; // Total (subtotal + sales tax)
  currency: string;
  item_description: string | null;
  line_items: LineItem[] | null;
  payment_method: string | null; // cash, check, credit_card, debit_card, ach, wire
  expense_category: string | null; // IRS Schedule C category key
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
  const ocrPrompt = `Extract all text from this US invoice/receipt image.

Pay EXTRA attention to:
- Invoice / receipt number
- Dates (invoice date, due date)
- Vendor/seller name and address
- Vendor tax ID (EIN, format XX-XXXXXXX) if shown
- ALL amounts - Subtotal, Sales Tax, Total
- Sales tax rate (e.g. 8.25%) if shown
- Line item descriptions

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

  const systemPrompt = `You are an expert US bookkeeping assistant analyzing invoices and receipts for IRS Schedule C categorization. Extract ALL data from the invoice/receipt text.

Return ONLY valid JSON with this exact structure:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "vendor_name": "string or null",
  "vendor_address": "string or null",
  "vendor_tax_id": "string (US EIN format XX-XXXXXXX, or SSN) or null",
  "net_amount": number or null (SUBTOTAL, pre-tax total),
  "sales_tax_rate": "string like \\"8.25%\\" or \\"0%\\" or null",
  "sales_tax_amount": number or null (TOTAL sales tax),
  "gross_amount": number or null (TOTAL = subtotal + sales tax),
  "currency": "USD" | "EUR" | "CAD" | other ISO code,
  "item_description": "string - short summary of all items",
  "line_items": [
    {
      "description": "item name",
      "quantity": number or null,
      "unit": "ea" | "hr" | "mi" | "sq ft" | null,
      "unit_price": number or null,
      "net_amount": number or null,
      "sales_tax_rate": "8.25%" | null,
      "sales_tax_amount": number or null,
      "gross_amount": number or null
    }
  ] or null if only 1 item,
  "payment_method": "cash" | "check" | "credit_card" | "debit_card" | "ach" | "wire" | null,
  "expense_category": "advertising" | "car_truck" | "commissions_fees" | "contract_labor" | "depreciation" | "insurance" | "interest" | "legal_professional" | "office_expense" | "rent_lease" | "repairs" | "supplies" | "taxes_licenses" | "travel" | "meals" | "utilities" | "wages" | "other",
  "has_handwritten_content": boolean,
  "ai_confidence": 0.0-1.0
}

RULES:
1. Amounts must be NUMBERS (not strings). Remove thousands separators and the "$" sign. Example: "$1,250.00" -> 1250. Use a period as the decimal separator.
2. Dates in YYYY-MM-DD format. US receipts often use MM/DD/YYYY - convert accordingly (e.g. "03/05/2026" -> "2026-03-05").
3. There is NO federal VAT in the US. Sales tax is a state/local line shown separately. If the receipt shows only a Total with no tax line, set sales_tax_rate and sales_tax_amount to null and put the Total in gross_amount.
4. line_items: extract EACH line item separately when there are multiple items.
5. expense_category - map to the IRS Schedule C category that best fits the vendor/items:
   - advertising: ads, marketing, promotions (Google Ads, Meta, print, signage)
   - car_truck: fuel, gas stations, auto repair, parking, tolls, registration (Shell, Chevron, AutoZone)
   - commissions_fees: sales commissions, referral or platform fees, merchant processing (Stripe, PayPal fees)
   - contract_labor: independent contractors, freelancers, 1099 work
   - depreciation: capitalized equipment/asset purchases
   - insurance: business liability, property, auto, E&O (not health)
   - interest: loan or credit-card interest
   - legal_professional: attorneys, CPAs, bookkeepers, consultants
   - office_expense: office supplies, postage, small office items (Staples, USPS)
   - rent_lease: office/equipment/vehicle rent or lease (WeWork, U-Haul)
   - repairs: repairs and maintenance of business property/equipment
   - supplies: materials and supplies consumed in the business
   - taxes_licenses: business licenses, permits, regulatory fees, payroll taxes
   - travel: airfare, hotels, lodging, rideshare, rental cars when traveling (Delta, Marriott, Uber, Hertz)
   - meals: restaurants, catering, business meals (50% deductible)
   - utilities: electricity, gas, water, internet, phone (Comcast, AT&T, Verizon)
   - wages: employee wages and salaries
   - other: anything that does not fit above
6. has_handwritten_content: true if you detected any handwritten numbers/text.
7. ai_confidence: your confidence in the extraction (0.5-1.0).
8. If a relative due date like "Net 30" or "due in 15 days" appears, calculate it from invoice_date. Today is ${today}.

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
      throw new Error("HEIC/HEIF format is not supported. Please convert the file to JPG or PNG.");
    }

    // Check file size - OpenAI has limits
    if (fileBlob.size > 20 * 1024 * 1024) {
      throw new Error("The file is too large. Maximum size: 20MB.");
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
          throw new Error("Could not process the PDF file. Try uploading it as an image (JPG, PNG).");
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
      throw new Error("Could not extract any text from the file. Check that the image/PDF is readable.");
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
        vendor_name: analysis.vendor_name,
        vendor_address: analysis.vendor_address,
        vendor_tax_id: analysis.vendor_tax_id,
        net_amount: analysis.net_amount,
        vat_rate: analysis.sales_tax_rate,
        vat_amount: analysis.sales_tax_amount,
        gross_amount: analysis.gross_amount,
        currency: analysis.currency || "USD",
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
