import test from "node:test";
import assert from "node:assert/strict";
import { translate, validLocale } from "../lib/i18n";

test("language selection accepts supported locales and safely defaults to Spanish", () => {
  assert.equal(validLocale("es"), "es");
  assert.equal(validLocale("en"), "en");
  for (const value of [undefined, null, "fr", "EN", "", {}, 1]) {
    assert.equal(validLocale(value), "es");
  }
});

test("translation uses explicit English messages and keeps source fallback readable", () => {
  assert.equal(translate("es", "Renta"), "Renta");
  assert.equal(translate("en", "Renta"), "Rent");
  assert.equal(translate("en", "  Renta\n "), "Rent");
  assert.equal(translate("en", "An unknown interface message"), "An unknown interface message");
});

test("interpolation preserves zero and incomplete placeholders without losing text", () => {
  assert.equal(translate("en", "{count} / {total}", { count: 0, total: 8 }), "0 / 8");
  assert.equal(translate("es", "{count} / {total}", { count: 2, total: 8 }), "2 / 8");
  assert.equal(translate("en", "{count} / {total}", { count: 2 }), "2 / {total}");
});

test("capture validation feedback is available in English for fields and media", async () => {
  const { validateDraftInput, validatePhotoFiles } = await import("../lib/listing-drafts");
  const { defaultRentalTerms, defaultMaintenance } = await import("../lib/property-terms");
  const { validatePanoramaDimensions, validatePanoramaFile } = await import("../lib/draft-tour");
  const errors = validateDraftInput({
    operation: "Renta", propertyType: "Casa", title: "", description: "", state: "", city: "", neighborhood: "",
    area: 0, beds: -1, baths: -1, latitude: 0, longitude: 0, imageRights: false,
    rental: { ...defaultRentalTerms(), deposit: -1, minimumMonths: 1.5 },
    maintenance: defaultMaintenance(), community: "unknown",
  });
  const messages = [...Object.values(errors),
    validatePhotoFiles([]),
    validatePhotoFiles([{ type: "image/svg+xml", size: 100 }]),
    validatePhotoFiles([{ type: "image/jpeg", size: 6 * 1024 * 1024 }]),
    validatePanoramaDimensions(1200, 850),
    validatePanoramaFile({ type: "image/jpeg", size: 13 * 1024 * 1024 }),
  ].filter((value): value is string => typeof value === "string");
  for (const source of messages) {
    assert.notEqual(translate("en", source), source, `Missing English validation: ${source}`);
  }
});
