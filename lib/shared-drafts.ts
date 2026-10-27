"use client";
import type { ListingDraft } from "./listing-drafts";
export class SharedAccessError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const messages: Record<string, string> = {
  unauthorized:
    "Tu sesión privada expiró. Inicia sesión en otra pestaña y vuelve a guardar; la captura permanece aquí.",
  not_configured: "El área privada aún no está configurada.",
  invalid_credentials: "Usuario o contraseña incorrectos.",
  rate_limited:
    "Demasiados intentos. Espera 15 minutos antes de volver a entrar.",
  conflict:
    "Hay una versión más reciente en el servidor. Conserva esta captura y revisa el área privada antes de sobrescribir cambios.",
  too_large: "La captura supera 48 MB. Usa menos imágenes o reduce su tamaño.",
  quota:
    "El almacenamiento privado del piloto alcanzó su límite. Conserva un respaldo antes de eliminar registros.",
  invalid_media:
    "No se pudo validar una imagen. Usa JPEG, PNG o WebP; los panoramas deben ser capturas 360 completas en formato 2:1.",
  invalid: "Revisa los datos y los medios de la captura.",
  origin:
    "No se pudo verificar el origen de la solicitud. Abre el área privada desde la misma dirección del sitio.",
  storage:
    "No se pudo completar la operación en el servidor. La captura permanece en el formulario.",
};
export async function privateRequest(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`/api/private/${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "No hay conexión con el servidor privado. Conserva la captura y vuelve a intentarlo.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "storage" }));
    throw new Error(messages[data.error] || messages.storage);
  }
  return response;
}
type RemoteMedia = {
  id: string;
  name: string;
  url: string;
  hotspots?: ListingDraft["scenes"][number]["hotspots"];
};
type RemoteDraft = Omit<ListingDraft, "photos" | "scenes"> & {
  photos: RemoteMedia[];
  scenes: RemoteMedia[];
  sharedRevision: number;
};
async function hydrate(draft: RemoteDraft): Promise<ListingDraft> {
  const blob = async (asset: RemoteMedia) => {
    if (!asset.url.startsWith(`/api/private/media/${draft.id}/`))
      throw new Error(messages.storage);
    return (
      await privateRequest(asset.url.replace("/api/private/", ""))
    ).blob();
  };
  const photos = [];
  for (const asset of draft.photos)
    photos.push({ id: asset.id, name: asset.name, blob: await blob(asset) });
  const scenes = [];
  for (const asset of draft.scenes)
    scenes.push({
      id: asset.id,
      name: asset.name,
      hotspots: asset.hotspots ?? [],
      blob: await blob(asset),
    });
  return { ...draft, photos, scenes } as ListingDraft;
}
export async function getSharedDrafts(): Promise<ListingDraft[]> {
  const data = await (await privateRequest("drafts")).json();
  return Promise.all((data.drafts as RemoteDraft[]).map(hydrate));
}
export async function saveSharedDraft(
  draft: ListingDraft,
  expectedRevision = 0,
): Promise<number> {
  const form = new FormData();
  const metadata = {
    ...draft,
    photos: draft.photos.map(({ id, name }) => ({ id, name })),
    scenes: draft.scenes.map(({ id, name, hotspots }) => ({
      id,
      name,
      hotspots,
    })),
  };
  form.set("draft", JSON.stringify(metadata));
  form.set("revision", String(expectedRevision));
  for (const photo of draft.photos)
    form.set(`photo:${photo.id}`, photo.blob, photo.name);
  for (const scene of draft.scenes)
    form.set(`scene:${scene.id}`, scene.blob, `${scene.id}.jpg`);
  const data = await (
    await privateRequest("drafts", { method: "PUT", body: form })
  ).json();
  return data.draft.sharedRevision;
}
export async function deleteSharedDraft(id: string, revision: number) {
  await privateRequest(`drafts/${id}?revision=${revision}`, {
    method: "DELETE",
  });
}
