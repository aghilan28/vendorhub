import { defaultLocale, supportedLocales, type AppLocale } from "./config";

export type LocaleCompleteness = {
  locale: AppLocale;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  suspiciousKeys: string[];
  completeness: number;
};

function flattenMessages(value: unknown, prefix = ""): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((current, [key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === "string") current[path] = item;
    else Object.assign(current, flattenMessages(item, path));
    return current;
  }, {});
}

export function hasMojibake(value: string) {
  return /[?]{4,}|à.|Â|Ã|â[€™€œ]/.test(value);
}

export function validateLocaleCatalog(messages: Record<AppLocale, unknown>): LocaleCompleteness[] {
  const base = flattenMessages(messages[defaultLocale]);
  const baseKeys = Object.keys(base);

  return supportedLocales.map((locale) => {
    const localized = flattenMessages(messages[locale]);
    const missingKeys = baseKeys.filter((key) => !localized[key]);
    const suspiciousKeys = Object.entries(localized)
      .filter(([, value]) => hasMojibake(value))
      .map(([key]) => key);
    const translatedKeys = baseKeys.length - missingKeys.length - suspiciousKeys.length;

    return {
      locale,
      totalKeys: baseKeys.length,
      translatedKeys: Math.max(0, translatedKeys),
      missingKeys,
      suspiciousKeys,
      completeness: baseKeys.length ? Math.max(0, Math.round((translatedKeys / baseKeys.length) * 100)) : 100,
    };
  });
}

export function safeLocalizedText(input: { value?: string | null; fallback: string; locale: AppLocale }) {
  if (!input.value || hasMojibake(input.value)) {
    return {
      text: input.fallback,
      fallbackUsed: true,
      reason: input.value ? "suspicious_encoding" : "missing_translation",
      locale: input.locale,
    } as const;
  }

  return { text: input.value, fallbackUsed: false, reason: "ok", locale: input.locale } as const;
}
