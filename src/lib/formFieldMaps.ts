// Verified AcroForm field maps for official IRS fillable PDFs.
//
// The cryptic field names (e.g. "topmostSubform[0].Page1[0].f1_3[0]") were
// resolved to their real meaning by reading each PDF's XFA accessibility
// labels (the <speak> text bound to every field). This is ground truth from
// the IRS form itself — not guessed from position — so values land in the
// correct boxes.
//
// Only forms with a verified map here get true PDF auto-fill. Everything else
// falls back to the generated worksheet PDF.

import type { PrefillValues } from "@/lib/formPrefill";

/** A computed value bag passed to the field mappers. */
export interface FillContext extends PrefillValues {
  // Extra per-form values collected in the FormFiller (e.g. monthly_payment).
  [key: string]: string | undefined;
}

type FieldSetter = (ctx: FillContext) => Record<string, string>;

// Helpers ---------------------------------------------------------------------

function splitName(full?: string): { first: string; last: string } {
  if (!full) return { first: "", last: "" };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function splitCityStateZip(v?: string): { city: string; state: string; zip: string } {
  if (!v) return { city: "", state: "", zip: "" };
  // e.g. "Austin, TX 78701"
  const zipMatch = v.match(/(\d{5}(?:-\d{4})?)\s*$/);
  const zip = zipMatch ? zipMatch[1] : "";
  let rest = zip ? v.slice(0, v.length - zip.length).trim() : v.trim();
  rest = rest.replace(/,\s*$/, "");
  const stateMatch = rest.match(/[,\s]([A-Za-z]{2})\s*$/);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "";
  let city = state ? rest.slice(0, rest.length - stateMatch![0].length).trim() : rest;
  city = city.replace(/,\s*$/, "");
  return { city, state, zip };
}

const P1 = "topmostSubform[0].Page1[0].";

// Per-form maps ---------------------------------------------------------------

const f9465: FieldSetter = (ctx) => {
  const { first, last } = splitName(ctx.taxpayer_name);
  const out: Record<string, string> = {};
  out[`${P1}f1_1[0]`] = "1040"; // "This request is for Form(s)" — default to 1040
  if (ctx.tax_year) out[`${P1}f1_2[0]`] = ctx.tax_year;
  if (first) out[`${P1}f1_3[0]`] = first;
  if (last) out[`${P1}f1_4[0]`] = last;
  if (ctx.ssn_ein) out[`${P1}f1_5[0]`] = ctx.ssn_ein;
  if (ctx.address) out[`${P1}f1_9[0]`] = ctx.address;
  if (ctx.city_state_zip) out[`${P1}f1_11[0]`] = ctx.city_state_zip;
  if (ctx.phone) out[`${P1}f1_17[0]`] = ctx.phone;
  if (ctx.amount) {
    out[`${P1}f1_22[0]`] = ctx.amount; // line 5 total amount owed
    out[`${P1}f1_24[0]`] = ctx.amount; // line 7 (5+6) — same when no line 6
    out[`${P1}f1_26[0]`] = ctx.amount; // line 9 amount owed
  }
  if (ctx.monthly_payment) out[`${P1}f1_28[0]`] = ctx.monthly_payment; // line 11a
  if (ctx.payment_day) out[`${P1}f1_30[0]`] = ctx.payment_day; // line 12 day of month
  return out;
};

const f843: FieldSetter = (ctx) => {
  const out: Record<string, string> = {};
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  if (ctx.taxpayer_name) out[`${P1}f1_2[0]`] = ctx.taxpayer_name;
  if (ctx.ssn_ein) out[`${P1}f1_3[0]`] = ctx.ssn_ein;
  if (ctx.address) out[`${P1}f1_6[0]`] = ctx.address;
  if (city) out[`${P1}f1_8[0]`] = city;
  if (state) out[`${P1}f1_9[0]`] = state;
  if (zip) out[`${P1}f1_10[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${P1}f1_8[0]`] = ctx.city_state_zip;
  if (ctx.phone) out[`${P1}f1_16[0]`] = ctx.phone;
  if (ctx.amount) out[`${P1}f1_19[0]`] = ctx.amount; // line 2 amount to be refunded/abated
  return out;
};

/** Map of form key → AcroForm field setter. Only these forms get true fill. */
const FIELD_MAPS: Record<string, FieldSetter> = {
  irs_form_9465: f9465,
  irs_form_843: f843,
};

export function hasVerifiedFieldMap(formKey: string): boolean {
  return formKey in FIELD_MAPS;
}

/** Returns the AcroForm field → value map for a form, or null if unmapped. */
export function getAcroFieldValues(formKey: string, ctx: FillContext): Record<string, string> | null {
  const setter = FIELD_MAPS[formKey];
  if (!setter) return null;
  return setter(ctx);
}
