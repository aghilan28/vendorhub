"use client";

import { formatLocalizedCurrency } from "@/lib/i18n/format";
import { useLocaleStore } from "@/store/locale-store";

export function PriceDisplay({ value, currency = "INR" }: { value: number; currency?: "INR" | "USD" }) {
  const locale = useLocaleStore((state) => state.locale);
  return <span className="whitespace-nowrap font-semibold text-primary-text">{formatLocalizedCurrency(value, currency, locale)}</span>;
}
