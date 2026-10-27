import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultRentalTerms,
  maintenanceLabel,
  rentalFacts,
  rentalMonthlyTotal,
  rentalSummary,
  formatMXN,
} from "../lib/property-terms";
import { localizeProperty } from "../lib/localized-properties";
import { properties } from "../lib/properties";

test("English lease terms preserve MXN, exact maintenance math and unknown values", () => {
  const rental = { ...defaultRentalTerms(), monthlyRent: 18000 };
  const fee = { status: "yes" as const, amount: 900, included: "no" as const };
  assert.equal(
    rentalSummary(rental, fee, "en"),
    "$18,000 rent + $900 maintenance.",
  );
  assert.equal(rentalMonthlyTotal(rental, fee), 18900);
  assert.equal(
    rentalSummary(rental, { ...fee, included: "yes" }, "en"),
    "$18,000 MXN/month · Maintenance included.",
  );
  assert.equal(
    maintenanceLabel({ ...fee, amount: null }, true, "en"),
    "Amount to be confirmed · Additional to the rent",
  );
  assert.equal(formatMXN(18900.75, "en"), "$18,900.75");
  const facts = rentalFacts({ ...rental, guarantee: "either" }, "en");
  assert.ok(
    facts.some(
      ([label, value]) =>
        label === "Lease guarantee" &&
        value === "Guarantor or legal protection policy (alternatives)",
    ),
  );
  assert.ok(
    facts.some(
      ([label, value]) => label === "Water" && value === "To be confirmed",
    ),
  );
  assert.equal(
    rentalSummary(rental, fee),
    "$18,000 de renta + $900 de mantenimiento.",
  );
});

test("demo localization changes only presentation and retains operation contracts", () => {
  const source = properties.find(
    (property) => property.slug === "casa-jardin-renta",
  )!;
  const english = localizeProperty(source, "en");
  assert.equal(english.title, "Casa Jardín for rent");
  assert.equal(english.operation, "Renta");
  assert.equal(english.propertyType, "Casa");
  assert.equal(english.priceValue, source.priceValue);
  assert.equal(english.rental, source.rental);
  assert.equal("sale" in english, false);
  assert.equal(source.title, "Casa Jardín en renta");
  assert.equal(localizeProperty(source, "es"), source);
  assert.equal(english.gallery[0].label, "Living room");
});
