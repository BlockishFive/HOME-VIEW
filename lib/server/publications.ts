/** Public snapshots are explicit allowlists, never raw private metadata. */
import { publicPoint } from "../location";
import { db, PrivateError } from "./private-store";
import type { ListingDraft } from "../listing-drafts";
import type { Property } from "../properties";
import { formatMXN } from "../property-terms";
export function publicProperty(draft: ListingDraft): Property {
  if (!draft.locationReviewed) throw new PrivateError("location_review");
  const slug = `anuncio-${draft.id}`;
  const media = (id: string) => `/api/public/media/${draft.id}/${id}`;
  const price = draft.operation === "Renta" ? draft.rental.monthlyRent : draft.sale.purchasePrice;
  if (price === null || !Number.isFinite(price) || price <= 0 || !draft.imageRights || !draft.photos.length)
    throw new PrivateError("invalid");
  return {
    published: true, slug, title: draft.title, description: draft.description,
    operation: draft.operation,
    ...(draft.operation === "Renta" ? { rental: draft.rental } : { sale: draft.sale }),
    price: formatMXN(price), priceValue: price,
    location: `${draft.city}, ${draft.state}`, address: draft.neighborhood,
    neighborhood: draft.neighborhood, coordinates: publicPoint({ lat: draft.latitude, lng: draft.longitude }, draft.publicLocation),
    locationPrecision: draft.publicLocation ?? "approximate",
    area: draft.area, beds: draft.beds, baths: draft.baths, propertyType: draft.propertyType,
    maintenance: draft.maintenance, community: draft.community,
    tag: draft.operation, cover: media(draft.photos[0].id),
    gallery: draft.photos.map((photo, i) => ({ src: media(photo.id), alt: draft.title, label: `Foto ${i + 1}` })),
    rooms: draft.scenes.map(scene => ({ id: scene.id, name: scene.name, panorama: media(scene.id), x: 0, y: 0, hotspots: scene.hotspots })),
    plotArea: draft.propertyType === "Terreno" ? draft.area : null,
    builtYear: null, parking: null, levels: null, buildingType: "Por confirmar", ownership: "Por confirmar", features: [], reference: slug,
  } as Property;
}
export function setPublication(id: string, revision: number, publish: boolean) {
  const store = db();
  store.exec("BEGIN IMMEDIATE");
  try {
    const row = store.prepare("SELECT revision,metadata FROM drafts WHERE id=?").get(id) as { revision: number; metadata: string } | undefined;
    if (!row || row.revision !== revision) throw new PrivateError("conflict", 409);
    store.prepare("DELETE FROM publications WHERE id=?").run(id);
    if (publish) {
      const property = publicProperty(JSON.parse(row.metadata));
      const bytes = Number((store.prepare("SELECT (SELECT coalesce(sum(length(content)),0) FROM assets) + (SELECT coalesce(sum(length(content)),0) FROM publication_assets) + (SELECT coalesce(sum(length(content)),0) FROM assets WHERE draft_id=?) AS size").get(id) as {size:number}).size);
      if (bytes > 600 * 1024 * 1024) throw new PrivateError("quota", 413);
      store.prepare("INSERT INTO publications VALUES (?,?,?)").run(id, revision, JSON.stringify(property));
      store.prepare("INSERT INTO publication_assets SELECT id,draft_id,content FROM assets WHERE draft_id=?").run(id);
    }
    store.exec("COMMIT");
  } catch (error) { store.exec("ROLLBACK"); throw error; }
}
export function publishedProperties(): Property[] {
  return (db().prepare("SELECT metadata FROM publications ORDER BY rowid DESC").all() as {metadata:string}[]).map(row => {
    const property = JSON.parse(row.metadata) as Property;
    // Older snapshots predate precision controls. Redact their points on read.
    return property.locationPrecision ? property : { ...property, coordinates: publicPoint(property.coordinates), locationPrecision: "approximate" as const };
  });
}
export function publishedAsset(id: string, asset: string) {
  return (db().prepare("SELECT content FROM publication_assets WHERE draft_id=? AND id=?").get(id, asset) as {content:Uint8Array}|undefined)?.content;
}
