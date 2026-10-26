import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PMTiles, TileType } from "pmtiles";

const bytes = readFileSync("public/maps/home-view.pmtiles");
const manifest = JSON.parse(readFileSync("public/maps/manifest.json", "utf8"));
let archiveNumber = 0;
function archive() {
  const key = `local-${++archiveNumber}`;
  const reads: { offset: number; length: number }[] = [];
  return {
    reads,
    reader: new PMTiles({
      getKey: () => key,
      getBytes: async (offset, length) => {
        reads.push({ offset, length });
        return {
          data: Uint8Array.from(bytes.subarray(offset, offset + length)).buffer,
        };
      },
    }),
  };
}
test("bundled map is a checked small vector archive with licensed coverage metadata", async () => {
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.equal(bytes.length, manifest.bytes);
  assert.ok(
    bytes.length < 512 * 1024,
    "Reference archive must remain below512KiB",
  );
  const { reader } = archive();
  const header = await reader.getHeader();
  assert.equal(header.tileType, TileType.Mvt);
  assert.equal(header.minZoom, 3);
  assert.equal(header.maxZoom, 14);
  const metadata = (await reader.getMetadata()) as {
    attribution: string;
    vector_layers: { id: string }[];
  };
  assert.match(metadata.attribution, /Natural Earth/);
  assert.equal(metadata.vector_layers[0].id, "basemap");
});
test("León geometry can be read without downloading the complete archive", async () => {
  const { reader, reads } = archive();
  const z = 12,
    scale = 2 ** z;
  const x = Math.floor(((-101.686 + 180) / 360) * scale);
  const y = Math.floor(
    ((1 - Math.asinh(Math.tan((21.122 * Math.PI) / 180)) / Math.PI) / 2) *
      scale,
  );
  let foundLand = false,
    foundRoad = false;
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const tile = await reader.getZxy(z, x + dx, y + dy);
      if (!tile) continue;
      const content = Buffer.from(tile.data);
      foundLand ||= content.includes(Buffer.from("land"));
      foundRoad ||= content.includes(Buffer.from("road"));
      assert.ok(content.includes(Buffer.from("leon")));
    }
  assert.ok(foundLand);
  assert.ok(foundRoad);
  assert.ok(reads.reduce((sum, r) => sum + r.length, 0) < bytes.length);
});
