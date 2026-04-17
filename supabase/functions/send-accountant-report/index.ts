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
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("accountant_export_format")
          .eq("user_id", user.user_id)
          .single();

        const exportFormat = profile?.accountant_export_format || "csv";

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

        if (!documents || documents.length === 0) {
          console.log(`No documents found for user ${user.user_id} in ${currentMonth}/${currentYear}`);
          results.push({
            user_id: user.user_id,
            email: user.email,
            status: "skipped",
            reason: "No documents found",
          });
          continue;
        }

        // Generate CSV report (Excel-compatible with BOM)
        const csvRows: string[][] = [];

        // Header row
        csvRows.push([
          "Dátum",
          "Határidő",
          "Típus",
          "Összeg",
          "Bankszámlaszám",
          "Kedvezményezett",
          "Fájlnév",
          "Leírás",
          "Súlyosság",
        ]);

        // Data rows
        documents.forEach((doc: any) => {
          const analysis = doc.analyses;
          const uploadDate = new Date(doc.upload_date).toISOString().split("T")[0];
          const deadline = analysis?.deadline
            ? new Date(analysis.deadline).toISOString().split("T")[0]
            : "";
          const category = doc.category || "Egyéb";
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

        // Convert to CSV string with BOM for Excel compatibility
        const csvContent = csvRows
          .map((row) =>
            row
              .map((cell) => {
                const cellStr = String(cell || "");
                if (cellStr.includes(",") || cellStr.includes("\n") || cellStr.includes('"')) {
                  return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
              })
              .join(","),
          )
          .join("\n");

        const BOM = "\uFEFF";
        const csvWithBOM = BOM + csvContent;
        const reportBuffer = new TextEncoder().encode(csvWithBOM);
        const fileName = exportFormat === "excel"
          ? `konyvelo_jelentes_${currentYear}_${String(currentMonth).padStart(2, "0")}.csv`
          : `konyvelo_jelentes_${currentYear}_${String(currentMonth).padStart(2, "0")}.csv`;
        const mimeType = "text/csv;charset=utf-8";

        // Convert buffer to base64 for email attachment
        const base64Report = uint8ToBase64(reportBuffer);

        // Send email via Resend API
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AdminAI <noreply@adminai.hu>", // TODO: Update with your verified domain
            to: user.email,
            subject: isTest
              ? `[TESZT] Könyvelő jelentés - ${currentYear}. ${currentMonth}. hónap`
              : `Könyvelő jelentés - ${currentYear}. ${currentMonth}. hónap`,
            html: `
              <h2>Kedves Könyvelő!</h2>
              <p>Mellékletben küldjük a ${currentYear}. ${currentMonth}. hónap dokumentumainak jelentését.</p>
              <p><strong>Összesen ${documents.length} dokumentum</strong> található a jelentésben.</p>
              <p>Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba a felhasználóval.</p>
              <hr>
              <p style="color: #666; font-size: 12px;">Ez egy automatikus email az AdminAI rendszertől.</p>
            `,
            attachments: [
              {
                filename: fileName,
                content: base64Report,
                type: mimeType,
              },
            ],
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
          documents_count: documents.length,
        });

        console.log(`✅ Report sent to ${user.email} (${documents.length} documents)`);
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
