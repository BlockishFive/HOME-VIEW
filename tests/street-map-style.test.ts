import test from "node:test";
import assert from "node:assert/strict";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { streetMapStyle, STREET_TILEJSON } from "../lib/street-map-style";
test("Home View vector style is valid, uses OpenFreeMap, and has visible roads/buildings/labels without raster or external fonts", () => {
  for (const locale of ["es", "en"] as const) {
    const style = streetMapStyle(locale);
    assert.deepEqual(validateStyleMin(style), []);
    assert.deepEqual(style.sources.streets, {
      type: "vector",
      url: STREET_TILEJSON,
    });
    assert.equal(style.glyphs, undefined);
    assert.equal(style.sprite, undefined);
    for (const id of [
      "hv-roads",
      "hv-road-labels",
      "hv-buildings",
      "hv-neighborhood-labels",
    ])
      assert.ok(style.layers.some((l) => l.id === id));
    assert.ok(style.layers.every((l) => l.type !== "raster"));
    const labels = style.layers.find((l) => l.id === "hv-road-labels")!;
    assert.ok(JSON.stringify(labels).includes(`name:${locale}`));
    assert.equal(
      JSON.stringify(style).includes("tile.openstreetmap.org"),
      false,
    );
    assert.equal(JSON.stringify(style).includes("google"), false);
  }
});
