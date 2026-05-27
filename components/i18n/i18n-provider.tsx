"use client";

import { I18nextProvider } from "react-i18next";
import { ReactNode, useEffect } from "react";
import { getI18n } from "@/lib/i18n/client";
import { resolveLocale } from "@/lib/i18n/config";
import { useLocaleStore } from "@/store/locale-store";

export function VendorHubI18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const detectLocale = useLocaleStore((state) => state.detectLocale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const i18n = getI18n(locale);

  useEffect(() => {
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    const cookieLocale = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("vendorhub_locale="))
      ?.split("=")[1];

    if (queryLocale || cookieLocale) {
      setLocale(resolveLocale(queryLocale ?? cookieLocale));
      return;
    }

    detectLocale(navigator.language);
  }, [detectLocale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
