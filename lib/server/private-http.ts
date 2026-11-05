import { searchPlaces } from "./geocoding";
import { setPublication } from "./publications";
import { assertPrivateOrigin } from "./private-origin";
import {
  listHistory,
  listVersions,
  historicalVersion,
  historicalAsset,
  listActivity,
  HISTORY_LIMIT,
  HISTORY_BYTES,
} from "./history-store";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  normalizeDraftInput,
  validateDraftInput,
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  type DraftInput,
} from "../listing-drafts";
import {
  validateDraftScenes,
  validatePanoramaDimensions,
  MAX_PANORAMA_BYTES,
  type DraftScene,
} from "../draft-tour";
import {
  authenticated,
  configured,
  COOKIE_NAME,
  getAsset,
  listDrafts,
  login,
  logout,
  putDraft,
  removeDraft,
  SESSION_SECONDS,
  PrivateError,
  db,
  restoreHistoricalDraft,
  clearHistory,
  type PrivateMetadata,
} from "./private-store";
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LIMIT = 48 * 1024 * 1024;
export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};
function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: PRIVATE_HEADERS });
}
async function bounded(request: NextRequest, limit: number) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) throw new PrivateError("too_large", 413);
  if (!request.body) throw new PrivateError("invalid", 400);
  const reader = request.body.getReader();
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new PrivateError("too_large", 413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts);
}
function secureCookie(request: NextRequest) {
  return (
    new URL(request.headers.get("origin") || request.url).protocol === "https:"
  );
}
function checkId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new PrivateError("invalid");
}
function positiveRevision(value: unknown): number {
  const revision =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (
    typeof revision !== "number" ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    throw new PrivateError("invalid");
  return revision;
}
async function media(file: FormDataEntryValue | null, panorama: boolean) {
  if (
    !(file instanceof Blob) ||
    !PHOTO_TYPES.includes(file.type) ||
    file.size < 1 ||
    file.size > (panorama ? MAX_PANORAMA_BYTES : MAX_PHOTO_BYTES)
  )
    throw new PrivateError("invalid_media", 422);
  const buffer = Buffer.from(await file.arrayBuffer());
  const magic =
    (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) ||
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP");
  if (!magic) throw new PrivateError("invalid_media", 422);
  try {
    const image = sharp(buffer, {
      limitInputPixels: 60000000,
      animated: false,
    });
    const info = await image.metadata();
    if (
      !info.width ||
      !info.height ||
      !["jpeg", "png", "webp"].includes(info.format || "")
    )
      throw new Error("format");
    if (
      panorama &&
      ((info.orientation ?? 1) > 4 ||
        validatePanoramaDimensions(info.width, info.height))
    )
      throw new Error("dimensions");
    return await image
      .rotate()
      .resize({
        width: panorama ? 4096 : 1920,
        height: panorama ? 2048 : 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new PrivateError("invalid_media", 422);
  }
}
async function upload(request: NextRequest) {
  const buffer = await bounded(request, LIMIT);
  const form = await new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") || "" },
    body: buffer,
  }).formData();
  const text = form.get("draft");
  if (typeof text !== "string" || text.length > 128 * 1024)
    throw new PrivateError("invalid");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error();
  } catch {
    throw new PrivateError("invalid");
  }
  checkId(raw.id);
  for (const key of ["title", "description", "state", "city", "neighborhood"])
    if (typeof raw[key] !== "string") throw new PrivateError("invalid");
  if (
    raw.imageRights !== true ||
    typeof raw.createdAt !== "string" ||
    raw.createdAt.length > 64 ||
    !Number.isFinite(Date.parse(raw.createdAt))
  )
    throw new PrivateError("invalid");
  if (raw.rental && typeof raw.rental === "object") {
    const r = raw.rental as Record<string, unknown>,
      services = r.services as Record<string, unknown> | undefined;
    raw.rental = {
      monthlyRent: r.monthlyRent,
      deposit: r.deposit,
      minimumMonths: r.minimumMonths,
      guarantee: r.guarantee,
      guarantor: r.guarantor,
      legalPolicy: r.legalPolicy,
      pets: r.pets,
      furnished: r.furnished,
      services: {
        water: services?.water,
        electricity: services?.electricity,
        gas: services?.gas,
        internet: services?.internet,
      },
    };
  }
  if (raw.sale && typeof raw.sale === "object") {
    const sale = raw.sale as Record<string, unknown>;
    raw.sale = { purchasePrice: sale.purchasePrice, annualTax: sale.annualTax };
  }
  if (raw.maintenance && typeof raw.maintenance === "object") {
    const fee = raw.maintenance as Record<string, unknown>;
    raw.maintenance = {
      status: fee.status,
      amount: fee.amount,
      included: fee.included,
    };
  }
  let input: DraftInput;
  try {
    if (Object.keys(validateDraftInput(raw as DraftInput)).length)
      throw new Error();
    input = normalizeDraftInput(raw as DraftInput);
  } catch {
    throw new PrivateError("invalid");
  }
  if (
    !Array.isArray(raw.photos) ||
    raw.photos.length < 1 ||
    raw.photos.length > 8 ||
    !Array.isArray(raw.scenes) ||
    raw.scenes.length > 8 ||
    (input.propertyType === "Terreno" && raw.scenes.length)
  )
    throw new PrivateError("invalid");
  const revision = Number(form.get("revision"));
  if (!Number.isInteger(revision) || revision < 0)
    throw new PrivateError("invalid");
  const assets: { id: string; content: Buffer }[] = [];
  const used = new Set<string>();
  const claim = (id: unknown) => {
    checkId(id);
    if (used.has(id)) throw new PrivateError("invalid");
    used.add(id);
    return id;
  };
  const photos = [];
  for (const photo of raw.photos) {
    if (!photo || typeof photo.name !== "string" || photo.name.length > 120)
      throw new PrivateError("invalid");
    const id = claim(photo.id);
    const content = await media(form.get(`photo:${id}`), false);
    assets.push({ id, content });
    photos.push({
      id,
      name: photo.name,
      url: `/api/private/media/${raw.id}/${id}`,
    });
  }
  const scenes = [];
  const validated: DraftScene[] = [];
  for (const scene of raw.scenes) {
    if (
      !scene ||
      typeof scene.name !== "string" ||
      !Array.isArray(scene.hotspots) ||
      scene.hotspots.length > 8 ||
      scene.hotspots.some((h: unknown) => !h || typeof h !== "object")
    )
      throw new PrivateError("invalid");
    const id = claim(scene.id);
    const content = await media(form.get(`scene:${id}`), true);
    assets.push({ id, content });
    const hotspots = scene.hotspots.map(
      (h: { target: unknown; yaw: unknown; pitch: unknown }) => ({
        target: h.target,
        yaw: h.yaw,
        pitch: h.pitch,
      }),
    );
    const initialView =
      scene.initialView === undefined
        ? undefined
        : {
            yaw: scene.initialView?.yaw,
            pitch: scene.initialView?.pitch,
            fov: scene.initialView?.fov,
          };
    validated.push({
      id,
      name: scene.name,
      blob: new Blob([new Uint8Array(content)], { type: "image/jpeg" }),
      hotspots,
      ...(initialView ? { initialView } : {}),
    });
    scenes.push({
      id,
      name: scene.name,
      hotspots,
      ...(initialView ? { initialView } : {}),
      url: `/api/private/media/${raw.id}/${id}`,
    });
  }
  if (validateDraftScenes(validated)) throw new PrivateError("invalid");
  const metadata = {
    ...input,
    id: raw.id,
    schemaVersion: 2,
    createdAt: raw.createdAt,
    updatedAt: new Date().toISOString(),
    photos,
    scenes,
    sharedRevision: 0,
  } as PrivateMetadata;
  return putDraft(metadata, assets, revision);
}
export async function privateHandler(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  try {
    const { segments } = await context.params;
    const path = segments.join("/");
    const method = request.method;
    if (!["GET", "HEAD"].includes(method)) assertPrivateOrigin(request);
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (path === "session" && method === "GET")
      return json({
        configured: configured(),
        authenticated: authenticated(token),
      });
    if (path === "login" && method === "POST") {
      let data;
      try {
        data = JSON.parse((await bounded(request, 4096)).toString("utf8"));
      } catch (error) {
        if (error instanceof PrivateError) throw error;
        throw new PrivateError("invalid");
      }
      if (
        !data ||
        typeof data.username !== "string" ||
        typeof data.password !== "string"
      )
        throw new PrivateError("invalid_credentials", 401);
      const session = login(data.username, data.password);
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, session, {
        httpOnly: true,
        sameSite: "strict",
        secure: secureCookie(request),
        path: "/api/private",
        maxAge: SESSION_SECONDS,
      });
      return response;
    }
    if (!authenticated(token)) throw new PrivateError("unauthorized", 401);
    if (path === "activity" && method === "GET") {
      const cursor = request.nextUrl.searchParams.get("before");
      const events = listActivity(
        db(),
        cursor === null ? Number.MAX_SAFE_INTEGER : positiveRevision(cursor),
      );
      return json({
        events,
        nextCursor: events.length === 30 ? events.at(-1)?.id : null,
      });
    }
    if (path === "history" && method === "GET")
      return json({
        drafts: listHistory(db()),
        limit: HISTORY_LIMIT,
        bytes: HISTORY_BYTES,
      });
    if (segments[0] === "history" && segments.length >= 2) {
      const id = segments[1];
      checkId(id);
      if (segments.length === 2 && method === "GET") {
        const head = listHistory(db()).find((row) => row.id === id);
        if (!head) throw new PrivateError("history_missing", 404);
        return json({ head, versions: listVersions(db(), id) });
      }
      if (
        (segments.length === 2 && method === "DELETE") ||
        (segments.length === 3 &&
          segments[2] === "restore" &&
          method === "POST")
      ) {
        let data;
        try {
          data = JSON.parse((await bounded(request, 4096)).toString("utf8"));
        } catch (error) {
          if (error instanceof PrivateError) throw error;
          throw new PrivateError("invalid");
        }
        if (!data || typeof data.deleted !== "boolean")
          throw new PrivateError("invalid");
        const revision = positiveRevision(data.expectedRevision);
        if (method === "DELETE") {
          clearHistory(id, revision, data.deleted);
          return json({ ok: true });
        }
        return json({
          draft: restoreHistoricalDraft(
            id,
            positiveRevision(data.sourceRevision),
            revision,
            data.deleted,
          ),
        });
      }
      if (segments.length === 3 && method === "GET") {
        const revision = positiveRevision(segments[2]);
        const draft = historicalVersion(db(), id, revision);
        return json({
          draft: {
            ...draft,
            photos: (draft.photos as { id: string }[]).map((photo) => ({
              ...photo,
              url: `/api/private/history/${id}/${revision}/media/${photo.id}`,
            })),
            scenes: (draft.scenes as { id: string }[]).map((scene) => ({
              ...scene,
              url: `/api/private/history/${id}/${revision}/media/${scene.id}`,
            })),
          },
        });
      }
      if (
        segments.length === 5 &&
        segments[3] === "media" &&
        method === "GET"
      ) {
        const revision = positiveRevision(segments[2]);
        checkId(segments[4]);
        const asset = historicalAsset(db(), id, revision, segments[4]);
        if (!asset) throw new PrivateError("history_missing", 404);
        return new Response(new Uint8Array(asset), {
          headers: {
            ...PRIVATE_HEADERS,
            "Content-Type": "image/jpeg",
            "Content-Disposition": "inline",
          },
        });
      }
      throw new PrivateError("not_found", 404);
    }
    if (path === "logout" && method === "POST") {
      logout(token);
      const response = json({ ok: true });
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "strict",
        secure: secureCookie(request),
        path: "/api/private",
        maxAge: 0,
      });
      return response;
    }
    if (
      segments[0] === "publication" &&
      segments.length === 2 &&
      method === "POST"
    ) {
      checkId(segments[1]);
      const data = JSON.parse((await bounded(request, 4096)).toString("utf8"));
      if (
        !data ||
        !Number.isInteger(data.revision) ||
        data.revision < 1 ||
        typeof data.publish !== "boolean"
      )
        throw new PrivateError("invalid");
      setPublication(segments[1], data.revision, data.publish);
      return json({ ok: true });
    }
    if (path === "geocode" && method === "POST") {
      let data;
      try {
        data = JSON.parse((await bounded(request, 2048)).toString("utf8"));
      } catch {
        throw new PrivateError("invalid");
      }
      if (typeof data?.query !== "string") throw new PrivateError("invalid");
      return json({
        results: await searchPlaces(
          data.query,
          data.locale === "en" ? "en" : "es",
        ),
      });
    }
    if (path === "drafts" && method === "GET")
      return json({ drafts: listDrafts() });
    if (segments[0] === "drafts" && segments.length === 2 && method === "GET") {
      checkId(segments[1]);
      const draft = listDrafts().find((draft) => draft.id === segments[1]);
      if (!draft) throw new PrivateError("not_found", 404);
      return json({ draft });
    }
    if (path === "drafts" && method === "PUT")
      return json({ draft: await upload(request) });
    if (
      segments[0] === "drafts" &&
      segments.length === 2 &&
      method === "DELETE"
    ) {
      checkId(segments[1]);
      const revision = Number(request.nextUrl.searchParams.get("revision"));
      if (!Number.isInteger(revision) || revision < 1)
        throw new PrivateError("invalid");
      removeDraft(segments[1], revision);
      return json({ ok: true });
    }
    if (segments[0] === "media" && segments.length === 3 && method === "GET") {
      checkId(segments[1]);
      checkId(segments[2]);
      const asset = getAsset(segments[1], segments[2]);
      if (!asset) throw new PrivateError("not_found", 404);
      return new Response(new Uint8Array(asset), {
        headers: {
          ...PRIVATE_HEADERS,
          "Content-Type": "image/jpeg",
          "Content-Disposition": "inline",
        },
      });
    }
    throw new PrivateError("not_found", 404);
  } catch (error) {
    if (error instanceof PrivateError)
      return json({ error: error.code }, error.status);
    // Do not log media, credentials, request bodies or database paths.
    return json({ error: "storage" }, 500);
  }
}
