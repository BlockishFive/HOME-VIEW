import { prepareBrowserMedia } from "./browser-media";
import { initialCaptureValues, type CaptureContent } from "./capture-store";
import { readVisitAccess, hasVisitAccess } from "./visit-access";
import {
  defaultRentalTerms,
  type RentalTerms,
  type SaleTerms,
  type Maintenance,
  type Community,
} from "./property-terms";
import {
  migrateListingDraft,
  MAX_PHOTO_BYTES,
  type ListingDraft,
  type LegacyDraft,
} from "./listing-drafts";
import {
  MAX_PANORAMA_BYTES,
  validateDraftScenes,
  validatePanoramaDimensions,
  type DraftScene,
} from "./draft-tour";

export const MAX_BACKUP_FILE_BYTES = 70 * 1024 * 1024;
export const MAX_BACKUP_MEDIA_BYTES = 48 * 1024 * 1024;
export class BackupError extends Error {
  constructor(
    message = "El respaldo contiene campos inválidos o una versión no compatible.",
  ) {
    super(message);
  }
}
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BackupError();
  return value as Record<string, unknown>;
};
function string(value: unknown, limit: number): string {
  if (typeof value !== "string" || value.length > limit)
    throw new BackupError();
  return value;
}
function option<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T))
    throw new BackupError();
  return value as T;
}
function amount(value: unknown, maximum = 10000000000): number | null {
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum
  )
    throw new BackupError();
  return value;
}
function rentalTerms(value: unknown): RentalTerms {
  const r = record(value),
    s = record(r.services);
  const service = (key: string) =>
    option(s[key], ["included", "excluded", "unknown"] as const);
  return {
    monthlyRent: amount(r.monthlyRent),
    deposit: amount(r.deposit),
    minimumMonths: amount(r.minimumMonths, 1200),
    guarantee: option(r.guarantee, ["independent", "either", "unknown"]),
    guarantor: option(r.guarantor, ["required", "not-required", "unknown"]),
    legalPolicy: option(r.legalPolicy, ["required", "not-required", "unknown"]),
    pets: option(r.pets, ["yes", "no", "conditional", "unknown"]),
    furnished: option(r.furnished, ["yes", "no", "partial", "unknown"]),
    services: {
      water: service("water"),
      electricity: service("electricity"),
      gas: service("gas"),
      internet: service("internet"),
    },
  };
}
function saleTerms(value: unknown): SaleTerms {
  const s = record(value);
  return {
    purchasePrice: amount(s.purchasePrice),
    annualTax: amount(s.annualTax),
  };
}
function maintenanceTerms(value: unknown): Maintenance {
  const m = record(value);
  return {
    status: option(m.status, ["yes", "no", "unknown"]),
    amount: amount(m.amount),
    included: option(m.included, ["yes", "no", "unknown"]),
  };
}
/** One explicit allowlist is shared by import and the portable export. No credentials or server identity. */
export function contentFromDraft(draft: ListingDraft): CaptureContent {
  return {
    ...(hasVisitAccess(draft.visitAccess)
      ? { visitAccess: readVisitAccess(draft.visitAccess) }
      : {}),
    values: {
      ...initialCaptureValues,
      title: draft.title,
      operation: draft.operation,
      propertyType: draft.propertyType,
      rentPrice:
        draft.operation === "Renta"
          ? String(draft.rental.monthlyRent ?? "")
          : "",
      salePrice:
        draft.operation === "Venta"
          ? String(draft.sale.purchasePrice ?? "")
          : "",
      description: draft.description,
      state: draft.state,
      city: draft.city,
      neighborhood: draft.neighborhood,
      area: String(draft.area),
      beds: String(draft.beds ?? ""),
      baths: String(draft.baths ?? ""),
      latitude: String(draft.latitude),
      longitude: String(draft.longitude),
      imageRights: draft.imageRights,
    },
    rental: draft.operation === "Renta" ? draft.rental : defaultRentalTerms(),
    sale:
      draft.operation === "Venta"
        ? draft.sale
        : { purchasePrice: null, annualTax: null },
    maintenance: draft.maintenance,
    community: draft.community,
    publicLocation: draft.publicLocation ?? "approximate",
    locationReviewed: draft.locationReviewed === true,
    photos: draft.photos,
    scenes: draft.scenes,
  };
}
function scalarContent(
  value: unknown,
): Omit<CaptureContent, "photos" | "scenes"> {
  const c = record(value),
    v = record(c.values);
  const values = { ...initialCaptureValues };
  for (const key of [
    "title",
    "description",
    "state",
    "city",
    "neighborhood",
    "rentPrice",
    "salePrice",
    "area",
    "beds",
    "baths",
    "latitude",
    "longitude",
  ] as const)
    values[key] = string(
      v[key],
      key === "description" ? 4000 : key === "title" ? 120 : 128,
    );
  values.operation = option(v.operation, ["Renta", "Venta"]);
  values.propertyType = option(v.propertyType, [
    "Casa",
    "Departamento",
    "Terreno",
  ]);
  if (
    typeof v.imageRights !== "boolean" ||
    typeof c.locationReviewed !== "boolean"
  )
    throw new BackupError();
  values.imageRights = v.imageRights;
  return {
    values,
    ...(c.visitAccess === undefined
      ? {}
      : { visitAccess: readVisitAccess(c.visitAccess) }),
    rental: rentalTerms(c.rental),
    sale: saleTerms(c.sale),
    maintenance: maintenanceTerms(c.maintenance),
    community: option<Community>(c.community, [
      "unknown",
      "gated",
      "condominium",
      "neither",
    ]),
    publicLocation: option(c.publicLocation, ["approximate", "exact"]),
    locationReviewed: c.locationReviewed,
  };
}
function boundedArray(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 8) throw new BackupError();
  return value;
}
function dataBlob(
  value: unknown,
  panorama: boolean,
  budget: { bytes: number },
) {
  if (typeof value !== "string")
    throw new BackupError(
      "El respaldo debe incluir las imágenes; no se descargan enlaces externos.",
    );
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(value);
  if (!match)
    throw new BackupError(
      "El respaldo debe incluir las imágenes; no se descargan enlaces externos.",
    );
  const encoded = value.slice(match[0].length);
  const size =
    (encoded.length / 4) * 3 -
    (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (
    !encoded.length ||
    encoded.length % 4 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
    size > (panorama ? MAX_PANORAMA_BYTES : MAX_PHOTO_BYTES) ||
    size <= 0
  )
    throw new BackupError(
      "El respaldo contiene una imagen inválida o demasiado grande.",
    );
  budget.bytes += size;
  if (budget.bytes > MAX_BACKUP_MEDIA_BYTES)
    throw new BackupError(
      "El respaldo supera 48 MB de imágenes. Reduce los medios antes de exportar.",
    );
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    throw new BackupError(
      "El respaldo contiene una imagen inválida o demasiado grande.",
    );
  }
  const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  const signature =
    match[1] === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : match[1] === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
        : [82, 73, 70, 70].every((b, i) => bytes[i] === b) &&
          [87, 69, 66, 80].every((b, i) => bytes[i + 8] === b);
  if (!signature)
    throw new BackupError(
      "El respaldo contiene una imagen inválida o demasiado grande.",
    );
  return new Blob([bytes], { type: match[1] });
}
export type ParsedBackup = {
  content: CaptureContent;
  kind: "capture" | "draft";
  legacy: boolean;
};
/** Pure bounded parser; no network, database writes, evaluation, or broad object merges. */
export function parseBackup(text: string): ParsedBackup {
  try {
    return decodeBackup(text);
  } catch (error) {
    throw error instanceof BackupError ? error : new BackupError();
  }
}
function decodeBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_FILE_BYTES)
    throw new BackupError("El archivo de respaldo supera 70 MB.");
  let raw: Record<string, unknown>;
  try {
    raw = record(JSON.parse(text));
  } catch {
    throw new BackupError(
      "No se pudo leer el respaldo. Selecciona un archivo JSON de Home View.",
    );
  }
  let source: Record<string, unknown>,
    kind: ParsedBackup["kind"],
    legacy = false;
  if (raw.format === "home-view-capture" && raw.version === 1) {
    source = record(raw.content);
    kind = "capture";
  } else if (
    raw.format === "home-view-local-draft" &&
    (raw.version === 2 || raw.version === 1)
  ) {
    legacy = raw.version === 1;
    if (legacy && raw.schemaVersion !== undefined && raw.schemaVersion !== 1)
      throw new BackupError();
    if (!legacy && raw.schemaVersion !== 2) throw new BackupError();
    const draft = legacy
      ? migrateListingDraft(raw as unknown as LegacyDraft)
      : (raw as unknown as ListingDraft);
    // Validate values before turning numbers into strings. Legacy unknowns stay unknown.
    for (const key of ["area", "latitude", "longitude"] as const)
      if (typeof draft[key] !== "number" || !Number.isFinite(draft[key]))
        throw new BackupError();
    for (const key of ["beds", "baths"] as const) amount(draft[key], 100);
    if (!["Renta", "Venta"].includes(draft.operation)) throw new BackupError();
    const content = contentFromDraft(draft);
    source = {
      ...content,
      photos: raw.photos,
      scenes: legacy ? [] : raw.scenes,
    };
    kind = "draft";
  } else throw new BackupError();
  const scalars = scalarContent(source),
    budget = { bytes: 0 };
  const photos = boundedArray(source.photos).map((value) => {
    const p = record(value);
    return {
      id: crypto.randomUUID(),
      name: string(p.name, 120),
      blob: dataBlob(p.dataUrl, false, budget),
    };
  });
  const rawScenes = boundedArray(source.scenes).map(record);
  const ids = new Map<string, string>();
  for (const s of rawScenes) {
    const id = string(s.id, 120);
    if (!id || ids.has(id)) throw new BackupError();
    ids.set(id, crypto.randomUUID());
  }
  const scenes: DraftScene[] = rawScenes.map((s) => ({
    id: ids.get(s.id as string)!,
    name: string(s.name, 80),
    blob: dataBlob(s.dataUrl, true, budget),
    hotspots: boundedArray(s.hotspots).map((value) => {
      const h = record(value),
        target = ids.get(string(h.target, 120));
      if (!target || typeof h.yaw !== "number" || typeof h.pitch !== "number")
        throw new BackupError();
      return { target, yaw: h.yaw, pitch: h.pitch };
    }),
    ...(s.initialView === undefined
      ? {}
      : {
          initialView: (() => {
            const v = record(s.initialView);
            return {
              yaw: v.yaw as number,
              pitch: v.pitch as number,
              fov: v.fov as number,
            };
          })(),
        }),
  }));
  // Empty scene names are valid partial captures; topology and angles still must be safe.
  if (validateDraftScenes(scenes.map((s) => ({ ...s, name: s.name || "_" }))))
    throw new BackupError(
      "El respaldo contiene conexiones u orientaciones 360 inválidas.",
    );
  return { content: { ...scalars, photos, scenes }, kind, legacy };
}
async function normalizeImage(blob: Blob, panorama: boolean): Promise<Blob> {
  try {
    return (await prepareBrowserMedia(blob, panorama)).blob;
  } catch {
    throw new BackupError(
      "Una imagen del respaldo no tiene dimensiones válidas o no se pudo decodificar.",
    );
  }
}
/** Decode/re-encode sequentially, before offering restoration. Never fetch URLs from a file. */
export async function readBackup(file: File): Promise<ParsedBackup> {
  if (!file.size || file.size > MAX_BACKUP_FILE_BYTES)
    throw new BackupError("El archivo de respaldo supera 70 MB.");
  let parsed: ParsedBackup;
  try {
    parsed = parseBackup(await file.text());
  } catch (e) {
    throw e instanceof BackupError ? e : new BackupError();
  }
  for (const photo of parsed.content.photos) {
    photo.blob = await normalizeImage(photo.blob, false);
    photo.name = `foto-${photo.id}.jpg`;
  }
  for (const scene of parsed.content.scenes)
    scene.blob = await normalizeImage(scene.blob, true);
  if (
    [...parsed.content.photos, ...parsed.content.scenes].reduce(
      (size, item) => size + item.blob.size,
      0,
    ) > MAX_BACKUP_MEDIA_BYTES
  )
    throw new BackupError(
      "El respaldo supera 48 MB de imágenes. Reduce los medios antes de exportar.",
    );
  return parsed;
}
const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new BackupError("No se pudo preparar el respaldo."));
    reader.readAsDataURL(blob);
  });
async function portableContent(content: CaptureContent) {
  const scalars = scalarContent(content);
  if (content.photos.length > 8 || content.scenes.length > 8)
    throw new BackupError();
  const size = [...content.photos, ...content.scenes].reduce(
    (total, m) => total + m.blob.size,
    0,
  );
  if (size > MAX_BACKUP_MEDIA_BYTES)
    throw new BackupError(
      "El respaldo supera 48 MB de imágenes. Reduce los medios antes de exportar.",
    );
  const photos = [];
  for (const photo of content.photos)
    photos.push({
      id: photo.id,
      name: photo.name,
      dataUrl: await dataUrl(photo.blob),
    });
  const scenes = [];
  for (const scene of content.scenes)
    scenes.push({
      id: scene.id,
      name: scene.name,
      hotspots: scene.hotspots,
      initialView: scene.initialView,
      dataUrl: await dataUrl(scene.blob),
    });
  return { ...scalars, photos, scenes };
}
function download(value: unknown, id: string) {
  const file = new Blob([JSON.stringify(value)], { type: "application/json" });
  if (file.size > MAX_BACKUP_FILE_BYTES)
    throw new BackupError("El archivo de respaldo supera 70 MB.");
  const url = URL.createObjectURL(file),
    link = document.createElement("a");
  link.href = url;
  link.download = `home-view-${id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function downloadCaptureBackup(content: CaptureContent) {
  download(
    {
      format: "home-view-capture",
      version: 1,
      exportedAt: new Date().toISOString(),
      content: await portableContent(content),
    },
    `captura-${Date.now()}`,
  );
}
export async function downloadDraftBackup(draft: ListingDraft) {
  const { photos, scenes } = await portableContent(contentFromDraft(draft));
  const v = contentFromDraft(draft).values;
  download(
    {
      format: "home-view-local-draft",
      version: 2,
      schemaVersion: 2,
      id: draft.id,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      title: v.title,
      operation: v.operation,
      propertyType: v.propertyType,
      description: v.description,
      state: v.state,
      city: v.city,
      neighborhood: v.neighborhood,
      area: draft.area,
      beds: draft.beds,
      baths: draft.baths,
      latitude: draft.latitude,
      longitude: draft.longitude,
      imageRights: v.imageRights,
      publicLocation: draft.publicLocation ?? "approximate",
      locationReviewed: draft.locationReviewed === true,
      ...(hasVisitAccess(draft.visitAccess)
        ? { visitAccess: readVisitAccess(draft.visitAccess) }
        : {}),
      ...(draft.operation === "Renta"
        ? { rental: draft.rental }
        : { sale: draft.sale }),
      maintenance: draft.maintenance,
      community: draft.community,
      photos,
      scenes,
    },
    draft.id,
  );
}
