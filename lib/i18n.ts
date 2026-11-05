import { mediaMessages } from "./i18n/media-messages";
import { historyMessages } from "./i18n/history-messages";
import { captureMessages } from "./i18n/capture-messages";
import { reviewVisitsMessages } from "./i18n/review-visits-messages";
import { backupTourMessages } from "./i18n/backup-tour-messages";
import { locationMessages } from "./i18n/location-messages";
import { privateMessages } from "./i18n/private-messages";
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
  ...mediaMessages,
  ...historyMessages,
  ...captureMessages,
  ...reviewVisitsMessages,
  ...backupTourMessages,
  ...locationMessages,
  ...privateMessages,
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
