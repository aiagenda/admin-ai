// Fill an official IRS fillable PDF's AcroForm fields with the user's reviewed
// data, then download it. Used only for forms with a verified field map
// (see formFieldMaps.ts). pdf-lib runs entirely in the browser; the source PDF
// is the CORS-enabled Supabase-hosted copy passed in as `pdfUrl`.

import { getAcroFieldValues, type FillContext } from "@/lib/formFieldMaps";

export interface FillResult {
  /** How many AcroForm fields were successfully set. */
  filledCount: number;
  /** Field map keys that did not exist in the PDF (for diagnostics). */
  missing: string[];
}

/**
 * Fetches the official PDF, fills the mapped fields, and triggers a download of
 * the completed (non-flattened, still-editable) PDF so the user can review and
 * tweak before printing/signing.
 *
 * @throws if the form is unmapped, the PDF can't be fetched, or has no form.
 */
export async function fillAndDownloadPdf(
  formKey: string,
  pdfUrl: string,
  ctx: FillContext,
  downloadName?: string,
): Promise<FillResult> {
  const values = getAcroFieldValues(formKey, ctx);
  if (!values) throw new Error(`No verified field map for ${formKey}`);

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Could not load the official PDF (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());

  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();

  let filledCount = 0;
  const missing: string[] = [];

  for (const [fieldName, value] of Object.entries(values)) {
    if (!value) continue;
    let field;
    try {
      field = form.getTextField(fieldName);
    } catch {
      missing.push(fieldName);
      continue;
    }
    try {
      field.setText(value);
      filledCount += 1;
    } catch {
      // Comb fields (SSN/EIN/ZIP) enforce a maxLength and reject formatted
      // values like "123-45-6789". Retry with alphanumerics only, truncated.
      try {
        const max = field.getMaxLength();
        const stripped = value.replace(/[^A-Za-z0-9]/g, "");
        field.setText(max != null ? stripped.slice(0, max) : stripped);
        filledCount += 1;
      } catch {
        missing.push(fieldName);
      }
    }
  }

  // Make values render in all viewers without requiring a click.
  try {
    form.updateFieldAppearances();
  } catch {
    /* best effort */
  }

  const out = await pdf.save();
  // Copy into a fresh ArrayBuffer-backed array for a clean Blob part.
  const blob = new Blob([out.slice()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName || `${formKey}-filled.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filledCount, missing };
}
