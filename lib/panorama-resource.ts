"use client";
import { readImageMetadata } from "./image-metadata";
import { MAX_PANORAMA_BYTES, validatePanoramaDimensions } from "./draft-tour";
/** Fetch once per active scene; Marzipano reuses the temporary Blob URL. */
export async function panoramaResource(source: string, signal: AbortSignal) {
  const address = new URL(source, window.location.href);
  if (
    address.origin !== window.location.origin ||
    !["http:", "https:", "blob:"].includes(address.protocol)
  )
    throw new Error("Unsupported panorama URL");
  const response = await fetch(address, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) > MAX_PANORAMA_BYTES
  )
    throw new Error("Panorama unavailable");
  const parts: Uint8Array<ArrayBuffer>[] = [],
    reader = response.body?.getReader();
  let size = 0;
  if (!reader) throw new Error("Panorama unavailable");
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PANORAMA_BYTES) {
        await reader.cancel();
        throw new Error("Panorama too large");
      }
      parts.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  const raw = new Blob(parts),
    info = await readImageMetadata(raw);
  if (signal.aborted || validatePanoramaDimensions(info.width, info.height))
    throw new Error("Invalid panorama dimensions");
  const blob = new Blob([raw], { type: `image/${info.format}` });
  let verified = false;
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: 256,
        resizeHeight: 128,
      });
      bitmap.close();
      verified = true;
    } catch {
      /* Image decoder fallback for older Safari. */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    if (!verified) {
      const image = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          const stop = () => {
            image.removeAttribute("src");
            reject(new Error("Panorama cancelled"));
          };
          const finish = (ok: boolean) => {
            signal.removeEventListener("abort", stop);
            ok ? resolve() : reject(new Error("Panorama unavailable"));
          };
          image.onload = () => finish(true);
          image.onerror = () => finish(false);
          signal.addEventListener("abort", stop, { once: true });
          if (signal.aborted) {
            stop();
            return;
          }
          image.src = url;
        });
      } finally {
        image.onload = null;
        image.onerror = null;
        image.removeAttribute("src");
      }
    }
    if (signal.aborted) throw new Error("Panorama cancelled");
    return { url, width: info.width, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
