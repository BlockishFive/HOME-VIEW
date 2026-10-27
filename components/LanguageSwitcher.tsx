"use client";
import { useI18n } from "./I18nProvider";
import { validLocale } from "@/lib/i18n";
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <label className="language-switcher">
      <span>Idioma / Language</span>
      <select
        aria-label="Idioma / Language"
        value={locale}
        onChange={(event) => setLocale(validLocale(event.target.value))}
      >
        <option value="es" lang="es">
          Español
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
    </label>
  );
}
