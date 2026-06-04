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

export function formatCategoryLabel(category: string | null | undefined): string {
  if (!category) return "";
  return category.replace(/_/g, " ");
}

export function formatTagLabel(tag: string): string {
  return tag;
}
