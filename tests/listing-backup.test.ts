import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseBackup,
  readBackup,
  MAX_BACKUP_FILE_BYTES,
  BackupError,
} from "../lib/listing-backup";
import { initialCaptureValues } from "../lib/capture-store";
import { defaultMaintenance, defaultRentalTerms } from "../lib/property-terms";

const jpeg = `data:image/jpeg;base64,${readFileSync("public/panoramas/sala.jpg").toString("base64")}`;
function capture() {
  return {
    format: "home-view-capture",
    version: 1,
    content: {
      values: {
        ...initialCaptureValues,
        title: "",
        rentPrice: "018000.50",
        salePrice: "",
        beds: "",
        description: "<script>texto literal</script>",
      },
      rental: defaultRentalTerms(),
      sale: { purchasePrice: null, annualTax: null },
      maintenance: defaultMaintenance(),
      community: "unknown",
      publicLocation: "approximate",
      locationReviewed: false,
      photos: [{ id: "original-photo", name: "Autorizada.jpg", dataUrl: jpeg }],
      scenes: [
        {
          id: "room-a",
          name: "",
          dataUrl: jpeg,
          initialView: { yaw: 0.4, pitch: 0.1, fov: 1 },
          hotspots: [{ target: "room-b", yaw: 1, pitch: 0.2 }],
        },
        { id: "room-b", name: "Patio", dataUrl: jpeg, hotspots: [] },
      ],
    },
  };
}
test("capture backup preserves partial raw values and unknown conditions; remaps every scene link and strips foreign metadata", () => {
  const value = {
    ...capture(),
    sharedRevision: 99,
    password: "never adopt",
    __proto__: { polluted: true },
  };
  const result = parseBackup(JSON.stringify(value));
  assert.equal(result.kind, "capture");
  assert.equal(result.content.values.title, "");
  assert.equal(result.content.values.rentPrice, "018000.50");
  assert.equal(result.content.values.salePrice, "");
  assert.equal(
    result.content.values.description,
    "<script>texto literal</script>",
  );
  assert.deepEqual(result.content.maintenance, defaultMaintenance());
  assert.equal(result.content.rental.deposit, null);
  assert.notEqual(result.content.scenes[0].id, "room-a");
  assert.equal(
    result.content.scenes[0].hotspots[0].target,
    result.content.scenes[1].id,
  );
  assert.deepEqual(result.content.scenes[0].initialView, {
    yaw: 0.4,
    pitch: 0.1,
    fov: 1,
  });
  assert.equal(result.content.scenes[0].name, "");
  assert.equal("password" in result.content, false);
  assert.equal("sharedRevision" in result.content, false);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});
function previousDraft(operation = "Renta") {
  return {
    format: "home-view-local-draft",
    version: 2,
    schemaVersion: 2,
    id: "old-server-id",
    sharedRevision: 4,
    publishedRevision: 4,
    title: "Casa de prueba",
    operation,
    propertyType: "Casa",
    description: "Descripción ficticia autorizada para pruebas.",
    state: "Guanajuato",
    city: "León",
    neighborhood: "Zona ficticia",
    area: 100,
    beds: null,
    baths: 2,
    latitude: 21.12,
    longitude: -101.68,
    imageRights: true,
    maintenance: defaultMaintenance(),
    community: "unknown",
    rental: { ...defaultRentalTerms(), monthlyRent: 18000 },
    sale: { purchasePrice: 2200000, annualTax: null },
    photos: [{ name: "Foto.jpg", dataUrl: jpeg }],
    scenes: [],
  };
}
test("existing version 2 draft exports restore only their operation and unknowns without adopting publication or server revision", () => {
  const rent = parseBackup(JSON.stringify(previousDraft()));
  assert.equal(rent.content.values.rentPrice, "18000");
  assert.equal(rent.content.values.salePrice, "");
  assert.equal(rent.content.rental.guarantor, "unknown");
  assert.equal(rent.content.sale.annualTax, null);
  const sale = parseBackup(JSON.stringify(previousDraft("Venta")));
  assert.equal(sale.content.values.salePrice, "2200000");
  assert.equal(sale.content.values.rentPrice, "");
  assert.equal(sale.content.rental.monthlyRent, null);
  assert.equal(sale.content.sale.annualTax, null);
});
test("version 1 legacy exports migrate without inferring rent inclusion, guarantors or tax on rent", () => {
  const raw = {
    ...previousDraft(),
    version: 1,
    schemaVersion: undefined,
    rental: undefined,
    sale: undefined,
    maintenance: undefined,
    community: undefined,
    price: 18000,
    annualTax: 5000,
    monthlyMaintenance: 900,
    scenes: undefined,
  };
  const result = parseBackup(JSON.stringify(raw));
  assert.equal(result.legacy, true);
  assert.deepEqual(result.content.maintenance, {
    status: "yes",
    amount: 900,
    included: "unknown",
  });
  assert.equal(result.content.rental.guarantor, "unknown");
  assert.equal(result.content.sale.annualTax, null);
  raw.monthlyMaintenance = 0;
  assert.deepEqual(
    parseBackup(JSON.stringify(raw)).content.maintenance,
    defaultMaintenance(),
  );
});
test("backup parser rejects unsupported versions, malformed scalars, duplicate scenes, unsafe graph and invalid views", () => {
  assert.throws(() => parseBackup("invalid JSON"), BackupError);
  const bad: Array<ReturnType<typeof capture>> = [];
  let value = capture();
  value.version = 999;
  bad.push(value);
  value = capture();
  value.content.rental.services.gas = "invented" as never;
  bad.push(value);
  value = capture();
  value.content.scenes[1].id = "room-a";
  bad.push(value);
  value = capture();
  value.content.scenes[0].hotspots[0].target = "unavailable";
  bad.push(value);
  value = capture();
  value.content.scenes[0].hotspots[0].yaw = 4;
  bad.push(value);
  value = capture();
  value.content.scenes[0].initialView!.fov = 9;
  bad.push(value);
  for (const entry of bad)
    assert.throws(() => parseBackup(JSON.stringify(entry)), BackupError);
});
test("backup parser accepts only bounded embedded JPEG/PNG/WebP; URLs, SVG and base64 that disagrees with MIME are rejected", () => {
  for (const dataUrl of [
    "https://example.invalid/photo.jpg",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/jpeg;base64,!!!!",
    "data:image/png;base64,/9j/AAA=",
  ]) {
    const value = capture();
    value.content.photos[0].dataUrl = dataUrl;
    assert.throws(() => parseBackup(JSON.stringify(value)), BackupError);
  }
  const tooMany = capture();
  tooMany.content.photos = Array(9).fill(tooMany.content.photos[0]);
  assert.throws(() => parseBackup(JSON.stringify(tooMany)), BackupError);
  const huge = capture();
  huge.content.photos[0].dataUrl = `data:image/jpeg;base64,${"A".repeat(4 * Math.ceil((5 * 1024 * 1024 + 1) / 3))}`;
  assert.throws(() => parseBackup(JSON.stringify(huge)), BackupError);
});
test("oversized backup files are rejected before reading or parsing their contents", async () => {
  let read = false;
  await assert.rejects(
    () =>
      readBackup({
        size: MAX_BACKUP_FILE_BYTES + 1,
        text: async () => {
          read = true;
          return "";
        },
      } as File),
    BackupError,
  );
  assert.equal(read, false);
});
