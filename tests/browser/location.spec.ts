import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { streetFixture, streetTileJSON } from "./street-fixture";
const reviewed =
  "Revisé la ubicación y autorizo la precisión pública seleccionada.";
async function login(page: import("@playwright/test").Page) {
  await page.goto("/privado");
  await page.getByLabel("Usuario privado", { exact: true }).fill("pilot");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Fictitious-browser-pilot-2026");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.locator(".location-picker")).toBeVisible();
}
test("iPad location search is explicit, tapping and GPS adjust the private point; street fallback retains it", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 820, height: 1180 });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 21.168432,
    longitude: -101.712345,
    accuracy: 12,
  });
  let searches = 0,
    tiles = 0;
  let failTiles = true;
  const streetTile = streetFixture();
  await page.route("**/api/private/geocode", (route) => {
    searches++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      query: "Zona ficticia León",
      locale: "es",
    });
    return route.fulfill({
      json: {
        results: [
          {
            label: "Zona ficticia de prueba",
            lat: 21.154321,
            lng: -101.754321,
          },
        ],
      },
    });
  });
  // All external tiles are intercepted: browser tests never load community tile servers.
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    tiles++;
    if (failTiles) return route.abort();
    if (route.request().url().endsWith("/planet"))
      return route.fulfill({
        headers: { "Access-Control-Allow-Origin": "*" },
        json: streetTileJSON,
      });
    return route.fulfill({
      contentType: "application/x-protobuf",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: streetTile,
    });
  });
  await login(page);
  const picker = page.locator(".location-picker");
  await picker
    .getByLabel("Buscar calle, colonia o lugar")
    .fill("Zona ficticia León");
  expect(searches).toBe(0);
  expect(tiles).toBe(0);
  await picker
    .getByRole("button", { name: "Buscar dirección", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Zona ficticia de prueba", exact: true })
    .click();
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.154321");
  await expect(
    page.getByLabel("Longitud del punto privado", { exact: true }),
  ).toHaveValue("-101.754321");
  const canvas = picker.locator(".maplibregl-canvas");
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  await canvas.click({ position: { x: 150, y: 190 } });
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).not.toHaveValue("21.154321");
  const beforeDrag = await page
    .getByLabel("Latitud del punto privado", { exact: true })
    .inputValue();
  const marker = picker.locator(".maplibregl-marker:not(.geo-city-label)");
  await expect(marker).toBeVisible();
  await marker.hover({ position: { x: 13, y: 13 } });
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + 13, box.y + 13);
  await page.mouse.down();
  await page.mouse.move(box.x + 48, box.y + 43, { steps: 8 });
  await page.mouse.up();
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).not.toHaveValue(beforeDrag);
  await picker
    .getByRole("button", { name: "Usar mi ubicación actual", exact: true })
    .click();
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.168432");
  await expect(
    picker.getByRole("status").filter({ hasText: "Precisión estimada" }),
  ).toContainText("12 m");
  await picker.getByRole("checkbox", { name: reviewed, exact: true }).check();
  await picker
    .getByLabel("Ubicación que se mostrará al publicar")
    .selectOption("exact");
  await expect(
    picker.getByRole("checkbox", { name: reviewed, exact: true }),
  ).not.toBeChecked();
  await expect(picker.locator(".location-public-preview")).toContainText(
    "21.168432",
  );
  await picker
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-map-engine",
    "maplibre-openfreemap",
  );
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "error",
  );
  expect(tiles).toBeGreaterThan(0);
  await expect(
    picker
      .getByRole("link", { name: "© OpenStreetMap contributors", exact: true })
      .first(),
  ).toBeVisible();
  await picker
    .getByRole("button", { name: "Usar mapa de respaldo", exact: true })
    .click();
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.168432");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  failTiles = false;
  await picker
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  for (
    let i = 0;
    i < 7 &&
    !(await picker
      .getByRole("button", { name: "Acercar mapa", exact: true })
      .isDisabled());
    i++
  )
    await picker
      .getByRole("button", { name: "Acercar mapa", exact: true })
      .click();
  await expect(
    picker.getByRole("button", { name: "Acercar mapa", exact: true }),
  ).toBeDisabled();
  await expect(picker.locator(".geo-map")).toHaveAttribute("data-zoom", "19");
  await picker
    .getByRole("button", { name: "Usar mapa de respaldo", exact: true })
    .click();
  await expect(picker.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  await picker.screenshot({
    path: test.info().outputPath("location-ipad.png"),
  });
  await page.goto("/renta");
  await page
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  await expect(page.locator(".geo-map .geo-marker")).toHaveCount(1);
});
test("private coordinates survive save/edit while public HTML only receives the chosen approximate point", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const title = `Zona autorizada ficticia ${randomUUID().slice(0, 6)}`;
  await login(page);
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page
    .getByLabel("Superficie construida (m²)", { exact: true })
    .fill("120");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Descripción ficticia autorizada sin direcciones privadas.");
  await page
    .getByLabel("Colonia / zona", { exact: true })
    .fill("Zona ficticia");
  await page
    .getByLabel("Latitud del punto privado", { exact: true })
    .fill("21.168432");
  await page
    .getByLabel("Longitud del punto privado", { exact: true })
    .fill("-101.712345");
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
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toContainText("servidor privado");
  const card = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  await expect(page.locator(".draft-save-feedback [role=alert]")).toContainText(
    "Revisa y guarda la ubicación",
  );
  await page.getByRole("checkbox", { name: reviewed, exact: true }).check();
  await page
    .getByRole("button", { name: "Guardar cambios del borrador", exact: true })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toContainText("servidor privado");
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  const link = card.getByRole("link", { name: "Ver publicación", exact: true });
  await expect(link).toBeVisible();
  const outsider = await browser.newContext();
  const response = await outsider.request.get(
    (await link.getAttribute("href"))!,
  );
  const body = await response.text();
  expect(response.status()).toBe(200);
  expect(body).not.toContain("21.168432");
  expect(body).not.toContain("-101.712345");
  expect(body).toContain("21.165");
  expect(body).toContain("-101.715");
  const privateRows = (
    await (await page.request.get("/api/private/drafts")).json()
  ).drafts;
  const draft = privateRows.find((d: { title: string }) => d.title === title);
  expect(draft.latitude).toBe(21.168432);
  expect(draft.longitude).toBe(-101.712345);
  await page.reload();
  await card
    .getByRole("button", { name: "Editar borrador", exact: true })
    .click();
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.168432");
  await expect(
    page.getByRole("checkbox", { name: reviewed, exact: true }),
  ).toBeChecked();
  await page
    .getByLabel("Latitud del punto privado", { exact: true })
    .fill("21.178432");
  await expect(
    page.getByRole("checkbox", { name: reviewed, exact: true }),
  ).not.toBeChecked();
  const withdrawn = await page.request.post(
    `/api/private/publication/${draft.id}`,
    {
      headers: { Origin: "http://127.0.0.1:3000" },
      data: { revision: draft.sharedRevision, publish: false },
    },
  );
  expect(withdrawn.status()).toBe(200);
  await outsider.close();
});
test("search errors and denied GPS preserve capture; English labels work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (_ok: unknown, fail: (error: unknown) => void) =>
          fail({ code: 1 }),
      },
    });
  });
  await page.goto("/alta");
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Mi captura se conserva");
  await page.route("**/api/private/geocode", (route) =>
    route.fulfill({ status: 503, json: { error: "geocoder" } }),
  );
  const picker = page.locator(".location-picker");
  await picker
    .getByLabel("Buscar calle, colonia o lugar")
    .fill("Zona ficticia León");
  await picker
    .getByRole("button", { name: "Buscar dirección", exact: true })
    .click();
  await expect(picker.getByRole("alert")).toContainText(
    "La búsqueda no está disponible",
  );
  await picker
    .getByRole("button", { name: "Usar mi ubicación actual", exact: true })
    .click();
  await expect(picker.getByRole("alert")).toContainText(
    "No se pudo obtener tu ubicación",
  );
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Mi captura se conserva");
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.122");
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await expect(
    picker.getByRole("button", { name: "Search address", exact: true }),
  ).toBeVisible();
  await expect(picker.getByRole("alert")).toContainText(
    "Your location could not be obtained",
  );
});
test("address API is private, rejects cross-origin and malformed queries before contacting provider", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/private/geocode", {
        headers: { Origin: "http://127.0.0.1:3000" },
        data: { query: "Zona ficticia" },
      })
    ).status(),
  ).toBe(401);
  await login(page);
  expect(
    (
      await page.request.post("/api/private/geocode", {
        headers: { Origin: "https://other.example" },
        data: { query: "Zona ficticia" },
      })
    ).status(),
  ).toBe(403);
  const invalid = await page.request.post("/api/private/geocode", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { query: "" },
  });
  expect(invalid.status()).toBe(400);
  expect(invalid.headers()["cache-control"]).toContain("no-store");
});
