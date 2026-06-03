// Fill an official government AcroForm PDF with the user's reviewed data and
// download it. The actual filling happens in the `fill-pdf-form` edge function
// (server-side), because government PDF hosts don't allow direct browser fetch
// (no CORS). The frontend just computes the field→value map and posts it.

import { getAcroFieldValues, type FillContext } from "@/lib/formFieldMaps";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE =
  import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface FillResult {
  filledCount: number;
  missingCount: number;
}

/**
 * Computes the field values for `formKey`, sends them to the edge function to
 * fill the official PDF (`pdfUrl`), and downloads the completed PDF.
 *
 * @throws if the form is unmapped or the fill request fails.
 */
export async function fillAndDownloadPdf(
  formKey: string,
  pdfUrl: string,
  ctx: FillContext,
  downloadName?: string,
): Promise<FillResult> {
  const values = getAcroFieldValues(formKey, ctx);
  if (!values) throw new Error(`No verified field map for ${formKey}`);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || ANON_KEY;

  const res = await fetch(`${FUNCTIONS_BASE}/fill-pdf-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pdf_url: pdfUrl, values, filename: downloadName || formKey }),
  });

  if (!res.ok) {
    let msg = `Fill failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const filledCount = Number(res.headers.get("X-Fields-Filled") || 0);
  const missingCount = Number(res.headers.get("X-Fields-Missing") || 0);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${downloadName || formKey}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filledCount, missingCount };
}
