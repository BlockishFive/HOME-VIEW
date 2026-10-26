import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDraftInput,
  validatePhotoFiles,
  normalizeDraftInput,
  type DraftInput,
} from "../lib/listing-drafts";
const valid: DraftInput = {
  title: "Casa para renta en León",
  operation: "Renta",
  propertyType: "Casa",
  price: 12000,
  description: "Casa de ejemplo con espacios amplios y buena iluminación.",
  state: "Guanajuato",
  city: "León",
  neighborhood: "Zona centro",
  area: 120,
  beds: 3,
  baths: 2,
  annualTax: null,
  monthlyMaintenance: null,
  latitude: 21.122,
  longitude: -101.686,
  imageRights: true,
};
test("rental draft accepts optional fiscal fields without inventing costs", () => {
  assert.deepEqual(validateDraftInput(valid), {});
  assert.equal(normalizeDraftInput(valid).annualTax, null);
});
test("invalid price, location and missing image rights prevent saving", () => {
  const errors = validateDraftInput({
    ...valid,
    price: NaN,
    latitude: 0,
    longitude: Infinity,
    imageRights: false,
  });
  for (const name of ["price", "latitude", "longitude", "imageRights"])
    assert.ok(errors[name]);
});
test("land removes room counts while preserving sale data", () => {
  const result = normalizeDraftInput({
    ...valid,
    propertyType: "Terreno",
    operation: "Venta",
  });
  assert.equal(result.beds, null);
  assert.equal(result.baths, null);
  assert.equal(result.operation, "Venta");
});
test("photo validation rejects missing, excessive, oversized and unsupported uploads", () => {
  assert.ok(validatePhotoFiles([]));
  assert.ok(
    validatePhotoFiles(Array(9).fill({ type: "image/jpeg", size: 500 })),
  );
  assert.ok(
    validatePhotoFiles([{ type: "image/jpeg", size: 6 * 1024 * 1024 }]),
  );
  assert.ok(validatePhotoFiles([{ type: "image/svg+xml", size: 100 }]));
  assert.equal(
    validatePhotoFiles([
      { type: "image/jpeg", size: 1000 },
      { type: "image/webp", size: 1000 },
    ]),
    null,
  );
});
