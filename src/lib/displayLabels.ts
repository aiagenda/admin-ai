import { isUsMarket } from "@/lib/market";

const HU_ACCENT = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;

/** Prefer English segment in bilingual playbook titles (e.g. "HU text / English text"). */
export function formatPlaybookName(name: string): string {
  if (!isUsMarket()) return name;
  const slash = name.indexOf(" / ");
  if (slash === -1) return stripHungarianSegments(name);
  const before = name.slice(0, slash).trim();
  const after = name.slice(slash + 3).trim();
  if (HU_ACCENT.test(before) && !HU_ACCENT.test(after)) return after;
  if (HU_ACCENT.test(after) && !HU_ACCENT.test(before)) return before;
  return after || before;
}

function stripHungarianSegments(text: string): string {
  if (!HU_ACCENT.test(text)) return text;
  const paren = text.match(/\(([^)]*)\)/);
  if (paren && !HU_ACCENT.test(paren[1])) return text.replace(paren[0], "").replace(/\s+/g, " ").trim();
  return text.replace(/\s*\([^)]*[áéíóöőúüűÁÉÍÓÖŐÚÜŰ][^)]*\)/g, "").trim();
}

const CATEGORY_EN: Record<string, string> = {
  adozas: "Tax",
  egeszsegugy: "Health",
  oktatas: "Education",
  szocialis: "Social Services",
  kozlekedes: "Transportation",
  ingatlan: "Real Estate",
  uzlet: "Business",
  szamla: "Invoice",
  hatosagi_level: "Official Notice",
  egyeb: "Other",
};

const TAG_EN: Record<string, string> = {
  adó: "tax",
  ado: "tax",
  nav: "irs",
  tb: "social security",
  számla: "invoice",
  szamla: "invoice",
  fizetés: "payment",
  fizetes: "payment",
  "fizetési határidő": "payment deadline",
  "fizetési kötelezettség": "payment obligation",
  átutalás: "transfer",
  atutalas: "transfer",
  üzlet: "business",
  uzlet: "business",
  sürgős: "urgent",
  surgo: "urgent",
  végrehajtás: "collections",
  vegrehajtas: "collections",
};

export function formatCategoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  if (!isUsMarket()) return category;
  return CATEGORY_EN[category] ?? category.replace(/_/g, " ");
}

export function formatTagLabel(tag: string): string {
  if (!isUsMarket()) return tag;
  const key = tag.toLowerCase().trim();
  return TAG_EN[key] ?? tag;
}
