"use client";

import { Languages } from "lucide-react";
import { localeLabels, supportedLocales, type AppLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/store/locale-store";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-border bg-surface p-1", compact && "gap-1")} aria-label="Language selector">
      <Languages className="ml-2 size-4 text-secondary-text" aria-hidden />
      {supportedLocales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={cn(
            "min-h-11 rounded px-2 text-xs font-semibold text-secondary-text transition focus-ring hover:bg-slate-50 hover:text-primary-text",
            locale === item && "bg-emerald-50 text-brand",
          )}
          lang={item}
          aria-pressed={locale === item}
          title={localeLabels[item].english}
        >
          {compact ? localeLabels[item].short : localeLabels[item].native}
        </button>
      ))}
    </div>
  );
}

export function useCurrentLocale(): AppLocale {
  return useLocaleStore((state) => state.locale);
}
