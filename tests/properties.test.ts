import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  properties,
  getProperty,
  filterProperties,
  hasTour,
} from "../lib/properties";
test("catalog has unique routes and resolves unknown properties safely", () => {
  assert.equal(properties.length, 5);
  assert.equal(new Set(properties.map((p) => p.slug)).size, properties.length);
  for (const p of properties) assert.equal(getProperty(p.slug), p);
  assert.equal(getProperty("no-existe"), undefined);
});
test("each tour graph is connected and every hotspot points to an existing room", () => {
  for (const property of properties) {
    const rooms = property.rooms;
    if (!rooms.length) {
      assert.equal(hasTour(property), false);
      continue;
    }
    assert.notEqual(property.propertyType, "Terreno");
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
test("demo photos and original land illustration are local and valid", () => {
  for (const property of properties)
    for (const path of [
      property.cover,
      ...property.gallery.map((image) => image.src),
      ...property.rooms.map((r) => r.panorama),
    ]) {
      assert.match(
        path,
        /^\/(panoramas\/[a-z-]+\.jpg|illustrations\/terreno\.svg)$/,
      );
      const bytes = readFileSync(`public${path}`);
      if (path.endsWith(".jpg")) assert.equal(bytes.readUInt16BE(0), 0xffd8);
      else {
        assert.match(bytes.toString(), /<svg/);
        assert.doesNotMatch(
          bytes.toString(),
          /<script|foreignObject|(?:href|src)=/i,
        );
      }
    }
});

test("demo fiscal and map data are valid and filters compose", () => {
  for (const property of properties) {
    if (property.operation === "Venta") {
      assert.ok(property.sale.annualTax !== null && property.sale.annualTax > 0);
      assert.equal(property.rental, undefined);
      assert.equal(property.sale.purchasePrice, property.priceValue);
    } else {
      assert.equal(property.sale, undefined);
      assert.equal("annualTax" in property, false);
      assert.equal(property.rental.monthlyRent, property.priceValue);
    }
    assert.ok(property.maintenance.amount === null || property.maintenance.amount >= 0);
    assert.ok(property.coordinates.lat > 14 && property.coordinates.lat < 33);
    assert.ok(
      property.coordinates.lng > -119 && property.coordinates.lng < -86,
    );
  }
  assert.deepEqual(
    filterProperties(properties, "jardin", "Casa", 5000000, "Venta").map(
      (p) => p.slug,
    ),
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
