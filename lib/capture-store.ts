import type {
  DraftPhoto,
  ListingKind,
  ListingOperation,
} from "./listing-drafts";
import type {
  Community,
  Maintenance,
  RentalTerms,
  SaleTerms,
} from "./property-terms";
import type { DraftScene } from "./draft-tour";
import type { PublicLocation } from "./location";
import { hasVisitAccess, type VisitAccess } from "./visit-access";
export const initialCaptureValues = {
  title: "",
  operation: "Renta" as ListingOperation,
  propertyType: "Casa" as ListingKind,
  rentPrice: "",
  salePrice: "",
  description: "",
  state: "Guanajuato",
  city: "León",
  neighborhood: "",
  area: "",
  beds: "",
  baths: "",
  latitude: "21.122",
  longitude: "-101.686",
  imageRights: false,
};
export type CaptureContent = {
  visitAccess?: VisitAccess;
  values: typeof initialCaptureValues;
  rental: RentalTerms;
  sale: SaleTerms;
  maintenance: Maintenance;
  community: Community;
  publicLocation: PublicLocation;
  locationReviewed: boolean;
  photos: DraftPhoto[];
  scenes: DraftScene[];
};
export type CaptureContext = {
  identity: { id: string; createdAt: string };
  sharedRevision: number;
  editingTitle?: string;
};
export type CaptureScope = "local" | "shared";
export type SavedCapture = CaptureContext & {
  id: string;
  scope: CaptureScope;
  version: number;
  updatedAt: string;
  content: CaptureContent;
  schemaVersion: 1;
};
export type CaptureSummary = Pick<
  SavedCapture,
  "id" | "scope" | "version" | "updatedAt"
> & { title: string; photos: number; scenes: number };
export class CaptureConflict extends Error {
  constructor() {
    super(
      "Otra pestaña cambió esta captura. Guarda una copia de recuperación para conservar tus cambios.",
    );
  }
}
export function captureFingerprint(content: CaptureContent) {
  return JSON.stringify({
    values: content.values,
    rental: content.rental,
    sale: content.sale,
    maintenance: content.maintenance,
    community: content.community,
    publicLocation: content.publicLocation,
    locationReviewed: content.locationReviewed,
    visitAccess: hasVisitAccess(content.visitAccess)
      ? content.visitAccess
      : undefined,
    photos: content.photos.map(({ id, name, blob }) => ({
      id,
      name,
      size: blob.size,
      type: blob.type,
    })),
    scenes: content.scenes.map(({ id, name, blob, hotspots, initialView }) => ({
      id,
      name,
      hotspots,
      initialView,
      size: blob.size,
      type: blob.type,
    })),
  });
}
export const captureSummary = (capture: SavedCapture): CaptureSummary => ({
  id: capture.id,
  scope: capture.scope,
  version: capture.version,
  updatedAt: capture.updatedAt,
  title: capture.content.values.title,
  photos: capture.content.photos.length,
  scenes: capture.content.scenes.length,
});
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "El guardado automático no está disponible en este navegador.",
        ),
      );
      return;
    }
    const request = indexedDB.open("home-view-captures", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("captures", {
        keyPath: "id",
      });
      store.createIndex("scope", "scope");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error || new Error("No se pudo abrir el guardado automático."),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Cierra otras pestañas del piloto y vuelve a intentar el guardado automático.",
        ),
      );
  });
}
export async function listCaptures(
  scope: CaptureScope,
): Promise<CaptureSummary[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("captures", "readonly");
      const request = tx.objectStore("captures").index("scope").getAll(scope);
      tx.oncomplete = () => {
        try {
          resolve(
            (request.result as SavedCapture[])
              .filter((row) => row.schemaVersion === 1)
              .map(captureSummary)
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          );
        } catch {
          reject(
            new Error("No se pudieron leer las capturas de este dispositivo."),
          );
        }
      };
      tx.onabort = tx.onerror = () =>
        reject(
          tx.error ||
            new Error("No se pudieron leer las capturas de este dispositivo."),
        );
    });
  } finally {
    db.close();
  }
}
export async function getCapture(
  id: string,
): Promise<SavedCapture | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("captures", "readonly"),
        request = tx.objectStore("captures").get(id);
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () =>
        reject(tx.error || new Error("No se pudo recuperar la captura."));
    });
  } finally {
    db.close();
  }
}
/** Compare and write in one transaction; no validation of partially completed form values. */
export async function writeCapture(
  capture: Omit<SavedCapture, "version">,
  expectedVersion: number,
): Promise<SavedCapture> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("captures", "readwrite"),
        store = tx.objectStore("captures");
      let failure: Error | undefined;
      const next = { ...capture, version: expectedVersion + 1 };
      const request = store.get(capture.id);
      request.onsuccess = () => {
        const old = request.result as SavedCapture | undefined;
        if ((old?.version ?? 0) !== expectedVersion) {
          failure = new CaptureConflict();
          tx.abort();
          return;
        }
        if (old) {
          store.put(next);
          return;
        }
        const count = store.count();
        count.onsuccess = () => {
          if (count.result >= 20) {
            failure = new Error(
              "Hay 20 capturas de recuperación. Conserva o descarta alguna antes de crear otra.",
            );
            tx.abort();
            return;
          }
          store.put(next);
        };
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = tx.onerror = () =>
        reject(
          failure ||
            tx.error ||
            new Error(
              "No se pudo guardar automáticamente en este dispositivo.",
            ),
        );
    });
  } finally {
    db.close();
  }
}
export async function deleteCapture(
  id: string,
  expectedVersion: number,
): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("captures", "readwrite"),
        store = tx.objectStore("captures");
      let failure: Error | undefined;
      const request = store.get(id);
      request.onsuccess = () => {
        const old = request.result as SavedCapture | undefined;
        if (old && old.version !== expectedVersion) {
          failure = new CaptureConflict();
          tx.abort();
          return;
        }
        store.delete(id);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(
          failure ||
            tx.error ||
            new Error("No se pudo descartar la captura local."),
        );
    });
  } finally {
    db.close();
  }
}
