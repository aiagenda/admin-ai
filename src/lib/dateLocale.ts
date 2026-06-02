import { enUS, hu } from "date-fns/locale";
import { isUsMarket } from "@/lib/market";

export function getAppDateLocale() {
  return isUsMarket() ? enUS : hu;
}

export function formatMoney(amount: number): string {
  if (isUsMarket()) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  }
  return `${amount.toLocaleString("hu-HU")} Ft`;
}
