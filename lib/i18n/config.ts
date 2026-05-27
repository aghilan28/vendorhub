export const supportedLocales = ["en", "ta", "hi"] as const;

export type AppLocale = (typeof supportedLocales)[number];

export const defaultLocale: AppLocale = "en";

export const localeLabels: Record<AppLocale, { native: string; english: string; short: string }> = {
  en: { native: "English", english: "English", short: "EN" },
  ta: { native: "தமிழ்", english: "Tamil", short: "TA" },
  hi: { native: "हिन्दी", english: "Hindi", short: "HI" },
};

export function isSupportedLocale(value: string | undefined | null): value is AppLocale {
  return supportedLocales.includes(value as AppLocale);
}

export function resolveLocale(value: string | undefined | null): AppLocale {
  if (!value) return defaultLocale;
  const base = value.toLowerCase().split("-")[0];
  return isSupportedLocale(base) ? base : defaultLocale;
}
