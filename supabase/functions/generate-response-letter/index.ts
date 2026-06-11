import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Supported response letters. Each maps to focused drafting guidance.
type LetterType =
  | "debt_validation"
  | "debt_dispute"
  | "credit_report_dispute"
  | "medical_bill_negotiation"
  | "medical_bill_itemized"
  | "utility_deferral"
  | "hoa_dispute"
  | "court_answer"
  | "eviction_response"
  | "cp2000_response"
  | "penalty_abatement"
  | "generic_dispute"
  | "generic_response";

const LETTER_GUIDANCE: Record<LetterType, { title: string; guidance: string }> = {
  debt_validation: {
    title: "Debt Validation Letter (FDCPA)",
    guidance:
      "Draft a formal debt validation request under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. §1692g. The writer disputes the debt and requests that the collector verify it. Demand: (1) the amount owed, (2) the name of the original creditor, (3) proof the collector owns or is authorized to collect the debt, and (4) that all collection activity and credit reporting pause until verification is provided. State that this request is made within 30 days of first contact if applicable. Keep a firm but professional tone. Do NOT admit the debt is owed.",
  },
  debt_dispute: {
    title: "Debt Dispute Letter",
    guidance:
      "Draft a letter disputing the accuracy or validity of the debt. Ask the collector to investigate and to stop reporting the disputed item to credit bureaus until resolved. Reference FDCPA rights. Do not admit liability.",
  },
  credit_report_dispute: {
    title: "Credit Report Dispute Letter (FCRA)",
    guidance:
      "Draft a credit-report dispute letter under the Fair Credit Reporting Act (FCRA), 15 U.S.C. §1681i, addressed to a credit bureau (Equifax, Experian, or TransUnion — use a [Credit bureau name/address] placeholder). Clearly identify each inaccurate item (account name, account number placeholder), state specifically why it is inaccurate or unverifiable, and demand the bureau investigate and correct or delete it within 30 days, then send an updated report. Note the right to add a 100-word statement of dispute. Advise enclosing COPIES (never originals) of supporting documents and sending by certified mail with return receipt. Do not admit any debt is valid.",
  },
  medical_bill_negotiation: {
    title: "Medical Bill Negotiation / Financial Assistance Letter",
    guidance:
      "Draft a letter to the hospital/provider billing department requesting a reduction, a hardship discount, financial assistance/charity care eligibility review, and an affordable interest-free payment plan. Politely note willingness to pay a fair amount and request the provider hold the account from collections during review.",
  },
  medical_bill_itemized: {
    title: "Request for Itemized Medical Bill",
    guidance:
      "Draft a letter requesting a fully itemized bill with CPT/HCPCS codes for every charge, so the patient can verify accuracy and check against their insurance EOB. Ask that collection activity pause until the itemized bill is provided.",
  },
  utility_deferral: {
    title: "Utility Payment Arrangement / Deferral Request",
    guidance:
      "Draft a letter to the utility company requesting a deferred payment plan or budget billing to avoid disconnection, and asking them to note any medical or weather protections that may apply. Request written confirmation of any arrangement.",
  },
  hoa_dispute: {
    title: "HOA Violation Dispute Letter",
    guidance:
      "Draft a letter to the homeowners association disputing or requesting a hearing on the alleged covenant violation. Request the specific CC&R provision cited, evidence of the violation, and the formal hearing/appeal process. Ask that fines be held in abeyance pending the hearing.",
  },
  court_answer: {
    title: "Answer / Response to Court Summons (draft)",
    guidance:
      "Draft a general 'Answer' style response to a civil summons/complaint. Include a caption placeholder (court name, parties, case number), a numbered response admitting/denying allegations generally (deny for lack of information where unknown), a short statement of any general defenses, and a request that the case be decided on the merits. CRITICAL: Add a prominent note that most courts REQUIRE filing on the court's official Answer form by the deadline, that this draft is a starting point only, and that they should consult the court self-help center or an attorney. This is not legal advice.",
  },
  eviction_response: {
    title: "Response to Eviction / Pay-or-Quit Notice (draft)",
    guidance:
      "Draft a response to a landlord's eviction or pay-or-quit notice. Depending on the situation, it may request a payment plan, point out needed repairs/habitability, or state intent to contest. Add a prominent note that if a court case (unlawful detainer) is filed, they must respond on the court's official form by the deadline, and should contact local legal aid. Not legal advice.",
  },
  cp2000_response: {
    title: "Response to IRS Notice CP2000",
    guidance:
      "Draft a response to IRS Notice CP2000 (proposed changes from underreported income the IRS matched to third-party records). This letter accompanies the CP2000 Response form included with the notice. Structure it to handle BOTH cases with clearly bracketed options: (A) If the taxpayer AGREES — state agreement with the proposed changes, that they are signing and returning the CP2000 Response form, and how they will pay (full payment, or request an installment agreement via Form 9465). (B) If the taxpayer DISAGREES — state which specific proposed items they dispute and why, and reference attached supporting documentation (corrected 1099s, brokerage statements, basis records, etc.). Make clear this is NOT an amended return (Form 1040-X) unless the IRS instructs otherwise, and that the response is due by the date on the notice (typically 30 days). Do not admit additional tax is owed unless the agree option is chosen.",
  },
  penalty_abatement: {
    title: "IRS Penalty Abatement Request",
    guidance:
      "Draft an IRS penalty abatement request letter. Include both grounds with bracketed placeholders so the taxpayer can keep whichever applies: (1) First-Time Abatement (FTA) — if they have filed and paid on time for the prior three years with no penalties, request FTA administrative relief; and/or (2) Reasonable Cause — explain the specific circumstances that prevented compliance (serious illness, death in the family, natural disaster, unavoidable absence, inability to obtain records, or reliance on a tax professional), with [dates] and [details] as placeholders. Reference the notice number and the specific penalty (failure-to-file §6651(a)(1), failure-to-pay §6651(a)(2), or accuracy §6662). Request that the penalty be removed and written confirmation sent. Note the request may alternatively be filed on Form 843. Do NOT invent facts — use placeholders for the taxpayer's real circumstances.",
  },
  generic_dispute: {
    title: "Dispute / Disagreement Letter",
    guidance:
      "Draft a clear letter contesting the notice. State what the writer disagrees with, why, request a review or correction, and ask for written confirmation. Reference any deadline on the notice.",
  },
  generic_response: {
    title: "Response Letter",
    guidance:
      "Draft a clear, professional response that takes the action the letter requests, references the relevant account/notice numbers, and asks for written confirmation. Reference any deadline.",
  },
};

function isLetterType(v: unknown): v is LetterType {
  return typeof v === "string" && v in LETTER_GUIDANCE;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase env not configured");
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      analysisId?: string;
      letterType?: string;
      userNotes?: string;
      /** "strategies" lists tailored response options; "letter" drafts the letter. */
      mode?: string;
      /** Chosen strategy (sent back when mode === "letter"). */
      strategyTitle?: string;
      strategyDetail?: string;
    };

    const { analysisId, userNotes, strategyTitle, strategyDetail } = body;
    const mode = body.mode === "strategies" ? "strategies" : "letter";
    if (!analysisId) throw new Error("Missing analysisId");
    if (!isLetterType(body.letterType)) throw new Error("Invalid letterType");
    const letterType = body.letterType;

    // Fetch analysis (by analyses.id or document_id) and verify ownership via documents.user_id.
    const analysisFields =
      "id, document_id, simple_summary, legal_summary, recipient_name, amount, agency, issuer, doc_type, state_code, deadline, extracted_fields, mentioned_laws";

    let analysisRow = await supabase
      .from("analyses")
      .select(analysisFields)
      .eq("id", analysisId)
      .maybeSingle();

    if (!analysisRow.data) {
      analysisRow = await supabase
        .from("analyses")
        .select(analysisFields)
        .eq("document_id", analysisId)
        .maybeSingle();
    }

    const analysis = analysisRow.data;
    if (analysisRow.error || !analysis) throw new Error("Analysis not found");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("user_id")
      .eq("id", analysis.document_id)
      .single();

    if (docErr || !doc) throw new Error("Analysis not found");
    if (doc.user_id !== user.id) throw new Error("Forbidden");

    const ef = (analysis.extracted_fields ?? {}) as Record<string, unknown>;
    const guide = LETTER_GUIDANCE[letterType];

    const today = new Date().toISOString().split("T")[0];

    const context = {
      today,
      letter_type: letterType,
      sender_name: ef.taxpayer_name ?? analysis.recipient_name ?? null,
      sender_address: ef.address ?? null,
      sender_city_state_zip: ef.city_state_zip ?? null,
      recipient_agency: ef.agency ?? analysis.agency ?? analysis.issuer ?? null,
      account_or_notice: ef.account_number ?? ef.notice_number ?? null,
      amount: ef.amount_due ?? analysis.amount ?? null,
      state_code: analysis.state_code ?? null,
      deadline: analysis.deadline ?? null,
      doc_type: analysis.doc_type ?? null,
      document_summary: analysis.simple_summary ?? null,
      legal_summary: analysis.legal_summary ?? null,
      user_notes: userNotes ?? null,
    };

    // ---- Mode A: propose tailored response strategies -----------------------
    if (mode === "strategies") {
      const stratSystem = [
        "You are an expert U.S. consumer-rights and legal-correspondence assistant.",
        `The user received a document of type "${analysis.doc_type ?? "unknown"}" and wants to respond with a ${guide.title}.`,
        "Based ONLY on the document context, list the realistic ways this person could respond.",
        "Think like a paralegal explaining options to a worried layperson.",
        "For a court summons / debt, that usually includes: (a) accept/agree and arrange payment or a plan, (b) partially dispute, (c) fully dispute with a specific reason (wrong amount, never received goods/service, identity/mistaken party, debt too old / statute of limitations, already paid), (d) procedural issues (improper service, wrong court).",
        "Tailor the options to THIS document. Do not invent facts about the user. Each option must be something the user could honestly choose.",
        "Be neutral: do NOT tell them they owe the money or that they should admit anything. Present trade-offs.",
        "Return STRICT JSON only.",
        "",
        'JSON shape: {"intro": "1 short sentence framing the choice", "strategies": [{"id": "kebab-case-id", "title": "short option label", "summary": "1-2 sentences on what this means", "bestFor": "when this fits (short)", "considerations": "key risk/trade-off or what proof is needed (short)"}]}',
        "Provide 2 to 5 strategies, most-common first.",
      ].join("\n");

      const stratResp = await fetch("https://api.openai.com/v1/chat/completions", {
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
            { role: "system", content: stratSystem },
            { role: "user", content: `Document context (JSON):\n${JSON.stringify(context, null, 2)}` },
          ],
        }),
      });

      if (!stratResp.ok) throw new Error(`OpenAI API error: ${await stratResp.text()}`);
      const stratData = await stratResp.json();
      const stratContent = stratData.choices?.[0]?.message?.content;
      if (!stratContent) throw new Error("OpenAI returned empty content");

      const stratParsed = JSON.parse(stratContent) as {
        intro?: string;
        strategies?: Array<{
          id?: string;
          title?: string;
          summary?: string;
          bestFor?: string;
          considerations?: string;
        }>;
      };

      const strategies = (Array.isArray(stratParsed.strategies) ? stratParsed.strategies : [])
        .filter((s) => s && s.title)
        .slice(0, 5)
        .map((s, i) => ({
          id: s.id || `option-${i + 1}`,
          title: s.title as string,
          summary: s.summary ?? "",
          bestFor: s.bestFor ?? "",
          considerations: s.considerations ?? "",
        }));

      if (strategies.length === 0) throw new Error("No strategies generated");

      return new Response(
        JSON.stringify({
          success: true,
          mode: "strategies",
          letterType,
          title: guide.title,
          intro: stratParsed.intro ?? "Pick the approach that fits your situation.",
          strategies,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Mode B: draft the letter for the chosen strategy --------------------
    const strategyLines = strategyTitle
      ? [
          "",
          "CHOSEN RESPONSE STRATEGY (write the letter to match this exactly):",
          `- Approach: ${strategyTitle}`,
          strategyDetail ? `- Details: ${strategyDetail}` : "",
          "Do not contradict this choice. If the user chose to dispute, do NOT admit liability. If they chose to accept/arrange payment, write accordingly but never invent amounts they didn't confirm.",
        ].filter(Boolean)
      : [];

    const systemPrompt = [
      "You are an expert U.S. consumer-rights and correspondence assistant.",
      `Write a complete, ready-to-send ${guide.title} in formal U.S. business-letter format.`,
      guide.guidance,
      ...strategyLines,
      "",
      "Rules:",
      "- Use a standard letter layout: sender block, date, recipient block, RE: line, salutation, body, closing, signature line.",
      "- Where a value is unknown, insert a clearly marked placeholder in square brackets (e.g., [Your full name], [Account number], [Court name]).",
      "- Be concise, factual, and professional. No invented facts. Do not state the debt/charge is valid.",
      "- Always include a short final line noting the letter is a self-help draft and not legal advice, and to keep a copy and send by trackable mail where appropriate.",
      "- Return STRICT JSON only.",
      "",
      'JSON shape: {"subject": "short RE: line", "body": "the full letter text with real newlines", "checklist": ["3-6 short next-step bullets: what to attach, how to send, deadline reminder"]}',
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Document + extracted context (JSON):\n${JSON.stringify(context, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");

    const parsed = JSON.parse(content) as {
      subject?: string;
      body?: string;
      checklist?: string[];
    };

    if (!parsed.body) throw new Error("No letter body generated");

    return new Response(
      JSON.stringify({
        success: true,
        letterType,
        mode: "letter",
        title: guide.title,
        strategyTitle: strategyTitle ?? null,
        subject: parsed.subject ?? guide.title,
        body: parsed.body,
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist.slice(0, 8) : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : 400;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
