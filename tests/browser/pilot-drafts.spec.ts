import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import type { ListingDraft } from "../../lib/listing-drafts";

async function fillRental(page: Page, title = "Casa ficticia piloto local") {
  await page.getByLabel("Título del anuncio").fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page.getByLabel("Superficie construida (m²)", { exact: true }).fill("120");
  await page.getByLabel("Descripción", { exact: true }).fill("Casa ficticia autorizada para probar condiciones y costos del piloto.");
  await page.getByLabel("Colonia / zona", { exact: true }).fill("Zona ficticia");
  await page.getByLabel("Seleccionar fotografías", { exact: true }).setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.", exact: true }).check();
}

async function readStored(page: Page) {
  return page.evaluate(() => new Promise<ListingDraft[]>((resolve, reject) => {
    const request = indexedDB.open("home-view-listing-drafts", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("listings", "readonly");
      const rows = transaction.objectStore("listings").getAll();
      transaction.oncomplete = () => { db.close(); resolve(rows.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }));
}

test("switching operation keeps separate prices and only displays applicable terms", async ({ page }) => {
  await page.goto("/alta");
  await fillRental(page);
  await page.getByLabel("Depósito (MXN)", { exact: true }).fill("18000");
  await page.getByLabel("Relación entre aval y póliza jurídica", { exact: true }).selectOption("either");
  await page.getByLabel("Agua en la renta", { exact: true }).selectOption("included");
  const preview = page.locator(".draft-terms-preview");
  await expect(preview).toContainText("Aval o póliza jurídica (alternativas)");
  await expect(page.getByLabel("Predial anual (MXN, opcional)", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Operación", exact: true }).selectOption("Venta");
  await page.getByLabel("Precio de venta (MXN)", { exact: true }).fill("3000000");
  await page.getByLabel("Predial anual (MXN, opcional)", { exact: true }).fill("4200");
  await expect(page.getByLabel("Depósito (MXN)", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Renta mensual (MXN)", { exact: true })).toHaveCount(0);
  await expect(preview).toContainText("Precio de compra");
  await expect(preview).not.toContainText("Depósito");
  await expect(preview).not.toContainText("Póliza jurídica");
  await page.getByRole("combobox", { name: "Operación", exact: true }).selectOption("Renta");
  await expect(page.getByLabel("Renta mensual (MXN)", { exact: true })).toHaveValue("18000");
  await expect(page.getByLabel("Depósito (MXN)", { exact: true })).toHaveValue("18000");
  await expect(page.getByLabel("Agua en la renta", { exact: true })).toHaveValue("included");
  await expect(preview).not.toContainText("Predial");
  await page.getByRole("combobox", { name: "Operación", exact: true }).selectOption("Venta");
  await expect(page.getByLabel("Precio de venta (MXN)", { exact: true })).toHaveValue("3000000");
  await page.getByRole("button", { name: "Guardar borrador en este navegador", exact: true }).click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  const [saved] = await readStored(page);
  expect(saved.operation).toBe("Venta");
  expect(saved.sale).toEqual({ purchasePrice: 3000000, annualTax: 4200 });
  expect(saved).not.toHaveProperty("rental");
  expect(saved).not.toHaveProperty("rentPrice");
  expect(saved).not.toHaveProperty("salePrice");
});

test("additional maintenance is summed once and editing to included preserves a single draft", async ({ page }) => {
  await page.goto("/alta");
  await fillRental(page);
  await page.getByLabel("Depósito (MXN)", { exact: true }).fill("18000");
  await page.getByLabel("¿Existe cuota de mantenimiento?", { exact: true }).selectOption("yes");
  await page.getByLabel("Mantenimiento mensual (MXN)", { exact: true }).fill("900");
  await page.getByLabel("¿La renta anunciada incluye mantenimiento?", { exact: true }).selectOption("no");
  const preview = page.locator(".draft-terms-preview");
  await expect(preview).toContainText("$18,000 de renta + $900 de mantenimiento.");
  await expect(preview).toContainText("$18,900/mes");
  await page.getByRole("button", { name: "Guardar borrador en este navegador", exact: true }).click();
  const card = page.locator(".draft-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("$18,900/mes");
  const [before] = await readStored(page);
  await card.getByRole("button", { name: "Editar borrador", exact: true }).click();
  await expect(page.getByLabel("Mantenimiento mensual (MXN)", { exact: true })).toHaveValue("900");
  await page.getByLabel("¿La renta anunciada incluye mantenimiento?", { exact: true }).selectOption("yes");
  await expect(preview).toContainText("$18,000 MXN/mes · Mantenimiento incluido.");
  await expect(preview).not.toContainText("$18,900/mes");
  await page.getByRole("button", { name: "Guardar cambios del borrador", exact: true }).click();
  await expect(page.locator(".listing-success")).toContainText("Borrador guardado");
  await page.reload();
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("$18,000/mes");
  await expect(card).not.toContainText("$18,900/mes");
  const [after] = await readStored(page);
  expect(after.id).toBe(before.id);
  expect(after.maintenance).toEqual({ status: "yes", amount: 900, included: "yes" });
  expect(after.operation === "Renta" && after.rental.deposit).toBe(18000);
});

test("blank optional costs stay unknown and never create a monthly total", async ({ page }) => {
  await page.goto("/alta");
  await fillRental(page);
  await page.getByLabel("¿Existe cuota de mantenimiento?", { exact: true }).selectOption("yes");
  await page.getByLabel("¿La renta anunciada incluye mantenimiento?", { exact: true }).selectOption("no");
  const preview = page.locator(".draft-terms-preview");
  await expect(preview).toContainText("Monto por confirmar");
  await expect(preview.getByText("Renta y mantenimiento", { exact: true })).toHaveCount(0);
  await expect(preview).not.toContainText("$0");
  await page.getByRole("button", { name: "Guardar borrador en este navegador", exact: true }).click();
  await page.reload();
  const card = page.locator(".draft-card");
  await expect(card).toHaveCount(1);
  await expect(card.getByText("Renta y mantenimiento", { exact: true })).toHaveCount(0);
  await expect(card).not.toContainText("$0");
  const [saved] = await readStored(page);
  expect(saved.maintenance.amount).toBeNull();
  expect(saved.operation === "Renta" && saved.rental.deposit).toBeNull();
  expect(saved.operation === "Renta" && saved.rental.minimumMonths).toBeNull();
  expect(saved.operation === "Renta" && saved.rental.services.internet).toBe("unknown");
});

test("legacy IndexedDB drafts migrate without inventing guarantees or fee inclusion", async ({ page }) => {
  await page.goto("/alta");
  await expect(page.locator(".listing-empty")).toBeVisible();
  await page.evaluate(async () => {
    const blob = await (await fetch("/panoramas/sala-cover.jpg")).blob();
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("home-view-listing-drafts", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction("listings", "readwrite");
        transaction.objectStore("listings").put({
          id: "legacy-rental", createdAt: "2026-01-01T00:00:00.000Z", title: "Casa ficticia anterior",
          operation: "Renta", propertyType: "Casa", price: 24500, annualTax: 6400, monthlyMaintenance: 900,
          description: "Borrador ficticio antiguo para probar una migración sin condiciones inventadas.",
          state: "Guanajuato", city: "León", neighborhood: "Zona ficticia", area: 140, beds: 3, baths: 2,
          latitude: 21.122, longitude: -101.686, imageRights: true,
          photos: [{ id: "legacy-photo", name: "foto.jpg", blob }],
        });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  });
  await page.reload();
  const card = page.locator(".draft-card");
  await expect(card).toContainText("$24,500");
  await expect(card).toContainText("Borrador antiguo");
  await expect(card).toContainText("Inclusión en renta por confirmar");
  await expect(card).not.toContainText("Predial anual estimado");
  await expect(card.getByText("Renta y mantenimiento", { exact: true })).toHaveCount(0);
  // Reading migration does not destructively rewrite the original IndexedDB row.
  const [legacy] = await readStored(page);
  expect(legacy).toHaveProperty("price", 24500);
  expect(legacy).not.toHaveProperty("schemaVersion");
  await card.getByRole("button", { name: "Editar borrador", exact: true }).click();
  await expect(page.getByLabel("Renta mensual (MXN)", { exact: true })).toHaveValue("24500");
  await expect(page.getByLabel("Depósito (MXN)", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Plazo mínimo (meses)", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Relación entre aval y póliza jurídica", { exact: true })).toHaveValue("unknown");
  await expect(page.getByLabel("Aval", { exact: true })).toHaveValue("unknown");
  await expect(page.getByLabel("Póliza jurídica", { exact: true })).toHaveValue("unknown");
  await expect(page.getByLabel("Internet en la renta", { exact: true })).toHaveValue("unknown");
  await expect(page.getByLabel("¿La renta anunciada incluye mantenimiento?", { exact: true })).toHaveValue("unknown");
  await page.getByRole("button", { name: "Guardar cambios del borrador", exact: true }).click();
  await expect(page.locator(".listing-success")).toContainText("Borrador guardado");
  await page.reload();
  await expect(card).toHaveCount(1);
  const [saved] = await readStored(page);
  expect(saved.schemaVersion).toBe(2);
  expect(saved.operation === "Renta" && saved.rental.monthlyRent).toBe(24500);
  expect(saved.operation === "Renta" && saved.rental.guarantor).toBe("unknown");
  expect(saved.maintenance).toEqual({ status: "yes", amount: 900, included: "unknown" });
  expect(saved).not.toHaveProperty("price");
  expect(saved).not.toHaveProperty("annualTax");
});
