import { enUS } from "date-fns/locale";

export function getAppDateLocale() {
  return enUS;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
