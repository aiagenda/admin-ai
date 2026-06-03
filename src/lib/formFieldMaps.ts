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

/** Combine street + city/state/zip into one line for single-address forms. */
function combinedAddress(ctx: FillContext): string {
  return [ctx.address, ctx.city_state_zip].filter(Boolean).join(", ");
}

/** Split an SSN string into the 3-2-4 digit groups some forms use. */
function splitSSN(ssn?: string): { a: string; b: string; c: string } {
  const d = (ssn || "").replace(/\D/g, "");
  return { a: d.slice(0, 3), b: d.slice(3, 5), c: d.slice(5, 9) };
}

/** Split a ZIP into 5-digit + optional 4-digit groups. */
function splitZip(zip?: string): { five: string; four: string } {
  const d = (zip || "").replace(/\D/g, "");
  return { five: d.slice(0, 5), four: d.slice(5, 9) };
}

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

// Form 1040-X — Amended return. Identity block on page 1. The address fields
// (f1_09..f1_13) live under an extra `Address_ReadOrder` subform.
const X1040_AR = "topmostSubform[0].Page1[0].Address_ReadOrder[0].";
const f1040x: FieldSetter = (ctx) => {
  const { first, last } = splitName(ctx.taxpayer_name);
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const out: Record<string, string> = {};
  if (ctx.tax_year) out[`${P1}f1_01[0]`] = ctx.tax_year;
  if (first) out[`${P1}f1_03[0]`] = first;
  if (last) out[`${P1}f1_04[0]`] = last;
  if (ctx.ssn_ein) out[`${P1}f1_05[0]`] = ctx.ssn_ein;
  if (ctx.address) out[`${X1040_AR}f1_09[0]`] = ctx.address;
  if (city) out[`${X1040_AR}f1_11[0]`] = city;
  if (state) out[`${X1040_AR}f1_12[0]`] = state;
  if (zip) out[`${X1040_AR}f1_13[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${X1040_AR}f1_11[0]`] = ctx.city_state_zip;
  return out;
};

// Form 12153 — Collection Due Process hearing request. Descriptive field names.
const f12153: FieldSetter = (ctx) => {
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${P1}TaxpayerName1[0]`] = ctx.taxpayer_name;
  if (ctx.ssn_ein) out[`${P1}TIN_1[0]`] = ctx.ssn_ein;
  if (ctx.address) out[`${P1}CurrentAddress1[0]`] = ctx.address;
  if (city) out[`${P1}City1[0]`] = city;
  if (state) out[`${P1}State1[0]`] = state;
  if (zip) out[`${P1}ZIPCode1[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${P1}City1[0]`] = ctx.city_state_zip;
  if (ctx.phone) out[`${P1}TelephoneNumberBestTime1[0].TelephoneNumber[0]`] = ctx.phone;
  return out;
};

// Form 2848 — Power of Attorney. Descriptive field names; single address field.
const f2848: FieldSetter = (ctx) => {
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${P1}TaxpayerName[0]`] = ctx.taxpayer_name;
  const addr = combinedAddress(ctx);
  if (addr) out[`${P1}TaxpayerAddress[0]`] = addr;
  if (ctx.ssn_ein) out[`${P1}TaxpayerIDSSN[0]`] = ctx.ssn_ein;
  if (ctx.phone) out[`${P1}TaxpayerTelephone[0]`] = ctx.phone;
  if (ctx.representative_name) out[`${P1}RepresentativesName1[0]`] = ctx.representative_name;
  return out;
};

// Form 656 — Offer in Compromise. Note the different page subform prefix.
const F656P1 = "topmostSubform[0].F656_Page1[0].";
const f656: FieldSetter = (ctx) => {
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${F656P1}Your_First_Middle_Last_Name[0]`] = ctx.taxpayer_name;
  if (ctx.ssn_ein) out[`${F656P1}YourSocialSecurityNumber[0]`] = ctx.ssn_ein;
  const addr = combinedAddress(ctx);
  if (addr) out[`${F656P1}Your_Home_Address[0]`] = addr;
  return out;
};

// Form 433-A — Collection Information Statement (Individuals). Nested paths;
// name + single combined address only (the rest is a financial statement).
const A433 = "topmostSubform[0].Page1[0].c1[0].Lines1a-b[0].";
const f433a: FieldSetter = (ctx) => {
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${A433}p1-t4[0]`] = ctx.taxpayer_name;
  const addr = combinedAddress(ctx);
  if (addr) out[`${A433}p1-t5[0]`] = addr;
  return out;
};

// Form 433-B — Collection Information Statement (Businesses). Descriptive names.
const B433 = "topmostSubform[0].Page1[0].Line1a-f[0].";
const f433b: FieldSetter = (ctx) => {
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${B433}p1_1_1a[0]`] = ctx.taxpayer_name; // business name
  if (ctx.address) out[`${B433}p1_4_1bMailAdd[0]`] = ctx.address;
  if (city) out[`${B433}p1_5_1bCity[0]`] = city;
  if (state) out[`${B433}p1_6_1bstate[0]`] = state;
  if (zip) out[`${B433}p1_7_1bZIP[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${B433}p1_5_1bCity[0]`] = ctx.city_state_zip;
  return out;
};

// Form 911 — Request for Taxpayer Advocate Service Assistance (hardship help).
const P911 = "topmostSubform[0].page1[0].";
const f911: FieldSetter = (ctx) => {
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${P911}taxpayerName[0]`] = ctx.taxpayer_name;
  if (ctx.ssn_ein) out[`${P911}taxpayerTIN[0]`] = ctx.ssn_ein;
  if (ctx.address) out[`${P911}taxpayerAddressStreet[0]`] = ctx.address;
  if (city) out[`${P911}taxpayerAddressCity[0]`] = city;
  if (state) out[`${P911}taxpayerAddressState[0]`] = state;
  if (zip) out[`${P911}taxpayerAddressZIPCode[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${P911}taxpayerAddressCity[0]`] = ctx.city_state_zip;
  if (ctx.phone) out[`${P911}taxpayerDaytimePhone[0]`] = ctx.phone;
  return out;
};

// Form 9423 — Collection Appeal Request.
const f9423: FieldSetter = (ctx) => {
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const out: Record<string, string> = {};
  if (ctx.taxpayer_name) out[`${P1}Q1_Taxname[0]`] = ctx.taxpayer_name;
  if (ctx.ssn_ein) out[`${P1}Q3SSN[0]`] = ctx.ssn_ein;
  if (ctx.phone) out[`${P1}Q5TaxhomePhone[0]`] = ctx.phone;
  if (ctx.address) out[`${P1}Q7TaxAddress[0]`] = ctx.address;
  if (city) out[`${P1}Q8City[0]`] = city;
  if (state) out[`${P1}Q9State[0]`] = state;
  if (zip) out[`${P1}Q10ZIP[0]`] = zip;
  if (!city && !state && !zip && ctx.city_state_zip) out[`${P1}Q8City[0]`] = ctx.city_state_zip;
  return out;
};

// VA Form 20-0995 — Decision Review Request: Supplemental Claim. Uses split
// SSN (3-2-4) and split ZIP (5-4), and a separate first/last name.
const VA = "form1[0].#subform[16].";
const f_va_0995: FieldSetter = (ctx) => {
  const { first, last } = splitName(ctx.taxpayer_name);
  const { city, state, zip } = splitCityStateZip(ctx.city_state_zip);
  const ssn = splitSSN(ctx.ssn_ein);
  const z = splitZip(zip);
  const out: Record<string, string> = {};
  if (first) out[`${VA}VeteransFirstName[0]`] = first;
  if (last) out[`${VA}VeteransLastName[0]`] = last;
  if (ssn.a) out[`${VA}FirstThreeNumbers[0]`] = ssn.a;
  if (ssn.b) out[`${VA}SecondTwoNumbers[0]`] = ssn.b;
  if (ssn.c) out[`${VA}LastFourNumbers[0]`] = ssn.c;
  if (ctx.address) out[`${VA}CurrentMailingAddress_NumberAndStreet[0]`] = ctx.address;
  if (city) out[`${VA}CurrentMailingAddress_City[0]`] = city;
  if (state) out[`${VA}CurrentMailingAddress_StateOrProvince[0]`] = state;
  if (z.five) out[`${VA}CurrentMailingAddress_ZIPOrPostalCode_FirstFiveNumbers[0]`] = z.five;
  if (z.four) out[`${VA}CurrentMailingAddress_ZIPOrPostalCode_LastFourNumbers[0]`] = z.four;
  return out;
};

/** Map of form key → AcroForm field setter. Only these forms get true fill. */
const FIELD_MAPS: Record<string, FieldSetter> = {
  irs_form_9465: f9465,
  irs_form_843: f843,
  irs_form_1040x: f1040x,
  irs_form_12153: f12153,
  irs_form_2848: f2848,
  irs_form_656: f656,
  irs_form_433a: f433a,
  irs_form_433b: f433b,
  irs_form_911: f911,
  irs_form_9423: f9423,
  va_form_20_0995: f_va_0995,
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
