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
  stats: "Statisztika (dokumentumok, elemzések, határidők)",
  upload: "Új dokumentum feltöltése",
  archive: "Dokumentum archívum",
  invoices: "Könyvelési összefoglaló",
  deadlines: "Közelgő határidők",
  usage: "Felhasználási limit",
  search: "AI Keresés",
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
