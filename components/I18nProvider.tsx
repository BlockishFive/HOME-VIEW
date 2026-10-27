"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translate, validLocale, type Locale } from "@/lib/i18n";
const LANGUAGE_KEY = "home-view-language";
type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (message: string, params?: Record<string, string | number>) => string;
};
const I18nContext = createContext<I18nContextValue | null>(null);
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("es");
  useEffect(() => {
    try {
      updateLocale(validLocale(localStorage.getItem(LANGUAGE_KEY)));
    } catch {
      /* Language selection remains usable without persistence. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY) updateLocale(validLocale(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document
      .querySelector('link[rel="manifest"]')
      ?.setAttribute(
        "href",
        locale === "en" ? "/manifest-en.webmanifest" : "/manifest.webmanifest",
      );
  }, [locale]);
  const setLocale = useCallback((value: Locale) => {
    updateLocale(value);
    try {
      localStorage.setItem(LANGUAGE_KEY, value);
    } catch {
      /* Current page still changes language. */
    }
  }, []);
  const t = useCallback(
    (message: string, params?: Record<string, string | number>) =>
      translate(locale, message, params),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("Home View language provider is missing.");
  return context;
}
export function Text({
  children,
  values,
}: {
  children: string;
  values?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return <>{t(children, values)}</>;
}
export function usePageTitle(title: string, description?: string) {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t(title);
    if (description)
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", t(description));
  }, [title, description, t]);
}
