import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultLocale, resolveLocale, type AppLocale } from "@/lib/i18n/config";

interface LocaleState {
  locale: AppLocale;
  simplifiedMode: boolean;
  setLocale: (locale: AppLocale) => void;
  detectLocale: (language?: string) => void;
  setSimplifiedMode: (enabled: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: defaultLocale,
      simplifiedMode: false,
      setLocale: (locale) => {
        if (typeof document !== "undefined") {
          document.documentElement.lang = locale;
          document.cookie = `vendorhub_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
        }
        set({ locale });
      },
      detectLocale: (language) => {
        if (get().locale !== defaultLocale) return;
        const resolved = resolveLocale(language);
        if (resolved !== get().locale) get().setLocale(resolved);
      },
      setSimplifiedMode: (simplifiedMode) => set({ simplifiedMode }),
    }),
    { name: "vendorhub-locale-v15" },
  ),
);
