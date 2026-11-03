import { test, expect } from "./fixtures";
import { streetFixture, streetTileJSON } from "./street-fixture";
test("vector streets render with local labels, dark palette, credits, viewport and markers retained across source/language changes", async ({
  page,
}) => {
  const body = streetFixture();
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:3000") &&
      !r.url().startsWith("https://tiles.openfreemap.org/")
    )
      unexpected.push(r.url());
  });
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.request().url().endsWith("/planet")
      ? route.fulfill({
          headers: { "Access-Control-Allow-Origin": "*" },
          json: streetTileJSON,
        })
      : route.fulfill({
          headers: { "Access-Control-Allow-Origin": "*" },
          contentType: "application/x-protobuf",
          body,
        }),
  );
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/renta");
  await page
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  const map = page.locator(".geo-map");
  await expect(map).toHaveAttribute("data-map-engine", "maplibre-openfreemap");
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  for (const name of [
    "OpenFreeMap",
    "© OpenMapTiles",
    "© OpenStreetMap contributors",
  ])
    await expect(map.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(map.locator(".geo-marker")).toHaveCount(1);
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Acercar mapa", exact: true })
      .click();
  await expect(map).toHaveAttribute("data-zoom", "16");
  await map.screenshot({
    path: test.info().outputPath("vector-streets-ipad.png"),
  });
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await expect(
    page.getByRole("button", { name: "Use backup map", exact: true }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  await expect(map.locator(".geo-marker")).toHaveCount(1);
  await page.getByRole("button", { name: "Mexico", exact: true }).click();
  await expect(map).toHaveAttribute("data-zoom", "5");
  await page
    .getByRole("button", { name: "Use backup map", exact: true })
    .click();
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  await expect(map).toHaveAttribute("data-zoom", "5");
  await page
    .getByRole("button", {
      name: "Detailed streets · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  await expect(map).toHaveAttribute("data-zoom", "5");
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("blocked vector provider reports recovery without showing a blocked raster image or losing catalog", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (r) =>
    r.fulfill({
      status: 403,
      contentType: "text/plain",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Access blocked",
    }),
  );
  await page.goto("/renta");
  await page
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "error",
  );
  await expect(page.locator(".geo-map-notice")).toContainText(
    "bloqueo de red o del proveedor",
  );
  await expect(page.locator(".property-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Usar mapa de respaldo", exact: true })
    .click();
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
});
