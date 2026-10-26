/** Browser-only drafts. This module does not send listings or photos to a server. */
export type ListingOperation = "Venta" | "Renta";
export type ListingKind = "Casa" | "Departamento" | "Terreno";
export type DraftPhoto = { id: string; name: string; blob: Blob };
import {
  defaultMaintenance,
  defaultRentalTerms,
  type Community,
  type Maintenance,
  type RentalTerms,
  type SaleTerms,
} from "./property-terms";
import { validateDraftScenes, type DraftScene } from "./draft-tour";
export type DraftInput = {
  title: string;
  propertyType: ListingKind;
  description: string;
  state: string;
  city: string;
  neighborhood: string;
  area: number;
  beds: number | null;
  baths: number | null;
  maintenance: Maintenance;
  community: Community;
  latitude: number;
  longitude: number;
  imageRights: boolean;
} & (
  | { operation: "Renta"; rental: RentalTerms; sale?: never }
  | { operation: "Venta"; sale: SaleTerms; rental?: never }
);
export type ListingDraft = DraftInput & {
  schemaVersion: 2;
  id: string;
  createdAt: string;
  updatedAt?: string;
  photos: DraftPhoto[];
  scenes: DraftScene[];
  migrationNote?: string;
};
/** Legacy rows stay intact in IndexedDB until explicitly saved by their owner. */
export type LegacyDraft = Omit<
  DraftInput,
  "operation" | "rental" | "sale" | "maintenance" | "community"
> & {
  operation: ListingOperation;
  price: number;
  annualTax: number | null;
  monthlyMaintenance: number | null;
  id: string;
  createdAt: string;
  photos: DraftPhoto[];
};
export function migrateListingDraft(
  stored: ListingDraft | LegacyDraft,
): ListingDraft {
  if ("schemaVersion" in stored && stored.schemaVersion === 2) return stored;
  const old = stored as LegacyDraft;
  const { price, annualTax, monthlyMaintenance, operation, ...common } = old;
  const base = {
    ...common,
    schemaVersion: 2 as const,
    scenes: [],
    community: "unknown" as const,
    maintenance:
      monthlyMaintenance !== null && monthlyMaintenance > 0
        ? {
            status: "yes" as const,
            amount: monthlyMaintenance,
            included: "unknown" as const,
          }
        : defaultMaintenance(),
    migrationNote:
      "Borrador antiguo: revisa mantenimiento y condiciones. No se dedujeron requisitos ni servicios; el predial solo se conserva para venta.",
  };
  return operation === "Venta"
    ? { ...base, operation, sale: { purchasePrice: price, annualTax } }
    : {
        ...base,
        operation: "Renta",
        rental: { ...defaultRentalTerms(), monthlyRent: price },
      };
}
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validatePhotoFiles(
  files: { type: string; size: number }[],
): string | null {
  if (!files.length) return "Añade al menos una fotografía del inmueble.";
  if (files.length > MAX_PHOTOS)
    return `Puedes añadir hasta ${MAX_PHOTOS} fotos.`;
  if (files.some((file) => !PHOTO_TYPES.includes(file.type)))
    return "Usa fotos JPEG, PNG o WebP. Convierte los archivos HEIC antes de subirlos.";
  if (files.some((file) => file.size <= 0 || file.size > MAX_PHOTO_BYTES))
    return "Cada foto debe pesar entre 1 byte y 5 MB.";
  return null;
}
export function validateDraftInput(input: DraftInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < 5 || input.title.length > 120)
    errors.title = "Escribe un título de entre 5 y 120 caracteres.";
  if (!["Venta", "Renta"].includes(input.operation))
    errors.operation = "Selecciona venta o renta.";
  if (!["Casa", "Departamento", "Terreno"].includes(input.propertyType))
    errors.propertyType = "Selecciona un tipo de inmueble válido.";
  const price =
    input.operation === "Renta"
      ? input.rental.monthlyRent
      : input.sale.purchasePrice;
  if (
    !Number.isFinite(price) ||
    price === null ||
    price <= 0 ||
    price > 10000000000 ||
    !isMoney(price)
  )
    errors.price =
      "Escribe un precio mayor que cero y menor o igual a 10,000 millones de MXN.";
  if (input.description.trim().length < 20 || input.description.length > 4000)
    errors.description =
      "Describe el inmueble con entre 20 y 4,000 caracteres.";
  for (const field of ["state", "city", "neighborhood"] as const)
    if (input[field].trim().length < 2 || input[field].length > 100)
      errors[field] = "Escribe entre 2 y 100 caracteres.";
  if (!Number.isFinite(input.area) || input.area <= 0 || input.area > 100000000)
    errors.area = "Escribe una superficie mayor que cero.";
  if (input.propertyType !== "Terreno")
    for (const field of ["beds", "baths"] as const) {
      const value = input[field];
      if (
        value !== null &&
        (!Number.isFinite(value) ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > 100)
      )
        errors[field] =
          "Usa un número entero de 0 a 100, o deja el campo vacío.";
    }
  Object.assign(errors, validateTerms(input));
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < 14 ||
    input.latitude > 33
  )
    errors.latitude =
      "Usa una latitud en el rango de cobertura aproximado (14 a 33).";
  if (
    !Number.isFinite(input.longitude) ||
    input.longitude < -119 ||
    input.longitude > -86
  )
    errors.longitude =
      "Usa una longitud en el rango de cobertura aproximado (-119 a -86).";
  if (!input.imageRights)
    errors.imageRights =
      "Confirma que tienes autorización para usar estas fotografías.";
  return errors;
}
export function normalizeDraftInput(input: DraftInput): DraftInput {
  // Pick only schema fields so a switched operation cannot leak hidden form values.
  const common = {
    title: input.title.trim(),
    description: input.description.trim(),
    state: input.state.trim(),
    city: input.city.trim(),
    neighborhood: input.neighborhood.trim(),
    propertyType: input.propertyType,
    area: input.area,
    beds: input.propertyType === "Terreno" ? null : input.beds,
    baths: input.propertyType === "Terreno" ? null : input.baths,
    latitude: input.latitude,
    longitude: input.longitude,
    imageRights: input.imageRights,
    community: input.community,
    maintenance:
      input.maintenance.status === "yes"
        ? {
            ...input.maintenance,
            included:
              input.operation === "Venta"
                ? ("unknown" as const)
                : input.maintenance.included,
          }
        : { ...defaultMaintenance(), status: input.maintenance.status },
  };
  return input.operation === "Venta"
    ? { ...common, operation: "Venta", sale: { ...input.sale } }
    : {
        ...common,
        operation: "Renta",
        rental: {
          ...input.rental,
          ...(input.rental.guarantee === "either"
            ? { guarantor: "unknown" as const, legalPolicy: "unknown" as const }
            : {}),
        },
      };
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "El almacenamiento local no está disponible en este navegador.",
        ),
      );
      return;
    }
    const request = indexedDB.open("home-view-listing-drafts", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("listings"))
        request.result.createObjectStore("listings", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ?? new Error("No se pudo abrir el almacenamiento local."),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Cierra las otras pestañas de Home View y vuelve a intentarlo.",
        ),
      );
  });
}
async function useStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("listings", mode);
      let value: T;
      const request = action(transaction.objectStore("listings"));
      request.onsuccess = () => {
        value = request.result;
      };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () =>
        reject(
          transaction.error ??
            request.error ??
            new Error("No se pudo guardar en este navegador."),
        );
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error("La operación local se canceló."),
        );
    });
  } finally {
    db.close();
  }
}
export async function getListingDrafts(): Promise<ListingDraft[]> {
  const drafts = await useStore<(ListingDraft | LegacyDraft)[]>(
    "readonly",
    (store) => store.getAll(),
  );
  return drafts
    .map(migrateListingDraft)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function saveListingDraft(draft: ListingDraft): Promise<void> {
  const errors = validateDraftInput(draft);
  const sceneError = validateDraftScenes(draft.scenes);
  if (Object.keys(errors).length || sceneError)
    throw new Error(sceneError || Object.values(errors)[0]);
  if (!draft.photos.length || draft.photos.length > MAX_PHOTOS)
    throw new Error("Añade entre 1 y 8 fotografías.");
  await useStore("readwrite", (store) => store.put(draft));
}
export async function deleteListingDraft(id: string): Promise<void> {
  await useStore("readwrite", (store) => store.delete(id));
}

function isMoney(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.0001;
}
function validateTerms(input: DraftInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const amount = (key: string, value: number | null, max = 100000000) => {
    if (
      value !== null &&
      (!Number.isFinite(value) || value < 0 || value > max || !isMoney(value))
    )
      errors[key] =
        "Usa un monto con hasta dos decimales mayor o igual a cero, o déjalo por confirmar.";
  };
  const choice = (key: string, value: string, allowed: string[]) => {
    if (!allowed.includes(value)) errors[key] = "Selecciona una opción válida.";
  };
  choice("community", input.community, [
    "condominium",
    "gated",
    "neither",
    "unknown",
  ]);
  choice("maintenanceStatus", input.maintenance.status, [
    "yes",
    "no",
    "unknown",
  ]);
  if (input.maintenance.status === "yes") {
    amount("maintenanceAmount", input.maintenance.amount);
    choice("maintenanceIncluded", input.maintenance.included, [
      "yes",
      "no",
      "unknown",
    ]);
  }
  if (input.operation === "Venta") amount("annualTax", input.sale.annualTax);
  else {
    const r = input.rental;
    amount("deposit", r.deposit);
    if (
      r.minimumMonths !== null &&
      (!Number.isInteger(r.minimumMonths) ||
        r.minimumMonths < 1 ||
        r.minimumMonths > 1200)
    )
      errors.minimumMonths =
        "Usa un plazo entero de 1 a 1200 meses o déjalo por confirmar.";
    choice("guarantee", r.guarantee, ["independent", "either", "unknown"]);
    for (const key of ["guarantor", "legalPolicy"] as const)
      choice(key, r[key], ["required", "not-required", "unknown"]);
    choice("pets", r.pets, ["yes", "no", "conditional", "unknown"]);
    choice("furnished", r.furnished, ["yes", "no", "partial", "unknown"]);
    for (const key of ["water", "electricity", "gas", "internet"] as const)
      choice(key, r.services[key], ["included", "excluded", "unknown"]);
  }
  return errors;
}
