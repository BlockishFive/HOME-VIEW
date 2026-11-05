"use client";
import { readImageMetadata } from "./image-metadata";
import { validatePanoramaDimensions, validatePanoramaFile } from "./draft-tour";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "./listing-drafts";
export type MediaPreparation = {
  blob: Blob;
  source: { width: number; height: number; bytes: number };
  prepared: { width: number; height: number; bytes: number };
  milliseconds: number;
  decoder: "bitmap" | "image";
};
export async function prepareBrowserMedia(
  file: Blob,
  panorama: boolean,
  widthLimit = 4096,
): Promise<MediaPreparation> {
  const started = performance.now();
  const invalid = panorama
    ? validatePanoramaFile(file)
    : !PHOTO_TYPES.includes(file.type) ||
        file.size < 1 ||
        file.size > MAX_PHOTO_BYTES
      ? "Usa fotos JPEG, PNG o WebP de hasta 5 MB."
      : null;
  if (invalid) throw new Error(invalid);
  const info = await readImageMetadata(file);
  if (info.width * info.height > 60000000)
    throw new Error(
      "La imagen supera los 60 millones de píxeles. Reduce su tamaño antes de añadirla.",
    );
  const dimensions = panorama
    ? validatePanoramaDimensions(info.width, info.height)
    : null;
  if (dimensions) throw new Error(dimensions);
  const limit = panorama ? Math.min(4096, Math.max(1024, widthLimit)) : 1920,
    scale = Math.min(1, limit / Math.max(info.width, info.height));
  const width = Math.max(1, Math.round(info.width * scale)),
    height = panorama
      ? width / 2
      : Math.max(1, Math.round(info.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  let bitmap: ImageBitmap | undefined,
    image: HTMLImageElement | undefined,
    url: string | undefined,
    decoder: MediaPreparation["decoder"] = "image";
  try {
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Tu navegador no pudo preparar las imágenes.");
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: "high",
        });
        decoder = "bitmap";
      } catch {
        /* Safari fallback below; header bounds were checked before decode. */
      }
    }
    if (!bitmap) {
      image = new Image();
      url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          image!.onload = null;
          image!.onerror = null;
          image!.removeAttribute("src");
          reject(new Error("No se pudo decodificar la imagen a tiempo."));
        }, 30000);
        image!.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        image!.onerror = () => {
          clearTimeout(timer);
          reject(new Error("No se pudo decodificar la imagen."));
        };
        image!.src = url!;
      });
      if (
        image.naturalWidth !== info.width ||
        image.naturalHeight !== info.height
      )
        throw new Error(
          "Las dimensiones decodificadas no coinciden. Exporta una copia JPEG sin metadatos adicionales.",
        );
    }
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap ?? image!, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("No se pudo preparar la imagen.")),
        "image/jpeg",
        panorama ? 0.88 : 0.85,
      ),
    );
    // Give input/paint a turn between files. No telemetry or persisted timing data.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return {
      blob,
      source: { width: info.width, height: info.height, bytes: file.size },
      prepared: { width, height, bytes: blob.size },
      milliseconds: Math.round(performance.now() - started),
      decoder,
    };
  } finally {
    bitmap?.close();
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
    }
    if (url) URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}
