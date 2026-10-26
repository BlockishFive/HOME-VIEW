import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultMaintenance,
  defaultRentalTerms,
  formatMXN,
  maintenanceLabel,
  rentalFacts,
  rentalMonthlyTotal,
  rentalSummary,
} from "../lib/property-terms";
const rental = { ...defaultRentalTerms(), monthlyRent: 18000 };
test("separate maintenance is added only to the monthly rent", () => {
  const maintenance = { status: "yes", amount: 900, included: "no" } as const;
  assert.equal(
    rentalMonthlyTotal({ ...rental, deposit: 18000 }, maintenance),
    18900,
  );
  assert.equal(
    rentalSummary(rental, maintenance),
    "$18,000 de renta + $900 de mantenimiento.",
  );
});
test("an included fee is never counted twice", () => {
  const maintenance = { status: "yes", amount: 900, included: "yes" } as const;
  assert.equal(rentalMonthlyTotal(rental, maintenance), 18000);
  assert.equal(
    rentalSummary(rental, maintenance),
    "$18,000 MXN/mes · Mantenimiento incluido.",
  );
});
test("unknown fees, inclusion and rent never become a zero or a total", () => {
  assert.equal(rentalMonthlyTotal(rental, defaultMaintenance()), null);
  assert.equal(
    rentalMonthlyTotal(rental, {
      status: "yes",
      amount: null,
      included: "yes",
    }),
    null,
  );
  assert.equal(
    rentalMonthlyTotal(rental, {
      status: "yes",
      amount: 900,
      included: "unknown",
    }),
    null,
  );
  assert.equal(
    rentalMonthlyTotal(defaultRentalTerms(), {
      status: "yes",
      amount: 900,
      included: "no",
    }),
    null,
  );
  assert.equal(maintenanceLabel(defaultMaintenance()), "Por confirmar");
  assert.equal(
    maintenanceLabel({ status: "no", amount: null, included: "unknown" }),
    "No aplica",
  );
});
test("aval or policy alternatives are distinct from independent requirements", () => {
  const either = rentalFacts({
    ...rental,
    guarantee: "either",
    guarantor: "required",
    legalPolicy: "required",
  });
  assert.deepEqual(
    either.find(([label]) => label === "Garantía"),
    ["Garantía", "Aval o póliza jurídica (alternativas)"],
  );
  assert.equal(
    either.some(([label]) => label === "Aval" || label === "Póliza jurídica"),
    false,
  );
  const both = rentalFacts({
    ...rental,
    guarantee: "independent",
    guarantor: "required",
    legalPolicy: "required",
  });
  assert.deepEqual(
    both.find(([label]) => label === "Aval"),
    ["Aval", "Requerido"],
  );
  assert.deepEqual(
    both.find(([label]) => label === "Póliza jurídica"),
    ["Póliza jurídica", "Requerido"],
  );
});

test("centavos remain visible and totals use integer cents", () => {
  const maintenance = {
    status: "yes",
    amount: 900.25,
    included: "no",
  } as const;
  const fractionalRent = { ...rental, monthlyRent: 18000.5 };
  assert.equal(rentalMonthlyTotal(fractionalRent, maintenance), 18900.75);
  assert.equal(formatMXN(18900.75), "$18,900.75");
  assert.equal(
    rentalMonthlyTotal(
      { ...rental, monthlyRent: 0.1 },
      { ...maintenance, amount: 0.2 },
    ),
    0.3,
  );
});
