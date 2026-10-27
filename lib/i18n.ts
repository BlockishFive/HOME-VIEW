import { siteMessages } from "./i18n/site-messages";
import { catalogMessages } from "./i18n/catalog-messages";
import { listingMessages } from "./i18n/listing-messages";
import { propertyMessages } from "./i18n/property-messages";
export type Locale = "es" | "en";
export function validLocale(value: unknown): Locale {
  return value === "en" ? "en" : "es";
}
export const englishMessages: Record<string, string> = {
  ...siteMessages,
  ...catalogMessages,
  ...listingMessages,
  ...propertyMessages,
};
export function translate(
  locale: Locale,
  message: string,
  params: Record<string, string | number> = {},
): string {
  const source = message.replace(/\s+/g, " ").trim();
  const text = locale === "en" ? (englishMessages[source] ?? source) : source;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    params[name] === undefined ? placeholder : String(params[name]),
  );
}
