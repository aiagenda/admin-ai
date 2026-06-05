import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DocumentWithAnalysis {
  id: string;
  filename: string;
  upload_date: string;
  category: string | null;
  analyses: {
    id: string;
    deadline: string | null;
    severity: string;
    amount: string | null;
    bank_account: string | null;
    recipient_name: string | null;
    simple_summary: string | null;
  } | null;
}


function toUSDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function rowsToCsv(rows: string[][]): string {
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell ?? "");
          if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(","),
    )
    .join("\n");
  // BOM for Excel compatibility
  return "﻿" + csvContent;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const isTest = body?.test === true;
    const testEmail = body?.email;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error: missing Supabase credentials");
    }

    if (!resendApiKey) {
      throw new Error("Server configuration error: missing Resend API key");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // If test mode, use provided email, otherwise find users with auto-send enabled
    let usersToProcess: Array<{ user_id: string; email: string }> = [];

    if (isTest && testEmail) {
      // Test mode: use the currently authenticated user, send to the provided accountant email.
      const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

      if (!token) {
        throw new Error("Missing Authorization token in test mode");
      }

      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user?.id) {
        throw new Error("Invalid or expired user session for test mode");
      }

      usersToProcess = [{ user_id: authData.user.id, email: String(testEmail).trim() }];
    } else {
      // Production mode: find users with auto-send enabled and today is their send day
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, accountant_email, accountant_auto_send_day")
        .eq("accountant_auto_send_enabled", true)
        .not("accountant_email", "is", null);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        console.log("No users with auto-send enabled for today");
        return new Response(
          JSON.stringify({ success: true, message: "No users to process" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Filter by send day
      const todayProfiles = profiles.filter(
        (p) => p.accountant_auto_send_day === currentDay
      );

      if (todayProfiles.length === 0) {
        console.log(`No users scheduled for day ${currentDay}`);
        return new Response(
          JSON.stringify({ success: true, message: "No users scheduled for today" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get user emails
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      usersToProcess = todayProfiles
        .map((profile) => {
          const authUser = authUsers?.users.find((u) => u.id === profile.user_id);
          return {
            user_id: profile.user_id,
            email: profile.accountant_email!,
          };
        })
        .filter((u) => u.email);
    }

    const results = [];

    // Process each user
    for (const user of usersToProcess) {
      try {
        // Get user profile for export format
        // Get documents from current month
        const startDate = new Date(currentYear, currentMonth - 1, 1);
        const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const { data: documents, error: docsError } = await supabase
          .from("documents")
          .select(
            `
            id,
            filename,
            upload_date,
            category,
            analyses (
              id,
              deadline,
              severity,
              amount,
              bank_account,
              recipient_name,
              simple_summary
            )
          `,
          )
          .eq("user_id", user.user_id)
          .gte("upload_date", startDate.toISOString())
          .lte("upload_date", endDate.toISOString())
          .order("upload_date", { ascending: false });

        if (docsError) throw docsError;

        // Get bookkeeping invoices (OCR-recognized) from current month
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select(
            `
            id,
            filename,
            upload_date,
            invoice_number,
            invoice_date,
            due_date,
            vendor_name,
            vendor_tax_id,
            net_amount,
            vat_rate,
            vat_amount,
            gross_amount,
            currency,
            item_description,
            payment_method,
            expense_category,
            has_handwritten_content
          `,
          )
          .eq("user_id", user.user_id)
          .eq("status", "completed")
          .gte("upload_date", startDate.toISOString())
          .lte("upload_date", endDate.toISOString())
          .order("invoice_date", { ascending: false });

        if (invoicesError) throw invoicesError;

        const docList = documents || [];
        const invoiceList = invoices || [];

        if (docList.length === 0 && invoiceList.length === 0) {
          console.log(`No documents or invoices found for user ${user.user_id} in ${currentMonth}/${currentYear}`);
          results.push({
            user_id: user.user_id,
            email: user.email,
            status: "skipped",
            reason: "No documents or invoices found",
          });
          continue;
        }

        const mimeType = "text/csv;charset=utf-8";
        const monthSuffix = `${currentYear}_${String(currentMonth).padStart(2, "0")}`;
        const monthLabel = new Date(currentYear, currentMonth - 1, 1).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        });
        const attachments: Array<{ filename: string; content: string; type: string }> = [];

        // 1) Documents report (government letters / notices)
        const csvRows: string[][] = [];

        // Header row
        csvRows.push([
          "Date",
          "Deadline",
          "Type",
          "Amount",
          "Bank account",
          "Recipient",
          "Filename",
          "Description",
          "Severity",
        ]);

        // Data rows
        docList.forEach((doc: any) => {
          const analysis = doc.analyses;
          const uploadDate = toUSDate(doc.upload_date);
          const deadline = toUSDate(analysis?.deadline);
          const category = doc.category || "Other";
          const amount = analysis?.amount || "";
          const bankAccount = analysis?.bank_account || "";
          const recipient = analysis?.recipient_name || "";
          const filename = doc.filename;
          const description = analysis?.simple_summary
            ? analysis.simple_summary.substring(0, 100) +
              (analysis.simple_summary.length > 100 ? "..." : "")
            : "";
          const severity = analysis?.severity || "info";

          csvRows.push([
            uploadDate,
            deadline,
            category,
            amount,
            bankAccount,
            recipient,
            filename,
            description,
            severity,
          ]);
        });

        if (docList.length > 0) {
          attachments.push({
            filename: `documents_${monthSuffix}.csv`,
            content: uint8ToBase64(new TextEncoder().encode(rowsToCsv(csvRows))),
            type: mimeType,
          });
        }

        // 2) Bookkeeping invoices report (OCR-recognized, incl. handwritten)
        if (invoiceList.length > 0) {
          const invRows: string[][] = [];
          invRows.push([
            "Invoice date",
            "Due date",
            "Invoice number",
            "Vendor",
            "Tax ID (EIN)",
            "Subtotal",
            "Sales tax rate",
            "Sales tax amount",
            "Total",
            "Currency",
            "Expense category",
            "Payment method",
            "Description",
            "Handwritten",
            "Filename",
          ]);

          invoiceList.forEach((inv: any) => {
            invRows.push([
              toUSDate(inv.invoice_date || inv.upload_date),
              toUSDate(inv.due_date),
              inv.invoice_number || "",
              inv.vendor_name || "",
              inv.vendor_tax_id || "",
              inv.net_amount != null ? String(inv.net_amount) : "",
              inv.vat_rate || "",
              inv.vat_amount != null ? String(inv.vat_amount) : "",
              inv.gross_amount != null ? String(inv.gross_amount) : "",
              inv.currency || "USD",
              inv.expense_category || "",
              inv.payment_method || "",
              inv.item_description || "",
              inv.has_handwritten_content ? "yes" : "",
              inv.filename || "",
            ]);
          });

          attachments.push({
            filename: `invoices_${monthSuffix}.csv`,
            content: uint8ToBase64(new TextEncoder().encode(rowsToCsv(invRows))),
            type: mimeType,
          });
        }

        // Send email via Resend API
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "GovLetter <noreply@govletter.com>", // TODO: Update with your verified domain
            to: user.email,
            subject: isTest
              ? `[TEST] Bookkeeping report - ${monthLabel}`
              : `Bookkeeping report - ${monthLabel}`,
            html: `
              <h2>Hello,</h2>
              <p>Attached is the bookkeeping report for ${monthLabel}.</p>
              <p>The report contains <strong>${docList.length} document(s)</strong> and <strong>${invoiceList.length} invoice(s)</strong>.</p>
              <p>If you have any questions, please reach out to the client.</p>
              <hr>
              <p style="color: #666; font-size: 12px;">This is an automated email from GovLetter.</p>
            `,
            attachments,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const emailData = await emailResponse.json();

        results.push({
          user_id: user.user_id,
          email: user.email,
          status: "sent",
          email_id: emailData.id,
          documents_count: docList.length,
          invoices_count: invoiceList.length,
        });

        console.log(`✅ Report sent to ${user.email} (${docList.length} documents, ${invoiceList.length} invoices)`);
      } catch (userError: any) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        results.push({
          user_id: user.user_id,
          email: user.email,
          status: "error",
          error: userError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? "Unexpected error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
