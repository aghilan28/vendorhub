"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, type AppLocale } from "./config";
import { messages } from "./messages";

let initialized = false;

export function getI18n(locale: AppLocale) {
  if (!initialized) {
    i18next.use(initReactI18next).init({
      resources: {
        en: { translation: messages.en },
        ta: { translation: messages.ta },
        hi: { translation: messages.hi },
      },
      lng: locale,
      fallbackLng: defaultLocale,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialized = true;
  }

  if (i18next.language !== locale) {
    i18next.changeLanguage(locale).catch(() => undefined);
  }

  return i18next;
}
