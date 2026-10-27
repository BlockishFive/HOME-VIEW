import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";

test("rental and land sections show the correct prices and no 360 tour", async ({
  page,
}) => {
  await page.goto("/renta");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".property-card")).toContainText("MXN / mes");
  await page.locator(".property-card").click();
  await expect(
    page.getByRole("heading", { name: "Casa Jardín en renta", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".property-asking-price")).toContainText(
    "RENTA MENSUAL",
  );
  await expect(page.locator(".viewer-shell")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Secciones del inmueble" })
      .getByRole("link", { name: "Recorrido 360°" }),
  ).toHaveCount(0);
  await page.goto("/terrenos");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await page.locator(".property-card").click();
  await expect(page.locator(".no-tour")).toContainText(
    "no tiene recorrido 360",
  );
  await expect(page.locator(".viewer-shell")).toHaveCount(0);
  await expect(page.locator(".property-summary")).toContainText("No aplica");
});

test("geographic scope controls and visible attribution work; tile errors are explicit", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.locator(".geo-map");
  await expect(map).toHaveAttribute("data-region", "León");
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  await page.getByRole("button", { name: "Guanajuato", exact: true }).click();
  await expect(map).toHaveAttribute("data-region", "Guanajuato");
  await expect(map).toHaveAttribute("data-zoom", "8");
  await page.getByRole("button", { name: "México", exact: true }).click();
  await expect(map).toHaveAttribute("data-region", "México");
  await expect(map).toHaveAttribute("data-zoom", "5");
  await expect(
    map.getByRole("link", { name: "Natural Earth", exact: true }),
  ).toBeVisible();
  await page.route("**/maps/home-view.pmtiles", (route) => route.abort());
  await page.reload();
  await expect(map).toHaveAttribute("data-tile-state", "error");
  await expect(page.locator(".geo-map-notice")).toContainText(
    "No se pudo cargar el mapa local",
  );
  await expect(page.locator(".property-card")).toHaveCount(5);
  await page.unroute("**/maps/home-view.pmtiles");
  await page.getByRole("button", { name: "Volver a cargar mapa" }).click();
  await expect(map).toHaveAttribute("data-tile-state", "ready");
  await expect(page.locator(".geo-map-notice")).toHaveCount(0);
});

test("a rental draft keeps photos locally, survives reload, exports and deletes", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/alta");
  await expect(
    page.getByRole("combobox", { name: "Operación", exact: true }),
  ).toHaveValue("Renta");
  await expect(page.getByLabel("Ciudad / municipio")).toHaveValue("León");
  await page.getByLabel("Título del anuncio").fill("Casa de prueba en renta");
  await page.getByLabel("Renta mensual (MXN)").fill("12500");
  await page.getByLabel("Superficie construida (m²)").fill("125");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Casa de prueba con luz natural y habitaciones amplias.");
  await page.getByLabel("Colonia / zona").fill("Zona de prueba");
  await page
    .getByLabel("Seleccionar fotografías")
    .setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.", exact: true }).check();
  await page
    .getByRole("button", { name: "Guardar borrador en este navegador" })
    .click();
  await expect(page.locator(".listing-success")).toContainText(
    "solo en este navegador",
  );
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await expect(page.locator(".draft-card img")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar respaldo" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const saved = JSON.parse(await readFile(path!, "utf8"));
  expect(saved.operation).toBe("Renta");
  expect(saved.schemaVersion).toBe(2);
  expect(saved.rental.monthlyRent).toBe(12500);
  expect(saved.rental.deposit).toBeNull();
  expect(saved.rental.services.water).toBe("unknown");
  expect(saved).not.toHaveProperty("sale");
  expect(saved).not.toHaveProperty("price");
  expect(saved).not.toHaveProperty("annualTax");
  expect(saved.scenes).toEqual([]);
  expect(saved.photos[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Eliminar borrador" }).click();
  await expect(page.locator(".draft-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".listing-empty")).toBeVisible();
});

test("invalid photos and unavailable storage never report successful saving", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/alta");
  await expect(page.locator(".listing-error")).toContainText(
    "no está disponible",
  );
  await page
    .getByRole("combobox", { name: "Tipo de inmueble", exact: true })
    .selectOption("Terreno");
  await expect(page.getByLabel("Recámaras (opcional)")).toHaveCount(0);
  await page.getByLabel("Seleccionar fotografías").setInputFiles({
    name: "fake.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator("#error-photos")).toContainText("No se pudo leer");
  await expect(page.locator(".listing-success")).toHaveCount(0);
  await expect(page.locator(".draft-card")).toHaveCount(0);
});

test("invalid draft announces its errors and focuses the first invalid field", async ({
  page,
}) => {
  await page.goto("/alta");
  await page
    .getByRole("button", { name: "Guardar borrador en este navegador" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Título del anuncio", exact: true }),
  ).toBeFocused();
  await expect(
    page.locator(".listing-workspace").getByRole("alert"),
  ).toContainText("título");
  await expect(page.locator(".draft-card")).toHaveCount(0);
});

test("map uses only local vector data and HTTP range requests", async ({
  page,
  request,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (
      /^https?:/.test(req.url()) &&
      !req.url().startsWith("http://127.0.0.1:3000/")
    )
      external.push(req.url());
  });
  const response = await request.get("/maps/home-view.pmtiles", {
    headers: { Range: "bytes=0-126" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toMatch(/^bytes 0-126\//);
  expect((await response.body()).subarray(0, 7).toString()).toBe("PMTiles");
  await page.goto("/renta");
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "ready",
  );
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-map-engine",
    "maplibre-pmtiles",
  );
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  expect(external).toEqual([]);
});

test("slow map images offer recovery instead of loading indefinitely", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/maps/home-view.pmtiles", () => {});
  await page.goto("/renta", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "León", exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(16000);
  await expect(page.locator(".geo-map")).toHaveAttribute(
    "data-tile-state",
    "error",
  );
  await expect(
    page.getByRole("button", { name: "Volver a cargar mapa" }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
