import type { DraftInput } from "./listing-drafts";
import type { DraftScene } from "./draft-tour";
import type { Property } from "./properties";
import { publicPoint } from "./location";
import { formatMXN } from "./property-terms";
export type ListingMetadata = DraftInput & {
  id: string;
  photos: { id: string; name: string }[];
  scenes: Omit<DraftScene, "blob">[];
};
/** Shared by private preview and publication: explicit public fields only. */
export function listingPresentation(
  draft: ListingMetadata,
  media: (id: string) => string,
): Property {
  const price =
    draft.operation === "Renta"
      ? draft.rental.monthlyRent
      : draft.sale.purchasePrice;
  if (
    price === null ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !draft.photos.length
  )
    throw new Error("invalid_listing");
  const slug = `anuncio-${draft.id}`;
  return {
    published: true,
    slug,
    title: draft.title,
    description: draft.description,
    operation: draft.operation,
    ...(draft.operation === "Renta"
      ? { rental: draft.rental }
      : { sale: draft.sale }),
    price: formatMXN(price),
    priceValue: price,
    location: `${draft.city}, ${draft.state}`,
    address: draft.neighborhood,
    neighborhood: draft.neighborhood,
    coordinates: publicPoint(
      { lat: draft.latitude, lng: draft.longitude },
      draft.publicLocation,
    ),
    locationPrecision: draft.publicLocation ?? "approximate",
    area: draft.area,
    beds: draft.beds,
    baths: draft.baths,
    propertyType: draft.propertyType,
    maintenance: draft.maintenance,
    community: draft.community,
    tag: draft.operation,
    cover: media(draft.photos[0].id),
    gallery: draft.photos.map((photo, i) => ({
      src: media(photo.id),
      alt: draft.title,
      label: `Foto ${i + 1}`,
    })),
    rooms: draft.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      panorama: media(scene.id),
      x: 0,
      y: 0,
      hotspots: scene.hotspots,
      ...(scene.initialView ? { initialView: scene.initialView } : {}),
    })),
    plotArea: draft.propertyType === "Terreno" ? draft.area : null,
    builtYear: null,
    parking: null,
    levels: null,
    buildingType: "Por confirmar",
    ownership: "Por confirmar",
    features: [],
    reference: slug,
  } as Property;
}
