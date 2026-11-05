import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDraftInput,
  validatePhotoFiles,
  normalizeDraftInput,
  migrateListingDraft,
  type LegacyDraft,
  type DraftInput,
} from "../lib/listing-drafts";
import { defaultMaintenance, defaultRentalTerms } from "../lib/property-terms";
const valid: Extract<DraftInput, { operation: "Renta" }> = {
  title: "Casa para renta en León",
  operation: "Renta",
  propertyType: "Casa",
  rental: { ...defaultRentalTerms(), monthlyRent: 12000 },
  maintenance: defaultMaintenance(),
  community: "unknown",
  description: "Casa de ejemplo con espacios amplios y buena iluminación.",
  state: "Guanajuato",
  city: "León",
  neighborhood: "Zona centro",
  area: 120,
  beds: 3,
  baths: 2,
  latitude: 21.122,
  longitude: -101.686,
  imageRights: true,
};
test("rental draft accepts optional fiscal fields without inventing costs", () => {
  assert.deepEqual(validateDraftInput(valid), {});
  assert.equal("annualTax" in normalizeDraftInput(valid), false);
  assert.equal("sale" in normalizeDraftInput(valid), false);
});
test("invalid price, location and missing image rights prevent saving", () => {
  const errors = validateDraftInput({
    ...valid,
    rental: { ...valid.rental, monthlyRent: NaN },
    latitude: 0,
    longitude: Infinity,
    imageRights: false,
  });
  for (const name of ["price", "latitude", "longitude", "imageRights"])
    assert.ok(errors[name]);
});
test("land removes room counts while preserving sale data", () => {
  const { rental, ...common } = valid;
  const result = normalizeDraftInput({
    ...common,
    sale: { purchasePrice: 1200000, annualTax: 3000 },
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

function legacy(
  operation: "Renta" | "Venta",
  maintenance: number | null = null,
): LegacyDraft {
  const { rental, maintenance: fee, community, ...common } = valid;
  return {
    ...common,
    operation,
    price: 18000,
    annualTax: 5000,
    monthlyMaintenance: maintenance,
    id: "legacy-1",
    createdAt: "2026-01-01T00:00:00Z",
    photos: [],
  };
}
test("legacy rental migrates without tax or inferred conditions; positive fee inclusion stays unknown", () => {
  const old = legacy("Renta", 900);
  const result = migrateListingDraft(old);
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.operation, "Renta");
  if (result.operation !== "Renta") throw new Error("Wrong operation");
  assert.equal(result.rental.monthlyRent, 18000);
  assert.equal(result.rental.guarantor, "unknown");
  assert.equal(result.rental.services.water, "unknown");
  assert.deepEqual(result.maintenance, {
    status: "yes",
    amount: 900,
    included: "unknown",
  });
  assert.equal("annualTax" in result, false);
  assert.equal("sale" in result, false);
  assert.equal(old.annualTax, 5000);
  assert.equal(result.photos, old.photos);
});
test("legacy zero/blank fee is ambiguous, sale retains tax, v2 migration is idempotent", () => {
  for (const value of [null, 0])
    assert.deepEqual(
      migrateListingDraft(legacy("Renta", value)).maintenance,
      defaultMaintenance(),
    );
  const sale = migrateListingDraft(legacy("Venta"));
  assert.equal(sale.operation, "Venta");
  if (sale.operation === "Venta") assert.equal(sale.sale.annualTax, 5000);
  assert.equal(migrateListingDraft(sale), sale);
});
test("terms reject invalid choices, negative amounts and fractional month counts", () => {
  const errors = validateDraftInput({
    ...valid,
    rental: {
      ...valid.rental,
      deposit: -1,
      minimumMonths: 1.5,
      pets: "bad" as "yes",
    },
    maintenance: { status: "yes", amount: 0.123, included: "no" },
  });
  for (const key of ["deposit", "minimumMonths", "pets", "maintenanceAmount"])
    assert.ok(errors[key]);
});
test("normalization clears inapplicable fees and alternative independent requirements", () => {
  const result = normalizeDraftInput({
    ...valid,
    rental: {
      ...valid.rental,
      guarantee: "either",
      guarantor: "required",
      legalPolicy: "required",
    },
    maintenance: { status: "no", amount: 900, included: "yes" },
  });
  assert.deepEqual(result.maintenance, {
    status: "no",
    amount: null,
    included: "unknown",
  });
  if (result.operation === "Renta")
    assert.equal(result.rental.guarantor, "unknown");
});
