// Display label helpers — US-only, English.

/** Extract English segment from bilingual playbook titles ("HU text / English text"). */
export function formatPlaybookName(name: string): string {
  const slash = name.indexOf(" / ");
  if (slash === -1) return name;
  const before = name.slice(0, slash).trim();
  const after = name.slice(slash + 3).trim();
  // If one segment has Hungarian accents, prefer the other
  const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
  if (HU.test(before) && !HU.test(after)) return after;
  if (HU.test(after) && !HU.test(before)) return before;
  return after || before;
}

// Document categories are stored with legacy Hungarian-derived keys.
const CATEGORY_LABELS: Record<string, string> = {
  adozas: "Tax",
  egeszsegugy: "Healthcare",
  oktatas: "Education",
  szocialis: "Social services",
  kozlekedes: "Transportation",
  ingatlan: "Real estate",
  uzlet: "Business",
  egyeb: "Other",
};

export function formatCategoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  const key = category.toLowerCase();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  // Fallback: humanize unknown keys ("legal_professional" -> "Legal professional")
  const words = category.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatTagLabel(tag: string): string {
  return tag;
}
