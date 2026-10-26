// Original Home View house mark. No external images or image libraries.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../public/icons/", import.meta.url));
mkdirSync(directory, { recursive: true });
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function distance(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
function icon(size, maskable = false) {
  const scanlines = Buffer.alloc(size * (size * 3 + 1));
  // House stays inside the central safe circle for maskable icons.
  const points = maskable
    ? [[.28,.46],[.5,.27],[.72,.46],[.72,.72],[.28,.72],[.28,.46]]
    : [[.23,.44],[.5,.21],[.77,.44],[.77,.79],[.23,.79],[.23,.44]];
  const door = maskable
    ? [[.44,.72],[.44,.55],[.56,.55],[.56,.72]]
    : [[.42,.79],[.42,.55],[.58,.55],[.58,.79]];
  const segments = [points, door].flatMap((line) => line.slice(1).map((point, i) => [line[i], point]));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const green = segments.some(([a,b]) => distance(x/size, y/size, a,b) <= .024);
      const color = green ? [197,245,58] : [20,22,20];
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      scanlines.set(color, offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]);
}
for (const size of [192, 512]) writeFileSync(`${directory}/icon-${size}.png`, icon(size));
writeFileSync(`${directory}/icon-maskable-512.png`, icon(512, true));
writeFileSync(`${directory}/apple-touch-icon.png`, icon(180));
