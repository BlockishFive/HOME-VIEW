import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { properties, getProperty, filterProperties } from "../lib/properties";
test("catalog has unique routes and resolves unknown properties safely", () => {
  assert.equal(properties.length, 3);
  assert.equal(new Set(properties.map((p) => p.slug)).size, properties.length);
  for (const p of properties) assert.equal(getProperty(p.slug), p);
  assert.equal(getProperty("no-existe"), undefined);
});
test("each tour graph is connected and every hotspot points to an existing room", () => {
  for (const property of properties) {
    const rooms = property.rooms;
    const visited = new Set<string>();
    function walk(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      const room = rooms.find((r) => r.id === id);
      assert.ok(room, `Room ${id} must exist`);
      for (const h of room.hotspots) {
        assert.ok(Number.isFinite(h.yaw) && Number.isFinite(h.pitch));
        walk(h.target);
      }
    }
    walk("sala");
    assert.equal(visited.size, rooms.length);
    for (const room of rooms) {
      assert.ok(room.x > 0 && room.x < 100 && room.y > 0 && room.y < 100);
      assert.ok(existsSync(`public${room.panorama}`));
    }
  }
});
test("all demo media are local JPEGs, with no external asset dependencies", () => {
  for (const property of properties)
    for (const path of [
      property.cover,
      ...property.gallery.map((image) => image.src),
      ...property.rooms.map((r) => r.panorama),
    ]) {
      assert.match(path, /^\/panoramas\/[a-z-]+\.jpg$/);
      const bytes = readFileSync(`public${path}`);
      assert.equal(bytes.readUInt16BE(0), 0xffd8);
    }
});

test("demo fiscal and map data are valid and filters compose", () => {
  for (const property of properties) {
    assert.ok(property.annualTax > 0 && Number.isFinite(property.annualTax));
    assert.ok(property.monthlyMaintenance >= 0);
    assert.ok(property.mapPosition.x > 0 && property.mapPosition.x < 900);
    assert.ok(property.mapPosition.y > 0 && property.mapPosition.y < 600);
  }
  assert.deepEqual(
    filterProperties(properties, "jardin", "Casa", 5000000).map((p) => p.slug),
    ["casa-oliva"],
  );
  assert.deepEqual(
    filterProperties(properties, "", "Departamento", 3000000).map(
      (p) => p.slug,
    ),
    ["loft-arena"],
  );
  assert.equal(
    filterProperties(properties, "sin coincidencias", "Todos", 10000000).length,
    0,
  );
});
