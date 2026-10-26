/** Browser-only drafts. This module does not send listings or photos to a server. */
export type ListingOperation = "Venta" | "Renta";
export type ListingKind = "Casa" | "Departamento" | "Terreno";
export type DraftPhoto = { id: string; name: string; blob: Blob };
export type DraftInput = {
  title: string;
  operation: ListingOperation;
  propertyType: ListingKind;
  price: number;
  description: string;
  state: string;
  city: string;
  neighborhood: string;
  area: number;
  beds: number | null;
  baths: number | null;
  annualTax: number | null;
  monthlyMaintenance: number | null;
  latitude: number;
  longitude: number;
  imageRights: boolean;
};
export type ListingDraft = DraftInput & {
  id: string;
  createdAt: string;
  photos: DraftPhoto[];
};
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
  if (
    !Number.isFinite(input.price) ||
    input.price <= 0 ||
    input.price > 10000000000
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
  for (const field of ["annualTax", "monthlyMaintenance"] as const) {
    const value = input[field];
    if (
      value !== null &&
      (!Number.isFinite(value) || value < 0 || value > 100000000)
    )
      errors[field] =
        "Usa un monto mayor o igual a cero, o deja el campo vacío.";
  }
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
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    state: input.state.trim(),
    city: input.city.trim(),
    neighborhood: input.neighborhood.trim(),
    beds: input.propertyType === "Terreno" ? null : input.beds,
    baths: input.propertyType === "Terreno" ? null : input.baths,
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
  const drafts = await useStore<ListingDraft[]>("readonly", (store) =>
    store.getAll(),
  );
  return drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function saveListingDraft(draft: ListingDraft): Promise<void> {
  await useStore("readwrite", (store) => store.put(draft));
}
export async function deleteListingDraft(id: string): Promise<void> {
  await useStore("readwrite", (store) => store.delete(id));
}
