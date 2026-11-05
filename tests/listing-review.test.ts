import test from "node:test";
import assert from "node:assert/strict";
import { listingReview, draftFromCapture } from "../lib/listing-review";
import { listingPresentation } from "../lib/listing-presentation";
import { publicProperty } from "../lib/server/publications";
import { defaultMaintenance, defaultRentalTerms } from "../lib/property-terms";
import {
  captureFingerprint,
  initialCaptureValues,
  type CaptureContent,
} from "../lib/capture-store";
import {
  normalizeDraftInput,
  validateDraftInput,
  type ListingDraft,
} from "../lib/listing-drafts";
import {
  emptyVisitAccess,
  externalMapLinks,
  readVisitAccess,
  visitAccessError,
  visitAccessPoint,
} from "../lib/visit-access";
function draft(): ListingDraft {
  return {
    schemaVersion: 2,
    id: "fictional",
    createdAt: "2026-01-01",
    operation: "Renta",
    title: "Casa ficticia",
    description: "Descripción ficticia para la revisión de un anuncio.",
    propertyType: "Casa",
    rental: { ...defaultRentalTerms(), monthlyRent: 18000 },
    maintenance: defaultMaintenance(),
    community: "unknown",
    state: "Guanajuato",
    city: "León",
    neighborhood: "Zona ficticia",
    area: 120,
    beds: null,
    baths: null,
    latitude: 21.168432,
    longitude: -101.712345,
    imageRights: true,
    locationReviewed: true,
    publicLocation: "approximate",
    photos: [
      {
        id: "photo",
        name: "Foto autorizada",
        blob: new Blob(["demo"], { type: "image/jpeg" }),
      },
    ],
    scenes: [],
  };
}
test("rental review keeps optional unknowns separate from blockers, excludes tax and honors either guarantees", () => {
  const value = draft();
  assert.equal(listingReview(value).canPublish, true);
  const keys = listingReview(value).pending.map((item) => item.key);
  assert.ok(keys.includes("deposit"));
  assert.ok(keys.includes("water"));
  assert.equal(keys.includes("annualTax"), false);
  if (value.operation === "Renta") value.rental.guarantee = "either";
  const either = listingReview(value).pending.map((item) => item.key);
  assert.equal(either.includes("guarantor"), false);
  assert.equal(either.includes("legalPolicy"), false);
  assert.equal(either.includes("guarantee"), false);
  if (value.operation === "Renta") value.rental.guarantee = "independent";
  assert.ok(
    listingReview(value).pending.some((item) => item.key === "guarantor"),
  );
});
test("sale review omits rental requirements and flags tax and maintenance without assuming a zero", () => {
  const { rental, ...common } = draft();
  const value: ListingDraft = {
    ...common,
    operation: "Venta",
    sale: { purchasePrice: 2400000, annualTax: null },
  };
  const review = listingReview(value);
  assert.equal(review.canPublish, true);
  assert.ok(review.pending.some((item) => item.key === "annualTax"));
  assert.equal(
    review.pending.some((item) =>
      ["deposit", "minimumMonths", "guarantor", "pets", "water"].includes(
        item.key,
      ),
    ),
    false,
  );
  assert.equal(value.sale.annualTax, null);
});
test("review blocks missing required data and unreviewed publication but allows a safe preview before location authorization", () => {
  const value = draft();
  value.locationReviewed = false;
  assert.equal(listingReview(value).canPublish, false);
  assert.equal(listingReview(value).canPreview, true);
  value.photos = [];
  assert.equal(listingReview(value).canPreview, false);
  assert.ok(
    listingReview(value).blockers.some((item) => item.key === "photos"),
  );
});
test("capture review preserves missing prices as unknown and leaves the original raw operation values untouched", () => {
  const capture: CaptureContent = {
    values: {
      ...initialCaptureValues,
      title: "Captura",
      rentPrice: "",
      salePrice: "2200000",
      area: "",
    },
    rental: defaultRentalTerms(),
    sale: { purchasePrice: null, annualTax: null },
    maintenance: defaultMaintenance(),
    community: "unknown",
    publicLocation: "approximate",
    locationReviewed: false,
    photos: [],
    scenes: [],
  };
  const projected = draftFromCapture(capture);
  assert.equal(projected.operation, "Renta");
  if (projected.operation === "Renta")
    assert.equal(projected.rental.monthlyRent, null);
  assert.ok(Number.isNaN(projected.area));
  assert.ok(
    listingReview(projected).blockers.some((item) => item.key === "price"),
  );
  assert.equal(capture.values.rentPrice, "");
  assert.equal(capture.values.salePrice, "2200000");
});
test("preview and publication share their public allowlist and never expose private access or exact coordinates by default", () => {
  const value = {
    ...draft(),
    visitAccess: {
      latitude: "21.177777",
      longitude: "-101.733333",
      notes: "Private arrival reference",
    },
    unexpected: "private field",
  };
  const preview = listingPresentation(
    value,
    (id) => `/api/public/media/${value.id}/${id}`,
  );
  assert.deepEqual(preview, publicProperty(value));
  const serialized = JSON.stringify(preview);
  for (const forbidden of [
    "visitAccess",
    "Private arrival reference",
    "21.177777",
    "-101.733333",
    "21.168432",
    "-101.712345",
    "unexpected",
  ])
    assert.equal(serialized.includes(forbidden), false, forbidden);
  value.publicLocation = "exact";
  assert.deepEqual(listingPresentation(value, (id) => id).coordinates, {
    lat: value.latitude,
    lng: value.longitude,
  });
});
test("visit reference validation supports earlier drafts, private notes and empty or paired coordinates", () => {
  assert.deepEqual(readVisitAccess(undefined), emptyVisitAccess());
  assert.equal(visitAccessError(undefined), null);
  assert.equal(
    visitAccessError({ ...emptyVisitAccess(), notes: "Entrada principal" }),
    null,
  );
  assert.ok(visitAccessError({ ...emptyVisitAccess(), latitude: "21.12" }));
  assert.ok(visitAccessError({ latitude: "99", longitude: "-101", notes: "" }));
  assert.throws(() =>
    readVisitAccess({ latitude: 21, longitude: "-101", notes: "" }),
  );
  assert.throws(() =>
    readVisitAccess({ ...emptyVisitAccess(), notes: "x".repeat(601) }),
  );
  assert.deepEqual(
    visitAccessPoint({ latitude: "21.15", longitude: "-101.7", notes: "" }),
    { lat: 21.15, lng: -101.7 },
  );
  const value = {
    ...draft(),
    visitAccess: { latitude: "21.15", longitude: "", notes: "" },
  };
  assert.ok(validateDraftInput(value).visitAccess);
  value.visitAccess.longitude = "-101.7";
  assert.deepEqual(normalizeDraftInput(value).visitAccess, value.visitAccess);
});
test("empty visit references do not dirty older automatic captures", () => {
  const capture: CaptureContent = {
    values: initialCaptureValues,
    rental: defaultRentalTerms(),
    sale: { purchasePrice: null, annualTax: null },
    maintenance: defaultMaintenance(),
    community: "unknown",
    publicLocation: "approximate",
    locationReviewed: false,
    photos: [],
    scenes: [],
  };
  assert.equal(
    captureFingerprint(capture),
    captureFingerprint({ ...capture, visitAccess: emptyVisitAccess() }),
  );
  assert.notEqual(
    captureFingerprint(capture),
    captureFingerprint({
      ...capture,
      visitAccess: { ...emptyVisitAccess(), notes: "Entrada norte" },
    }),
  );
  const access = {
    latitude: "21.15",
    longitude: "-101.7",
    notes: "Entrada norte",
  };
  assert.equal(
    captureFingerprint({ visitAccess: access, ...capture }),
    captureFingerprint({ ...capture, visitAccess: access }),
  );
});
test("external map links use fixed HTTPS hosts, numeric coordinates and no private notes", () => {
  const links = externalMapLinks({ lat: 21.168432, lng: -101.712345 });
  assert.equal(new URL(links.osm).hostname, "www.openstreetmap.org");
  assert.equal(
    new URL(links.google).searchParams.get("query"),
    "21.168432,-101.712345",
  );
  assert.equal(
    new URL(links.directions).searchParams.get("destination"),
    "21.168432,-101.712345",
  );
  assert.throws(() => externalMapLinks({ lat: NaN, lng: -101 }));
});
