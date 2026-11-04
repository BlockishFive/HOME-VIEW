import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function login(page: Page) {
  await page.goto("/privado");
  await page.getByLabel("Usuario privado", { exact: true }).fill("pilot");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Fictitious-browser-pilot-2026");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mis borradores privados", exact: true }),
  ).toBeVisible();
}
async function newProperty(page: Page) {
  await page
    .getByRole("button", { name: "Nueva propiedad", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toBeVisible();
}
async function fill(page: Page, title: string) {
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page
    .getByLabel("Superficie construida (m²)", { exact: true })
    .fill("120");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill(
      "Captura ficticia para comprobar recuperación y confirmación explícita.",
    );
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
async function deviceSaved(page: Page) {
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
}
test("private dashboard comes first, searches and filters states; panoramas load only when needed", async ({
  page,
}) => {
  test.setTimeout(90000);
  const title = `Panel ficticio ${randomUUID().slice(0, 6)}`;
  await login(page);
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveCount(0);
  await newProperty(page);
  await fill(page, title);
  await page
    .getByRole("checkbox", {
      name: "Revisé la ubicación y autorizo la precisión pública seleccionada.",
      exact: true,
    })
    .check();
  const tour = page.locator(".draft-tour-editor");
  await tour.getByRole("checkbox").check();
  await tour
    .getByLabel("Añadir panoramas 360")
    .setInputFiles("public/panoramas/sala.jpg");
  await expect(tour.locator(".draft-scene-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "confirmed",
  );
  const dto = (
    await (await page.request.get("/api/private/drafts")).json()
  ).drafts.find((d: { title: string }) => d.title === title);
  const media: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes(`/api/private/media/${dto.id}/`)) media.push(r.url());
  });
  await page.reload();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveCount(0);
  const card = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card).toBeVisible();
  await page.setViewportSize({ width: 820, height: 1180 });
  await page
    .locator(".listing-saved")
    .screenshot({ path: test.info().outputPath("private-dashboard-ipad.png") });
  expect(media.some((url) => url.endsWith(dto.scenes[0].id))).toBe(false);
  await page.getByLabel("Buscar mis propiedades").fill(title.toUpperCase());
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.getByLabel("Estado de publicación").selectOption("published");
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await page.getByLabel("Estado de publicación").selectOption("draft");
  await expect(card).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  await page.getByLabel("Estado de publicación").selectOption("published");
  await expect(card.locator(".draft-status")).toHaveText("Publicado");
  await card.getByText("Ver detalles y medios", { exact: true }).click();
  await expect(card.locator(".draft-photo-grid img")).toBeVisible();
  expect(media.some((url) => url.endsWith(dto.scenes[0].id))).toBe(true);
  await card
    .getByRole("button", { name: "Editar borrador", exact: true })
    .click();
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill(title + " editado");
  await page
    .getByRole("button", { name: "Guardar cambios del borrador", exact: true })
    .click();
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "confirmed",
  );
  await page.getByLabel("Estado de publicación").selectOption("changes");
  await expect(page.locator(".draft-card")).toContainText(
    "Cambios pendientes de publicar",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Retirar publicación", exact: true })
    .click();
  await page.getByLabel("Estado de publicación").selectOption("all");
  await expect(
    page
      .locator(".draft-card")
      .filter({ hasText: title })
      .locator(".draft-status"),
  ).toHaveText("Borrador privado · No publicado");
});
test("incomplete capture, independent operation prices, photos and 360 survive reload without any server save", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 820, height: 1180 });
  await login(page);
  await newProperty(page);
  const title = `Captura parcial ${randomUUID().slice(0, 6)}`;
  let uploads = 0;
  page.on("request", (r) => {
    if (r.method() === "PUT" && r.url().endsWith("/api/private/drafts"))
      uploads++;
  });
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page.getByLabel("Operación", { exact: true }).selectOption("Venta");
  await page
    .getByLabel("Precio de venta (MXN)", { exact: true })
    .fill("4200000");
  await page.getByLabel("Operación", { exact: true }).selectOption("Renta");
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles("public/panoramas/sala-cover.jpg");
  const tour = page.locator(".draft-tour-editor");
  await tour.getByRole("checkbox").check();
  await tour
    .getByLabel("Añadir panoramas 360")
    .setInputFiles("public/panoramas/sala.jpg");
  await expect(tour.locator(".draft-scene-card")).toHaveCount(1);
  await deviceSaved(page);
  await page.reload();
  const recovery = page
    .locator(".capture-recovery-row")
    .filter({ hasText: title });
  await recovery
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await expect(
    page.getByLabel("Renta mensual (MXN)", { exact: true }),
  ).toHaveValue("18000");
  await expect(page.getByLabel("Descripción", { exact: true })).toHaveValue("");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".listing-photo-preview img")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(".draft-scene-card")).toHaveCount(1);
  await page.getByLabel("Operación", { exact: true }).selectOption("Venta");
  await expect(
    page.getByLabel("Precio de venta (MXN)", { exact: true }),
  ).toHaveValue("4200000");
  expect(uploads).toBe(0);
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await expect(page.getByLabel("Listing title", { exact: true })).toHaveValue(
    title,
  );
  await expect(page.locator(".capture-save-state")).toContainText("device");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("failed server submission remains local, reload restores identity and retry creates one private record", async ({
  page,
  context,
}) => {
  await login(page);
  await newProperty(page);
  const title = `Reintento ficticio ${randomUUID().slice(0, 6)}`;
  await fill(page, title);
  await deviceSaved(page);
  await context.setOffline(true);
  await expect(page.locator(".capture-network")).toContainText("Sin conexión");
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(page.locator(".draft-save-feedback [role=alert]")).toContainText(
    "No hay conexión",
  );
  await deviceSaved(page);
  await context.setOffline(false);
  await page.reload();
  await page
    .locator(".capture-recovery-row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "confirmed",
  );
  const rows = (
    await (await page.request.get("/api/private/drafts")).json()
  ).drafts.filter((d: { title: string }) => d.title === title);
  expect(rows).toHaveLength(1);
  await expect(
    page.locator(".capture-recovery-row").filter({ hasText: title }),
  ).toHaveCount(0);
});
test("storage failure never claims a device save; retry retains fields", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<IDBDatabase["transaction"]>
    ) {
      const tx = original.apply(this, args);
      if (
        this.name === "home-view-captures" &&
        args[1] === "readwrite" &&
        (window as any).failCapture
      )
        tx.abort();
      return tx;
    };
  });
  await page.goto("/alta");
  await page.evaluate(() => {
    (window as any).failCapture = true;
  });
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Conserva esta captura ficticia");
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "error",
  );
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Conserva esta captura ficticia");
  await page.evaluate(() => {
    (window as any).failCapture = false;
  });
  await page
    .getByRole("button", {
      name: "Reintentar guardado automático",
      exact: true,
    })
    .click();
  await deviceSaved(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Conserva esta captura ficticia");
});
test("two tabs cannot silently replace a recovered capture; an explicit recovery copy preserves both", async ({
  page,
  context,
}) => {
  await login(page);
  await newProperty(page);
  const title = `Pestaña original ${randomUUID().slice(0, 5)}`;
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await deviceSaved(page);
  const other = await context.newPage();
  await other.goto("/privado");
  await other
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill(title + " A");
  await deviceSaved(page);
  await other
    .getByLabel("Título del anuncio", { exact: true })
    .fill(title + " B");
  await expect(other.locator(".capture-error")).toContainText(
    "Otra pestaña cambió esta captura",
  );
  await other
    .getByRole("button", { name: "Guardar copia de recuperación", exact: true })
    .click();
  await deviceSaved(other);
  await other
    .getByRole("button", { name: "Volver a mis propiedades", exact: true })
    .click();
  await other
    .getByRole("button", {
      name: "Actualizar capturas del dispositivo",
      exact: true,
    })
    .click();
  await expect(other.locator(".capture-recovery-row")).toHaveCount(2);
  await expect(other.locator(".capture-recovery")).toContainText(title + " A");
  await expect(other.locator(".capture-recovery")).toContainText(title + " B");
});

test("reverting to the initial form removes an obsolete autosave instead of recovering discarded text", async ({
  page,
}) => {
  await page.goto("/alta");
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Texto ficticio que voy a borrar");
  await deviceSaved(page);
  await page.getByLabel("Título del anuncio", { exact: true }).fill("");
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "idle",
  );
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
});

test("discarding the active capture resets the autosave baseline without creating an empty recovery", async ({
  page,
}) => {
  await login(page);
  await newProperty(page);
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Captura ficticia que descartaré");
  await deviceSaved(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Descartar captura local", exact: true })
    .click();
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
  await newProperty(page);
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Volver a mis propiedades", exact: true })
    .click();
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Nueva propiedad", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
});

test("sign-out preserves a capture, and lets the owner cancel if a device write fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<IDBDatabase["transaction"]>
    ) {
      const tx = original.apply(this, args);
      if (
        this.name === "home-view-captures" &&
        args[1] === "readwrite" &&
        (window as any).failCapture
      )
        tx.abort();
      return tx;
    };
  });
  await login(page);
  await newProperty(page);
  await page.evaluate(() => {
    (window as any).failCapture = true;
  });
  const title = `Cierre ficticio ${randomUUID().slice(0, 5)}`;
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "error",
  );
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("perder los últimos cambios");
    return dialog.dismiss();
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue(title);
  await page.evaluate(() => {
    (window as any).failCapture = false;
  });
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByLabel("Usuario privado", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".capture-recovery-row")).toHaveCount(0);
  await login(page);
  await page
    .locator(".capture-recovery-row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue(title);
});
