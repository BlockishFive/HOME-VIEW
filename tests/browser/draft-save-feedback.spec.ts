import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
async function fill(page: Page) {
  await page.goto("/alta");
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Casa ficticia de prueba guardada");
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page
    .getByLabel("Superficie construida (m²)", { exact: true })
    .fill("120");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Descripción de una casa ficticia para probar el guardado local.");
  await page
    .getByLabel("Colonia / zona", { exact: true })
    .fill("Zona ficticia");
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page
    .getByRole("checkbox", {
      name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.",
      exact: true,
    })
    .check();
}
test("save keeps the capture visible, links the committed draft, and only clears on explicit new draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await fill(page);
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toBeInViewport();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Casa ficticia de prueba guardada");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Guardar cambios del borrador", exact: true })
    .click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page
    .getByRole("link", { name: "Ver el borrador guardado", exact: true })
    .click();
  await expect(page.locator(".draft-card")).toBeFocused();
  await page
    .getByRole("button", { name: "Crear otro borrador", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
});
test("a failed transaction keeps text and photos and can be retried", async ({
  page,
}) => {
  await fill(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      IDBObjectStore.prototype.put = original;
      const request = original.apply(this, args);
      this.transaction.abort();
      return request;
    };
  });
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-save-feedback [role=alert]")).toContainText(
    "La captura permanece en el formulario",
  );
  await expect(page.locator(".listing-success")).toHaveCount(0);
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Casa ficticia de prueba guardada");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
});
test("a failed read-back retains capture and retry updates the same committed identity", async ({
  page,
}) => {
  await fill(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      IDBObjectStore.prototype.get = original;
      const request = original.call(this, key);
      this.transaction.abort();
      return request;
    };
  });
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-save-feedback [role=alert]")).toBeVisible();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Casa ficticia de prueba guardada");
  await expect(page.locator(".listing-success")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
});
test("unexpected browser-added attributes do not prevent committing a draft", async ({
  page,
}) => {
  await page.route("**/alta", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        /<(input|select)\b/g,
        '<$1 __gcruniqueid="browser-added"',
      ),
    });
  });
  await fill(page);
  await expect(
    page.getByRole("combobox", { name: "Idioma / Language", exact: true }),
  ).toHaveAttribute("__gcruniqueid", "browser-added");
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toBeVisible();
  await page.unrouteAll();
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
});
