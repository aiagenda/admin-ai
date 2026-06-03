// Server-side AcroForm PDF filler.
//
// The browser cannot fetch most government PDFs directly (no CORS headers), so
// the frontend computes the field→value map and POSTs it here. This function
// fetches the official PDF server-side (no CORS limit), fills its AcroForm
// fields, and returns the completed PDF. Works for any agency form whose URL
// host is allow-listed below.
//
// Body: { pdf_url: string, values: Record<string, string>, filename?: string }

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Only fetch PDFs from trusted government / our own storage hosts (anti-SSRF).
const ALLOWED_HOST_SUFFIXES = [
  ".irs.gov",
  ".ssa.gov",
  ".uscis.gov",
  ".va.gov",
  ".vba.va.gov",
  ".supabase.co",
];

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { pdf_url, values, filename } = await req.json();

    if (typeof pdf_url !== "string" || !isAllowedUrl(pdf_url)) {
      return new Response(JSON.stringify({ error: "Invalid or disallowed pdf_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!values || typeof values !== "object") {
      return new Response(JSON.stringify({ error: "Missing field values" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfRes = await fetch(pdf_url);
    if (!pdfRes.ok) {
      return new Response(JSON.stringify({ error: `Could not fetch PDF (${pdfRes.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const bytes = new Uint8Array(await pdfRes.arrayBuffer());

    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
    const form = pdf.getForm();

    let filled = 0;
    const missing: string[] = [];

    for (const [name, value] of Object.entries(values as Record<string, string>)) {
      if (!value) continue;
      let field;
      try {
        field = form.getTextField(name);
      } catch {
        missing.push(name);
        continue;
      }
      try {
        field.setText(value);
        filled += 1;
      } catch {
        // Comb fields (SSN/EIN/ZIP) enforce maxLength and reject formatted values.
        try {
          const max = field.getMaxLength();
          const stripped = value.replace(/[^A-Za-z0-9]/g, "");
          field.setText(max != null ? stripped.slice(0, max) : stripped);
          filled += 1;
        } catch {
          missing.push(name);
        }
      }
    }

    try {
      form.updateFieldAppearances();
    } catch {
      /* best effort */
    }

    const out = await pdf.save();
    return new Response(out, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(filename || "filled").replace(/[^\w.-]/g, "_")}.pdf"`,
        "X-Fields-Filled": String(filled),
        "X-Fields-Missing": String(missing.length),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || "Fill failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
