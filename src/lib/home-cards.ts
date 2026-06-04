export const HOME_CARD_IDS = [
  "stats",
  "upload",
  "archive",
  "invoices",
  "deadlines",
  "usage",
  "search",
] as const;

export type HomeCardId = (typeof HOME_CARD_IDS)[number];

export const HOME_CARD_LABELS: Record<HomeCardId, string> = {
  stats: "Statistics (documents, analyses, deadlines)",
  upload: "Upload new document",
  archive: "Document archive",
  invoices: "Bookkeeping summary",
  deadlines: "Upcoming deadlines",
  usage: "Usage limit",
  search: "AI Search",
};

const STORAGE_KEY = "home_card_order";

export function getHomeCardOrder(): HomeCardId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...HOME_CARD_IDS];
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id): id is HomeCardId =>
      HOME_CARD_IDS.includes(id as HomeCardId)
    );
    const missing = HOME_CARD_IDS.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return [...HOME_CARD_IDS];
  }
}

export function setHomeCardOrder(order: HomeCardId[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function getHomeCardLabel(id: HomeCardId): string {
  return HOME_CARD_LABELS[id];
}
