import { test, expect } from "@playwright/test";

test("gallery supports keyboard navigation, mobile layout and focus restoration", async ({
  page,
}) => {
  await page.goto("/propiedades/casa-oliva");
  const trigger = page.getByRole("button", { name: "Abrir imagen 2: Cocina" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Galería de Casa Oliva" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".gallery-counter")).toHaveText("2 / 3 · Cocina");
  await expect(
    dialog.getByRole("button", { name: "Cerrar galería" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".gallery-counter")).toHaveText(
    "3 / 3 · Recámara",
  );
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".gallery-counter")).toHaveText(
    "1 / 3 · Sala de estar",
  );
  await dialog.getByRole("button", { name: "Imagen anterior" }).click();
  await expect(dialog.locator(".gallery-counter")).toHaveText(
    "3 / 3 · Recámara",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Ver todas las imágenes (3)" })
    .click();
  await expect(dialog.locator(".gallery-counter")).toHaveText(
    "1 / 3 · Sala de estar",
  );
  await dialog.getByRole("button", { name: "Cerrar galería" }).click();
  await expect(
    page.getByRole("button", { name: "Ver todas las imágenes (3)" }),
  ).toBeFocused();
});

test("section links reach the summary, tour, location and fiscal costs", async ({
  page,
}) => {
  await page.goto("/propiedades/casa-oliva");
  const nav = page.getByRole("navigation", { name: "Secciones del inmueble" });
  for (const [name, id] of [
    ["Resumen", "resumen"],
    ["Recorrido 360°", "recorrido"],
    ["Ubicación", "ubicacion"],
    ["Costos", "costos"],
  ]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id} h2`).first()).toBeInViewport();
  }
  await page.goto("/propiedades/loft-arena");
  await expect(page.locator(".property-summary")).toContainText(
    "Condominio (demo)",
  );
  await expect(page.locator(".property-summary")).toContainText(
    "No especificada",
  );
});

test("share copies a canonical property URL and print invokes the browser action", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    window.print = () => {
      document.body.dataset.printRequested = "true";
    };
  });
  await page.goto("/propiedades/casa-oliva#resumen");
  await page.getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(
    page.locator(".property-actions").getByRole("status"),
  ).toHaveText("Enlace copiado.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "http://127.0.0.1:3000/propiedades/casa-oliva",
  );
  await page.getByRole("button", { name: "Imprimir", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-requested",
    "true",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".property-section-nav")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Descripción del inmueble" }),
  ).toBeVisible();
  await expect(page.locator(".property-summary")).toBeVisible();
});

test("sharing falls back to a manual URL when clipboard access is denied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/propiedades/casa-oliva");
  await page.getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(
    page.locator(".property-actions").getByRole("status"),
  ).toContainText("No se pudo copiar automáticamente");
  await expect(page.getByLabel("Enlace de esta propiedad")).toHaveValue(
    "http://127.0.0.1:3000/propiedades/casa-oliva",
  );
  await expect(page.getByText("Enlace copiado.", { exact: true })).toHaveCount(
    0,
  );
});

test("manual scrolling to the end activates costs on a tall screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto("/propiedades/casa-oliva");
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    }),
  );
  await expect(
    page
      .getByRole("navigation", { name: "Secciones del inmueble" })
      .getByRole("link", { name: "Costos", exact: true }),
  ).toHaveAttribute("aria-current", "location");
});
