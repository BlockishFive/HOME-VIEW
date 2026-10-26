import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const worker = new URL(
  import.meta.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"),
);
const output = new URL("../public/maps/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [source, name] of [
  [worker, "maplibre-gl-worker.mjs"],
  [new URL("../LICENSE.txt", worker), "MapLibre-LICENSE.txt"],
]) {
  const data = await readFile(fileURLToPath(source));
  const target = new URL(name, output);
  let previous;
  try {
    previous = await readFile(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!previous?.equals(data)) await writeFile(target, data);
  console.log(
    `${name} prepared locally: ${data.length.toLocaleString("en-US")} bytes`,
  );
}
