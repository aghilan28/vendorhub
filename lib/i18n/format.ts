import { defaultLocale, type AppLocale } from "./config";

const intlLocale: Record<AppLocale, string> = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
};

export function toIntlLocale(locale: AppLocale = defaultLocale) {
  return intlLocale[locale] ?? intlLocale.en;
}

export function formatLocalizedCurrency(value: number, currency: "INR" | "USD" = "INR", locale: AppLocale = defaultLocale) {
  return new Intl.NumberFormat(currency === "INR" ? toIntlLocale(locale) : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatLocalizedDate(value: string | Date, locale: AppLocale = defaultLocale) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatLocalizedNumber(value: number, locale: AppLocale = defaultLocale) {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}

export function formatIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^91/, "");
  if (digits.length !== 10) return value;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function formatIndianAddress(input: { line1: string; locality?: string; city: string; state?: string; pincode: string }) {
  return [input.line1, input.locality, input.city, input.state, input.pincode].filter(Boolean).join(", ");
}
