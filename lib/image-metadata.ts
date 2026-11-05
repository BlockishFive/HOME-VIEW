/** Read dimensions before allocating decoded pixels. No network, canvas or EXIF retention. */
export type ImageMetadata = {
  width: number;
  height: number;
  orientation: number;
  format: "jpeg" | "png" | "webp";
};
function exif(bytes: Uint8Array): number {
  let start = 0;
  if (
    bytes[0] === 69 &&
    bytes[1] === 120 &&
    bytes[2] === 105 &&
    bytes[3] === 102 &&
    bytes[4] === 0 &&
    bytes[5] === 0
  )
    start = 6;
  if (bytes.length < start + 8) return 1;
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset + start,
    bytes.length - start,
  );
  const little = view.getUint16(0) === 0x4949;
  if (!little && view.getUint16(0) !== 0x4d4d) return 1;
  if (view.getUint16(2, little) !== 42) return 1;
  const offset = view.getUint32(4, little);
  if (offset > view.byteLength - 2) return 1;
  const count = view.getUint16(offset, little);
  for (let i = 0; i < Math.min(count, 256); i++) {
    const position = offset + 2 + i * 12;
    if (position + 12 > view.byteLength) break;
    if (
      view.getUint16(position, little) === 274 &&
      view.getUint16(position + 2, little) === 3 &&
      view.getUint32(position + 4, little) === 1
    ) {
      const n = view.getUint16(position + 8, little);
      return n >= 1 && n <= 8 ? n : 1;
    }
  }
  return 1;
}
export function imageMetadata(bytes: Uint8Array): ImageMetadata {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0,
    orientation = 1,
    format: ImageMetadata["format"];
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    format = "jpeg";
    let position = 2;
    while (position + 4 <= bytes.length) {
      if (bytes[position++] !== 255) break;
      while (bytes[position] === 255) position++;
      const marker = bytes[position++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (position + 2 > bytes.length) break;
      const length = view.getUint16(position);
      if (length < 2 || position + length > bytes.length) break;
      if (marker === 225)
        orientation = exif(bytes.subarray(position + 2, position + length));
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      ) {
        height = view.getUint16(position + 3);
        width = view.getUint16(position + 5);
      }
      position += length;
    }
  } else if (
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    view.getUint32(8) === 13 &&
    view.getUint32(12) === 0x49484452
  ) {
    format = "png";
    width = view.getUint32(16);
    height = view.getUint32(20);
    let position = 8;
    while (position + 12 <= bytes.length) {
      const length = view.getUint32(position);
      if (position + 12 + length > bytes.length) break;
      if (view.getUint32(position + 4) === 0x65584966)
        orientation = exif(bytes.subarray(position + 8, position + 8 + length));
      position += 12 + length;
    }
  } else if (
    bytes.length >= 30 &&
    view.getUint32(0) === 0x52494646 &&
    view.getUint32(8) === 0x57454250
  ) {
    format = "webp";
    let position = 12;
    while (position + 8 <= bytes.length) {
      const kind = view.getUint32(position),
        size = view.getUint32(position + 4, true),
        data = position + 8;
      if (kind === 0x56503858 && data + 10 <= bytes.length) {
        width =
          1 +
          bytes[data + 4] +
          (bytes[data + 5] << 8) +
          (bytes[data + 6] << 16);
        height =
          1 +
          bytes[data + 7] +
          (bytes[data + 8] << 8) +
          (bytes[data + 9] << 16);
      }
      if (
        kind === 0x56503820 &&
        data + 10 <= bytes.length &&
        bytes[data + 3] === 157 &&
        bytes[data + 4] === 1 &&
        bytes[data + 5] === 42
      ) {
        width = view.getUint16(data + 6, true) & 0x3fff;
        height = view.getUint16(data + 8, true) & 0x3fff;
      }
      if (
        kind === 0x5650384c &&
        data + 5 <= bytes.length &&
        bytes[data] === 47
      ) {
        const bits = view.getUint32(data + 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      if (kind === 0x45584946 && data + size <= bytes.length)
        orientation = exif(bytes.subarray(data, data + size));
      position = data + size + (size % 2);
    }
  } else throw new Error("Usa imágenes JPEG, PNG o WebP válidas.");
  if (!width || !height)
    throw new Error(
      "No se pudieron leer las dimensiones de la imagen antes de procesarla. Exporta una copia JPEG sin metadatos adicionales.",
    );
  if (orientation >= 5) [width, height] = [height, width];
  return { width, height, orientation, format };
}
export async function readImageMetadata(blob: Blob) {
  const info = imageMetadata(
    new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer()),
  );
  // WebP may store EXIF after its compressed pixels. Skip the pixels, read only chunk headers and TIFF metadata.
  if (info.format === "webp") {
    let position = 12;
    for (let n = 0; n < 512 && position + 8 <= blob.size; n++) {
      const bytes = new Uint8Array(
          await blob.slice(position, position + 8).arrayBuffer(),
        ),
        view = new DataView(bytes.buffer);
      const kind = view.getUint32(0),
        size = view.getUint32(4, true);
      if (size > blob.size - position - 8)
        throw new Error("Usa imágenes JPEG, PNG o WebP válidas.");
      if (kind === 0x45584946) {
        const orientation = exif(
          new Uint8Array(
            await blob
              .slice(position + 8, position + 8 + Math.min(size, 65536))
              .arrayBuffer(),
          ),
        );
        if (orientation >= 5 !== info.orientation >= 5)
          [info.width, info.height] = [info.height, info.width];
        info.orientation = orientation;
        break;
      }
      position += 8 + size + (size % 2);
    }
  }
  return info;
}
