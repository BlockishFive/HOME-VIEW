import test from "node:test";
import assert from "node:assert/strict";
import { publicPoint, validPoint, photonResults } from "../lib/location";
import {
  migrateListingDraft,
  normalizeDraftInput,
  type ListingDraft,
} from "../lib/listing-drafts";
test("approximate public points use cells; exact precision is explicit, deterministic and bounded", () => {
  const privatePoint = { lat: 21.145678, lng: -101.735678 };
  assert.deepEqual(publicPoint(privatePoint), { lat: 21.145, lng: -101.735 });
  assert.deepEqual(
    publicPoint({ ...privatePoint, lat: 21.149999 }),
    publicPoint(privatePoint),
  );
  assert.deepEqual(publicPoint(privatePoint, "exact"), privatePoint);
  assert.equal(validPoint({ lat: NaN, lng: -101 }), false);
  assert.throws(() => publicPoint({ lat: 45, lng: 20 }));
});
test("geocoding only accepts bounded Mexico points and plain labels", () => {
  const result = photonResults({
    features: [
      {
        geometry: { type: "Point", coordinates: [-101.735678, 21.145678] },
        properties: { name: "Zona ficticia", city: "León", countrycode: "MX" },
      },
      {
        geometry: { type: "Point", coordinates: [NaN, 21] },
        properties: { name: "bad" },
      },
      {
        geometry: { type: "Point", coordinates: [-100, 31] },
        properties: { name: "Texas", countrycode: "US" },
      },
      {
        geometry: { type: "Point", coordinates: [-101, 21] },
        properties: { name: { malformed: true } },
      },
      {
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "bad" },
      },
    ],
  });
  assert.deepEqual(result, [
    { lat: 21.145678, lng: -101.735678, label: "Zona ficticia, León" },
  ]);
  assert.throws(() => photonResults({ error: "oops" }));
});
