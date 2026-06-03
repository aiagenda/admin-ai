// Form prefill: turn an analyzed document into pre-populated, editable form
// fields so the user mostly reviews and confirms instead of typing everything.
//
// Two data sources are merged:
//  1. `extracted_fields` (jsonb) — structured values the AI pulled from the
//     letter (taxpayer name, address, tax year, notice number, amount, etc.).
//  2. Existing analysis columns (recipient_name, amount, agency) as fallback,
//     so prefill still works for documents analyzed before extraction existed.
//
// Sensitive identifiers (SSN/EIN) are intentionally NOT prefilled — the user
// enters those manually.

export interface ExtractedFields {
  taxpayer_name?: string | null;
  address?: string | null;
  city_state_zip?: string | null;
  tax_year?: string | null;
  notice_number?: string | null;
  account_number?: string | null;
  amount_due?: string | null;
  agency?: string | null;
}

export interface AnalysisForPrefill {
  recipient_name?: string | null;
  amount?: string | null;
  agency?: string | null;
  issuer?: string | null;
  doc_type?: string | null;
  deadline?: string | null;
  extracted_fields?: ExtractedFields | null;
}

export interface PrefillValues {
  taxpayer_name?: string;
  address?: string;
  city_state_zip?: string;
  phone?: string;
  ssn_ein?: string;
  tax_year?: string;
  notice_number?: string;
  amount?: string;
  account_number?: string;
  agency?: string;
  explanation?: string;
}

export interface PrefillFieldDef {
  name: keyof PrefillValues | string;
  label: string;
  type: "text" | "textarea" | "number" | "date";
  required?: boolean;
  placeholder?: string;
  /** True when the value came pre-filled from the letter (shows a badge). */
  prefilledHint?: boolean;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/** Merge extracted_fields + legacy columns into a single prefill value object. */
export function buildPrefillValues(analysis: AnalysisForPrefill | null | undefined): PrefillValues {
  if (!analysis) return {};
  const ef = analysis.extracted_fields || {};
  return {
    taxpayer_name: str(ef.taxpayer_name) ?? str(analysis.recipient_name),
    address: str(ef.address),
    city_state_zip: str(ef.city_state_zip),
    tax_year: str(ef.tax_year),
    notice_number: str(ef.notice_number),
    amount: str(ef.amount_due) ?? str(analysis.amount),
    account_number: str(ef.account_number),
    agency: str(ef.agency) ?? str(analysis.agency) ?? str(analysis.issuer),
    // phone / ssn_ein / explanation are user-entered
  };
}

const BASE_FIELDS: PrefillFieldDef[] = [
  { name: "taxpayer_name", label: "Your full name", type: "text", required: true, placeholder: "As shown on the letter" },
  { name: "address", label: "Street address", type: "text", placeholder: "123 Main St" },
  { name: "city_state_zip", label: "City, State, ZIP", type: "text", placeholder: "Austin, TX 78701" },
  { name: "phone", label: "Daytime phone", type: "text", placeholder: "(555) 123-4567" },
  { name: "ssn_ein", label: "SSN or EIN", type: "text", placeholder: "Enter manually — not auto-filled" },
  { name: "tax_year", label: "Tax year / period", type: "text", placeholder: "2023" },
  { name: "notice_number", label: "Notice / letter number", type: "text", placeholder: "CP14" },
  { name: "amount", label: "Amount in question", type: "text", placeholder: "$0.00" },
];

// Form-specific extra fields keyed by form `key`.
const FORM_EXTRAS: Record<string, PrefillFieldDef[]> = {
  irs_form_9465: [
    { name: "monthly_payment", label: "Monthly payment you can afford", type: "text", required: true, placeholder: "$200" },
    { name: "payment_day", label: "Day of month to pay (1–28)", type: "number", placeholder: "15" },
  ],
  irs_form_843: [
    { name: "explanation", label: "Reason for your request (reasonable cause)", type: "textarea", required: true, placeholder: "Explain why penalties should be removed (illness, disaster, etc.)" },
  ],
  irs_form_12153: [
    { name: "explanation", label: "Why you disagree / your reason for the hearing", type: "textarea", required: true, placeholder: "Explain the basis for your appeal" },
  ],
  irs_form_656: [
    { name: "explanation", label: "Why you can't pay in full", type: "textarea", required: true, placeholder: "Describe your financial hardship" },
  ],
  irs_form_1040x: [
    { name: "explanation", label: "What you are correcting and why", type: "textarea", required: true, placeholder: "Explain the change to your return" },
  ],
  irs_form_2848: [
    { name: "representative_name", label: "Representative's name", type: "text", required: true, placeholder: "Your CPA / attorney" },
  ],
};

/** Field set for a given form key (base review fields + any form-specific ones). */
export function getFormFields(formKey: string): PrefillFieldDef[] {
  return [...BASE_FIELDS, ...(FORM_EXTRAS[formKey] || [])];
}
