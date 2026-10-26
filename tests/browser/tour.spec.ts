import { test, expect } from "./fixtures";
test("catalog, immersive navigation, plan and demo visit request", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Un espacio para cada historia." }),
  ).toBeVisible();
  await expect(page.locator(".property-card")).toHaveCount(5);
  await page.locator(".property-card").first().click();
  await expect(
    page.getByRole("heading", { name: "Casa Oliva", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Preparando tu recorrido…")).toBeHidden({
    timeout: 30000,
  });
  await expect(page.locator(".viewer-shell").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  await page.locator(".hotspot").filter({ hasText: "Cocina" }).click();
  await expect(page.locator(".viewer-badge")).toHaveText("Cocina");
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled();
  await page.locator(".plan-room").filter({ hasText: "Recámara" }).click();
  await expect(page.locator(".viewer-badge")).toHaveText("Recámara");
  await page
    .locator(".room-tabs")
    .getByRole("button", { name: "Sala de estar", exact: false })
    .click();
  await expect(page.locator(".viewer-badge")).toHaveText("Sala de estar");
  await page.getByRole("button", { name: "Solicitar visita" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Estás explorando una demostración.",
  );
  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(page.locator("#visit-info")).toHaveCount(0);
  await expect(page.locator("canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("invalid property renders a helpful 404", async ({ page }) => {
  const response = await page.goto("/propiedades/no-existe");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Esta puerta no lleva a ningún lugar." }),
  ).toBeVisible();
});
test("mobile catalog and room navigation fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/propiedades/casa-oliva");
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .locator(".room-tabs")
    .getByRole("button", { name: "Cocina", exact: false })
    .click();
  await expect(page.locator(".viewer-badge")).toHaveText("Cocina");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("a missing panorama shows a recoverable error", async ({ page }) => {
  await page.route("**/panoramas/sala.jpg", (route) => route.abort());
  await page.goto("/propiedades/casa-oliva");
  await expect(page.locator(".viewer-shell").getByRole("alert")).toContainText(
    "No se pudo iniciar el visor 360.",
  );
  await page.locator(".plan-room").filter({ hasText: "Cocina" }).click();
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(page.locator(".viewer-badge")).toHaveText("Cocina");
});

test("map selection, zoom and catalog filters stay synchronized", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Seleccionar Loft Arena en el mapa/ })
    .click();
  await expect(page.locator(".selected-property")).toContainText("Loft Arena");
  await expect(page.locator(".selected-property")).toContainText("$4,200");
  await page.getByRole("button", { name: "Acercar mapa", exact: true }).click();
  await expect(page.locator(".geo-map")).toHaveAttribute("data-zoom", "14");
  await page.getByRole("button", { name: "Restablecer mapa" }).click();
  await expect(page.locator(".geo-map")).toHaveAttribute("data-zoom", "13");
  await page.getByLabel("TIPO DE INMUEBLE").selectOption("Departamento");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".geo-marker")).toHaveCount(1);
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("PRESUPUESTO MÁXIMO").selectOption("5000000");
  await expect(page.locator(".property-card")).toHaveCount(4);
  await page
    .getByPlaceholder("¿Dónde comienza tu próxima historia?")
    .fill("jardin");
  await expect(page.locator(".property-card")).toHaveCount(2);
  await page
    .getByPlaceholder("¿Dónde comienza tu próxima historia?")
    .fill("imposible");
  await expect(
    page.getByText("No encontramos espacios con esos filtros."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver todas las propiedades" }).click();
  await expect(page.locator(".geo-marker")).toHaveCount(5);
  await page.getByRole("button", { name: "Tarjetas", exact: false }).click();
  await expect(page.locator(".property-grid .property-card")).toHaveCount(5);
});
test("property page explains fictional fiscal costs and location", async ({
  page,
}) => {
  await page.goto("/propiedades/casa-oliva");
  await expect(
    page.getByText("Predial anual estimado", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cost-card")).toContainText("$7,800");
  await expect(page.locator(".cost-card")).toContainText("sin validez fiscal");
  await expect(page.locator(".location-section")).toContainText(
    "Dirección ficticia",
  );
});
