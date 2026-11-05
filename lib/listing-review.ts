import {
  normalizeDraftInput,
  validateDraftInput,
  type ListingDraft,
  type DraftInput,
} from "./listing-drafts";
import { analyzeTour, validSceneView } from "./draft-tour";
import type { CaptureContent } from "./capture-store";
import type { ListingMetadata } from "./listing-presentation";
export type ReviewNotice = {
  key: string;
  message: string;
  params?: Record<string, string | number>;
};
export function draftFromCapture(content: CaptureContent): ListingDraft {
  const v = content.values;
  const optional = (value: string) =>
    value.trim() === "" ? null : Number(value);
  const required = (value: string) =>
    value.trim() === "" ? NaN : Number(value);
  const input: DraftInput = {
    title: v.title,
    description: v.description,
    propertyType: v.propertyType,
    state: v.state,
    city: v.city,
    neighborhood: v.neighborhood,
    area: required(v.area),
    beds: optional(v.beds),
    baths: optional(v.baths),
    latitude: required(v.latitude),
    longitude: required(v.longitude),
    imageRights: v.imageRights,
    publicLocation: content.publicLocation,
    locationReviewed: content.locationReviewed,
    visitAccess: content.visitAccess,
    maintenance: content.maintenance,
    community: content.community,
    ...(v.operation === "Renta"
      ? {
          operation: "Renta",
          rental: { ...content.rental, monthlyRent: optional(v.rentPrice) },
        }
      : {
          operation: "Venta",
          sale: { ...content.sale, purchasePrice: optional(v.salePrice) },
        }),
  };
  return {
    ...normalizeDraftInput(input),
    id: "captura",
    schemaVersion: 2,
    createdAt: "",
    photos: content.photos,
    scenes: v.propertyType === "Terreno" ? [] : content.scenes,
  };
}
export function listingReview(draft: ListingMetadata) {
  const errors = validateDraftInput(draft);
  if (!draft.photos.length)
    errors.photos = "Añade al menos una fotografía del inmueble.";
  if (!draft.locationReviewed)
    errors.locationReviewed =
      "Revisa y guarda la ubicación del borrador antes de publicar.";
  const ids = new Set(draft.scenes.map((s) => s.id));
  if (
    ids.size !== draft.scenes.length ||
    draft.scenes.some(
      (s) =>
        !s.id ||
        !s.name.trim() ||
        s.name.length > 80 ||
        (s.initialView !== undefined && !validSceneView(s.initialView)) ||
        s.hotspots.some(
          (h, i) =>
            !ids.has(h.target) ||
            h.target === s.id ||
            s.hotspots.findIndex((other) => other.target === h.target) !== i ||
            !Number.isFinite(h.yaw) ||
            Math.abs(h.yaw) > Math.PI ||
            !Number.isFinite(h.pitch) ||
            Math.abs(h.pitch) > Math.PI / 2,
        ),
    )
  )
    errors.scenes =
      "Revisa los nombres, conexiones y orientación de las escenas 360.";
  const blockers = Object.entries(errors).map(([key, message]) => ({
    key,
    message,
  }));
  const pending: ReviewNotice[] = [];
  const add = (key: string, message: string) => pending.push({ key, message });
  const m = draft.maintenance;
  if (m.status === "unknown")
    add("maintenance", "Existencia de cuota de mantenimiento por confirmar.");
  if (m.status === "yes" && m.amount === null)
    add("maintenanceAmount", "Importe de mantenimiento por confirmar.");
  if (
    draft.operation === "Renta" &&
    m.status === "yes" &&
    m.included === "unknown"
  )
    add(
      "maintenanceIncluded",
      "Inclusión del mantenimiento en la renta por confirmar.",
    );
  if (draft.community === "unknown")
    add(
      "community",
      "Pertenencia a fraccionamiento o condominio por confirmar.",
    );
  if (draft.operation === "Venta") {
    if (draft.sale.annualTax === null)
      add("annualTax", "Predial anual por confirmar.");
  } else {
    const r = draft.rental;
    if (r.deposit === null) add("deposit", "Depósito por confirmar.");
    if (r.minimumMonths === null)
      add("minimumMonths", "Plazo mínimo por confirmar.");
    if (r.guarantee === "unknown")
      add("guarantee", "Relación entre aval y póliza jurídica por confirmar.");
    if (r.guarantee === "independent") {
      if (r.guarantor === "unknown")
        add("guarantor", "Requisito de aval por confirmar.");
      if (r.legalPolicy === "unknown")
        add("legalPolicy", "Requisito de póliza jurídica por confirmar.");
    }
    if (r.pets === "unknown")
      add("pets", "Condiciones de mascotas por confirmar.");
    if (r.furnished === "unknown") add("furnished", "Amueblado por confirmar.");
    for (const [key, message] of [
      ["water", "Agua incluida por confirmar."],
      ["electricity", "Electricidad incluida por confirmar."],
      ["gas", "Gas incluido por confirmar."],
      ["internet", "Internet incluido por confirmar."],
    ] as const)
      if (r.services[key] === "unknown") add(key, message);
  }
  const notes: ReviewNotice[] = [];
  if (draft.propertyType !== "Terreno" && !draft.scenes.length)
    notes.push({
      key: "tour",
      message:
        "El recorrido 360 es opcional; este anuncio mostrará fotografías.",
    });
  if (draft.scenes.length) {
    const graph = analyzeTour(draft.scenes);
    const names = (list: string[]) =>
      list
        .map((id) => draft.scenes.find((s) => s.id === id)?.name || "—")
        .join(", ");
    if (graph.unreachable.length)
      notes.push({
        key: "unreachable",
        message: "Sin camino desde la escena inicial: {names}.",
        params: { names: names(graph.unreachable) },
      });
    if (graph.noReturn.length)
      notes.push({
        key: "noReturn",
        message: "Sin camino de regreso al inicio: {names}.",
        params: { names: names(graph.noReturn) },
      });
  }
  return {
    blockers,
    pending,
    notes,
    canPublish: blockers.length === 0,
    canPreview: blockers.every((issue) =>
      ["imageRights", "locationReviewed", "visitAccess"].includes(issue.key),
    ),
  };
}
