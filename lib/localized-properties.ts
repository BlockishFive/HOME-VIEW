import type { Property } from "./properties";
import { translate, type Locale } from "./i18n";
/** Only use for the bundled demo catalog; never translate user-authored draft content. */
export function localizeProperty(property: Property, locale: Locale): Property {
  if (locale === "es") return property;
  const t = (value: string) => translate(locale, value);
  const media = (path: string) => path === "/illustrations/terreno.svg" ? "/illustrations/terreno-en.svg" : path;
  return {
    ...property,
    title: t(property.title),
    cover: media(property.cover),
    location: t(property.location),
    address: t(property.address),
    tag: t(property.tag),
    description: t(property.description),
    buildingType: t(property.buildingType),
    ownership: t(property.ownership),
    neighborhood: t(property.neighborhood),
    features: property.features.map(t),
    rooms: property.rooms.map((room) => ({ ...room, name: t(room.name) })),
    gallery: property.gallery.map((image) => ({
      ...image,
      src: media(image.src),
      alt: t(image.alt),
      label: t(image.label),
    })),
  };
}
