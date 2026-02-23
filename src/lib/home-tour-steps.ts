export type TourStepSide = "top" | "bottom" | "left" | "right";

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  side: TourStepSide;
  nextBtnText?: string;
}

const SELECTORS = {
  welcome: "[data-tour='welcome']",
  stats: "[data-tour='stats']",
  upload: "[data-tour='upload']",
  archive: "[data-tour='archive']",
  invoices: "[data-tour='invoices']",
  deadlines: "[data-tour='deadlines']",
  usage: "[data-tour='usage']",
  search: "[data-tour='search']",
  navPricing: "[data-tour='nav-pricing']",
  navProfile: "[data-tour='nav-profile']",
} as const;

export function getHomeTourSteps(hasInvoiceAccess: boolean): TourStep[] {
  const steps: TourStep[] = [
    { selector: SELECTORS.welcome, title: "Üdv a főoldalon! 👋", description: "Itt láthatja a mai áttekintését. A kártyákon a dokumentumok, elemzések és a közelgő határidők összesítése jelenik meg.", side: "bottom" },
    { selector: SELECTORS.stats, title: "Statisztikák", description: "Összes dokumentum, befejezett elemzés és sürgős határidők egy helyen. Így mindig látja, hol tart.", side: "bottom" },
    { selector: SELECTORS.upload, title: "Dokumentum feltöltése", description: "Itt töltheti fel PDF-et vagy fotót. Az AI elemzi a dokumentumot, összefoglalja a tartalmat, és megmondja a teendőket és határidőket.", side: "bottom" },
    { selector: SELECTORS.archive, title: "Dokumentum archívum", description: "Minden feltöltött dokumentum és elemzés egy helyen. Bármikor megnyithatja, szűrhet és kereshet.", side: "bottom" },
  ];
  if (hasInvoiceAccess) {
    steps.push({ selector: SELECTORS.invoices, title: "Könyvelési összefoglaló", description: "Számlák feltöltése, OCR, kategorizálás és Excel export a könyvelőnek – a Könyvelés menüpont alatt.", side: "bottom" });
  }
  steps.push(
    { selector: SELECTORS.deadlines, title: "Közelgő határidők", description: "Itt láthatja a dokumentumokból kiolvasott határidőket, hogy semmi ne maradjon le.", side: "top" },
    { selector: SELECTORS.usage, title: "Felhasználási limit", description: "A havi feltöltési keret. Ha több dokumentumra van szüksége, az Árak menüben bővítheti a csomagját.", side: "top" },
    { selector: SELECTORS.navPricing, title: "Árak", description: "Itt megtekintheti a csomagokat és bővítheti a limitet. Az Árak menü mindig a felső sávban elérhető.", side: "bottom" },
    { selector: SELECTORS.navProfile, title: "Profil és Beállítások", description: "A Profil menüben a Beállítások alatt a „Kártyák sorrendje” blokkban drag & drop-pal átrendezheti a főoldal blokkjainak sorrendjét – különösen mobilon hasznos.", side: "bottom" },
    { selector: SELECTORS.search, title: "AI Keresés", description: "Kérdezzen bármit a dokumentumairól természetes nyelven. Pl. NAV levelek, fizetési határidők – a rendszer a releváns elemzésekből válaszol.", side: "top", nextBtnText: "Kész" },
  );
  return steps;
}

export const HOME_TOUR_STORAGE_KEY = "adminai_home_tour_done";

export function isHomeTourDone(userId: string): boolean {
  try {
    const raw = localStorage.getItem(HOME_TOUR_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, boolean>;
    return data[userId] === true;
  } catch { return false; }
}

export function setHomeTourDone(userId: string): void {
  try {
    const raw = localStorage.getItem(HOME_TOUR_STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    data[userId] = true;
    localStorage.setItem(HOME_TOUR_STORAGE_KEY, JSON.stringify(data));
  } catch {
    localStorage.setItem(HOME_TOUR_STORAGE_KEY, JSON.stringify({ [userId]: true }));
  }
}
