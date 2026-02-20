import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "@/driver-tour.css";

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

export function getHomeTourSteps(hasInvoiceAccess = false): DriveStep[] {
  const steps: DriveStep[] = [
    {
      element: SELECTORS.welcome,
      popover: {
        title: "Üdv a főoldalon! 👋",
        description:
          "Itt láthatja a mai áttekintését. A kártyákon a dokumentumok, elemzések és a közelgő határidők összesítése jelenik meg.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: SELECTORS.stats,
      popover: {
        title: "Statisztikák",
        description:
          "Összes dokumentum, befejezett elemzés és sürgős határidők egy helyen. Így mindig látja, hol tart.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: SELECTORS.upload,
      popover: {
        title: "Dokumentum feltöltése",
        description:
          "Itt töltheti fel PDF-et vagy fotót. Az AI elemzi a dokumentumot, összefoglalja a tartalmat, és megmondja a teendőket és határidőket.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: SELECTORS.archive,
      popover: {
        title: "Dokumentum archívum",
        description:
          "Minden feltöltött dokumentum és elemzés egy helyen. Bármikor megnyithatja, szűrhet és kereshet.",
        side: "bottom",
        align: "start",
      },
    },
  ];

  if (hasInvoiceAccess) {
    steps.push({
      element: SELECTORS.invoices,
      popover: {
        title: "Könyvelési összefoglaló",
        description:
          "Számlák feltöltése, OCR, kategorizálás és Excel export a könyvelőnek – a Könyvelés menüpont alatt.",
        side: "bottom",
        align: "start",
      },
    });
  }

  steps.push(
    {
      element: SELECTORS.deadlines,
      popover: {
        title: "Közelgő határidők",
        description:
          "Itt láthatja a dokumentumokból kiolvasott határidőket, hogy semmi ne maradjon le.",
        side: "top",
        align: "start",
      },
    },
    {
      element: SELECTORS.usage,
      popover: {
        title: "Felhasználási limit",
        description:
          "A havi feltöltési keret. Ha több dokumentumra van szüksége, az Árak menüben bővítheti a csomagját.",
        side: "top",
        align: "start",
      },
    },
    {
      element: SELECTORS.navPricing,
      popover: {
        title: "Árak",
        description:
          "Itt megtekintheti a csomagokat és bővítheti a limitet. Az Árak menü mindig a felső sávban elérhető.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: SELECTORS.navProfile,
      popover: {
        title: "Profil és Beállítások",
        description:
          "A Profil menüben a Beállítások alatt a „Kártyák sorrendje” blokkban drag & drop-pal átrendezheti a főoldal blokkjainak sorrendjét – különösen mobilon hasznos.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: SELECTORS.search,
      popover: {
        title: "AI Keresés",
        description:
          "Kérdezzen bármit a dokumentumairól természetes nyelven. Pl. NAV levelek, fizetési határidők – a rendszer a releváns elemzésekből válaszol.",
        side: "top",
        align: "start",
        nextBtnText: "Kész",
      },
    }
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
  } catch {
    return false;
  }
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

export function runHomeTour(options: {
  hasInvoiceAccess: boolean;
  userId?: string;
  onDone?: () => void;
}): void {
  const { hasInvoiceAccess, userId, onDone } = options;
  const steps = getHomeTourSteps(hasInvoiceAccess);
  const driverObj = driver({
    showProgress: true,
    smoothScroll: true,
    animate: true,
    popoverClass: "driver-spotlight",
    overlayColor: "#0a0a0a",
    overlayOpacity: 0.78,
    stageRadius: 14,
    stagePadding: 10,
    nextBtnText: "Következő",
    prevBtnText: "Előző",
    doneBtnText: "Kész",
    progressText: "{{current}} / {{total}}",
    steps,
    onDestroyed: () => {
      if (userId) setHomeTourDone(userId);
      onDone?.();
    },
  });
  driverObj.drive();
}
