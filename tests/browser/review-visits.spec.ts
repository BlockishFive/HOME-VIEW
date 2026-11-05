import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { confirmReviewedPublication } from "./publication-review-helper";
import { streetFixture, streetTileJSON } from "./street-fixture";
test.use({
  serviceWorkers: "block",
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
});
const ORIGIN = "http://127.0.0.1:3000";
const REVIEW = "Revisar antes de publicar";
async function fill(page: Page, title: string) {
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page
    .getByLabel("Superficie construida (m²)", { exact: true })
    .fill("120");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill(
      "Anuncio ficticio con imágenes autorizadas para comprobar la revisión privada.",
    );
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
}
async function login(page: Page) {
  await page.goto("/privado");
  await page.getByLabel("Usuario privado", { exact: true }).fill("pilot");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("Fictitious-browser-pilot-2026");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nueva propiedad", exact: true })
    .click();
}
async function savePrivate(page: Page, title: string) {
  await fill(page, title);
  await page
    .getByRole("checkbox", {
      name: "Revisé la ubicación y autorizo la precisión pública seleccionada.",
      exact: true,
    })
    .check();
  await page
    .getByLabel("Latitud del acceso privado", { exact: true })
    .fill("21.177777");
  await page
    .getByLabel("Longitud del acceso privado", { exact: true })
    .fill("-101.733333");
  await page
    .getByLabel("Referencia de llegada privada", { exact: true })
    .fill("Referencia privada ficticia Norte");
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "confirmed",
  );
  return (
    await (await page.request.get("/api/private/drafts")).json()
  ).drafts.find((d: { title: string }) => d.title === title);
}
test("capture review shows blockers and unknowns, previews only public data, supports a nested gallery and preserves the form", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/alta");
  let writes = 0;
  page.on("request", (r) => {
    if (r.method() === "PUT" || r.url().includes("/api/private/publication/"))
      writes++;
  });
  const opener = page.getByRole("button", {
    name: "Revisar captura actual",
    exact: true,
  });
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Mi captura pendiente");
  await opener.click();
  const review = page.getByRole("dialog", { name: REVIEW, exact: true });
  await expect(review.locator(".review-blockers")).toContainText(
    "precio mayor que cero",
  );
  await expect(
    review.getByRole("button", { name: "Ver ficha previa", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(review).not.toBeVisible();
  await expect(opener).toBeFocused();
  const title = "Vista previa ficticia conservada";
  await fill(page, title);
  await page
    .getByLabel("Latitud del acceso privado", { exact: true })
    .fill("21.177777");
  await page
    .getByLabel("Longitud del acceso privado", { exact: true })
    .fill("-101.733333");
  await page
    .getByLabel("Referencia de llegada privada", { exact: true })
    .fill("Referencia privada ficticia Norte");
  await opener.click();
  await expect(review.locator(".review-pending")).toContainText(
    "Depósito por confirmar",
  );
  await expect(review.locator(".review-pending")).not.toContainText("Predial");
  await review
    .getByRole("button", { name: "Ver ficha previa", exact: true })
    .click();
  const preview = review.getByRole("region", {
    name: "Ficha pública de vista previa",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      preview
        .locator(".property-gallery img")
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(preview.locator("#costos")).not.toContainText("Predial");
  const html = await preview.innerHTML();
  for (const forbidden of [
    "Referencia privada ficticia Norte",
    "21.177777",
    "-101.733333",
    "21.168432",
    "-101.712345",
  ])
    expect(html).not.toContain(forbidden);
  await expect(
    preview.getByRole("button", { name: "Compartir", exact: true }),
  ).toHaveCount(0);
  await preview.locator(".gallery-tile").first().click();
  await expect(preview.locator(".gallery-dialog")).toHaveJSProperty(
    "open",
    true,
  );
  await page.keyboard.press("Escape");
  await expect(preview.locator(".gallery-dialog")).toHaveJSProperty(
    "open",
    false,
  );
  await expect(review).toBeVisible();
  await review
    .getByRole("button", { name: "Ocultar ficha previa", exact: true })
    .click();
  await review.evaluate((element) => {
    element.scrollTop = 0;
  });
  await review.screenshot({
    path: test.info().outputPath("review-checklist-ipad.png"),
  });
  await review
    .getByRole("button", { name: "Cerrar revisión", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue(title);
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill(title + " sin guardar");
  await page
    .locator(".draft-card")
    .getByRole("button", { name: "Revisar anuncio guardado", exact: true })
    .click();
  await expect(review).toContainText("borrador guardado en este navegador");
  await expect(review).not.toContainText(title + " sin guardar");
  await review
    .getByRole("button", { name: "Cerrar revisión", exact: true })
    .click();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue(title + " sin guardar");
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await page
    .getByRole("button", { name: "Review current capture", exact: true })
    .click();
  const english = page.getByRole("dialog", {
    name: "Review before publishing",
    exact: true,
  });
  await expect(english.locator(".review-pending")).toContainText(
    "The deposit is unconfirmed",
  );
  await expect(english).toContainText(title);
  expect(writes).toBe(0);
  expect(
    await english.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});
test("publication review uses the saved version, requires explicit consent and never publishes unsaved edits or private visit data", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await login(page);
  const title = `Revisión guardada ${randomUUID().slice(0, 6)}`,
    dto = await savePrivate(page, title);
  expect(dto.visitAccess.notes).toBe("Referencia privada ficticia Norte");
  const pendingTitle = title + " sin guardar";
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill(pendingTitle);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("19000");
  const card = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  let publications = 0;
  page.on("request", (r) => {
    if (r.url().includes(`/api/private/publication/${dto.id}`)) publications++;
  });
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  const review = page.getByRole("dialog", { name: REVIEW, exact: true });
  await expect(review).toContainText("Los cambios que tengas en el formulario");
  await expect(
    review.getByRole("button", { name: "Confirmar publicación", exact: true }),
  ).toBeDisabled();
  await review
    .getByRole("button", { name: "Ver ficha previa", exact: true })
    .click();
  const preview = review.getByRole("region", {
    name: "Ficha pública de vista previa",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(preview).not.toContainText(pendingTitle);
  await expect(preview.locator(".property-asking-price")).toContainText(
    "18,000",
  );
  await expect
    .poll(() =>
      preview
        .locator(".property-gallery img")
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  const outsider = await browser.newContext();
  try {
    expect(
      (
        await outsider.request.get(
          `/api/public/media/${dto.id}/${dto.photos[0].id}`,
        )
      ).status(),
    ).toBe(404);
    page.once("dialog", (dialog) => dialog.dismiss());
    await confirmReviewedPublication(page);
    expect(publications).toBe(0);
    await expect(review).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await review
      .getByRole("button", { name: "Confirmar publicación", exact: true })
      .click();
    await expect(review).not.toBeVisible();
    await expect(
      card.getByRole("link", { name: "Ver publicación", exact: true }),
    ).toBeVisible();
    expect(publications).toBe(1);
    const response = await outsider.request.get(
        `/propiedades/anuncio-${dto.id}`,
      ),
      html = await response.text();
    expect(response.status()).toBe(200);
    for (const forbidden of [
      pendingTitle,
      "Referencia privada ficticia Norte",
      "21.177777",
      "-101.733333",
      "21.168432",
      "-101.712345",
      "visitAccess",
    ])
      expect(html).not.toContain(forbidden);
    expect(html).toContain(title);
    await expect(
      page.getByLabel("Título del anuncio", { exact: true }),
    ).toHaveValue(pendingTitle);
  } finally {
    await outsider.close();
    await page.request.post(`/api/private/publication/${dto.id}`, {
      headers: { Origin: ORIGIN },
      data: { revision: 1, publish: false },
    });
  }
});
test("a version changed during review is rejected and must be refreshed and reviewed again", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  const title = `Conflicto revisión ${randomUUID().slice(0, 6)}`,
    dto = await savePrivate(page, title);
  const card = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  const image = await readFile("public/panoramas/sala-cover.jpg");
  const multipart: Record<string, any> = {
    draft: JSON.stringify({
      ...dto,
      title: title + " nueva",
      visitAccess: { latitude: "21.12", longitude: "", notes: "" },
    }),
    revision: "1",
  };
  multipart[`photo:${dto.photos[0].id}`] = {
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  };
  expect(
    (
      await page.request.put("/api/private/drafts", {
        headers: { Origin: ORIGIN },
        multipart,
      })
    ).status(),
  ).toBe(400);
  multipart.draft = JSON.stringify({ ...dto, title: title + " nueva" });
  expect(
    (
      await page.request.put("/api/private/drafts", {
        headers: { Origin: ORIGIN },
        multipart,
      })
    ).status(),
  ).toBe(200);
  page.once("dialog", (dialog) => dialog.accept());
  await confirmReviewedPublication(page);
  const review = page.getByRole("dialog", { name: REVIEW, exact: true });
  await expect(review.getByRole("alert")).toContainText("versión más reciente");
  await review
    .getByRole("button", {
      name: "Actualizar versión para revisar",
      exact: true,
    })
    .click();
  await expect(review).toContainText("Versión 2");
  await expect(review).toContainText(title + " nueva");
  await expect(review.getByRole("checkbox")).not.toBeChecked();
  page.once("dialog", (dialog) => dialog.accept());
  await confirmReviewedPublication(page);
  await expect(review).not.toBeVisible();
  await expect(
    page
      .locator(".draft-card")
      .filter({ hasText: title + " nueva" })
      .getByRole("link", { name: "Ver publicación", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue(title);
  expect(
    (
      await page.request.post(`/api/private/publication/${dto.id}`, {
        headers: { Origin: ORIGIN },
        data: { revision: 2, publish: false },
      })
    ).status(),
  ).toBe(200);
});
test("iPad capture keeps access and property points independent across GPS, larger map, provider changes, autosave and backup", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (ok: unknown) => {
          (window as any).finishGps = ok;
        },
      },
    });
  });
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.request().url().endsWith("/planet")
      ? route.fulfill({
          headers: { "Access-Control-Allow-Origin": "*" },
          json: streetTileJSON,
        })
      : route.fulfill({
          contentType: "application/x-protobuf",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: streetFixture(),
        }),
  );
  await page.goto("/alta");
  await fill(page, "Visita ficticia con acceso independiente");
  const picker = page.locator(".location-picker"),
    map = picker.locator(".geo-map");
  let external = 0;
  page.on("request", (r) => {
    if (
      new URL(r.url()).hostname === "www.google.com" ||
      new URL(r.url()).hostname === "www.openstreetmap.org"
    )
      external++;
  });
  await page
    .getByRole("checkbox", {
      name: "Revisé la ubicación y autorizo la precisión pública seleccionada.",
      exact: true,
    })
    .check();
  await picker
    .getByRole("button", { name: "Ubicar acceso para visitas", exact: true })
    .click();
  await expect(
    page.getByLabel("Latitud del acceso privado", { exact: true }),
  ).toHaveValue("");
  await expect(map).toHaveAttribute("data-tile-state", "ready", {
    timeout: 15000,
  });
  const canvas = map.locator("canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: box.width * 0.72, y: box.height * 0.62 },
  });
  const lat = await page
      .getByLabel("Latitud del acceso privado", { exact: true })
      .inputValue(),
    lng = await page
      .getByLabel("Longitud del acceso privado", { exact: true })
      .inputValue();
  expect(lat).not.toBe("");
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.168432");
  await expect(
    map.locator('.maplibregl-marker[aria-label="Punto privado del acceso"]'),
  ).toHaveCount(1);
  await expect(
    map.locator(
      '.maplibregl-marker[aria-label="Referencia privada del inmueble"]',
    ),
  ).toHaveCount(1);
  await picker
    .getByRole("button", { name: "Usar mi ubicación actual", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Ubicar inmueble", exact: true })
    .click();
  await page.evaluate(() => {
    (window as any).finishGps({
      coords: { latitude: 21.19, longitude: -101.74, accuracy: 5 },
    });
  });
  await expect(picker.getByRole("alert")).toContainText("El punto cambió");
  await expect(
    page.getByLabel("Latitud del punto privado", { exact: true }),
  ).toHaveValue("21.168432");
  await expect(
    page.getByLabel("Latitud del acceso privado", { exact: true }),
  ).toHaveValue(lat);
  await expect(
    page.getByRole("checkbox", {
      name: "Revisé la ubicación y autorizo la precisión pública seleccionada.",
      exact: true,
    }),
  ).toBeChecked();
  const height = (await map.boundingBox())!.height;
  await picker
    .getByRole("button", { name: "Ampliar mapa de captura", exact: true })
    .click();
  expect((await map.boundingBox())!.height).toBeGreaterThan(height);
  await picker
    .getByRole("button", { name: "Centrar referencia de captura", exact: true })
    .click();
  await picker
    .getByRole("button", {
      name: "Calles detalladas · OpenFreeMap",
      exact: true,
    })
    .click();
  await expect(map).toHaveAttribute("data-map-engine", "maplibre-openfreemap");
  await expect(map).toHaveAttribute("data-tile-state", "ready", {
    timeout: 15000,
  });
  await expect(
    map.locator('.maplibregl-marker[aria-label="Punto privado del inmueble"]'),
  ).toHaveCount(1);
  await expect(
    map.locator(
      '.maplibregl-marker[aria-label="Referencia privada del acceso"]',
    ),
  ).toHaveCount(1);
  await picker
    .getByRole("button", { name: "Ver inmueble y acceso", exact: true })
    .click();
  await expect
    .poll(() =>
      map.evaluate((element) => {
        const outer = element.getBoundingClientRect();
        return [...element.querySelectorAll(".maplibregl-marker")].every(
          (marker) => {
            const rect = marker.getBoundingClientRect(),
              x = rect.x + rect.width / 2,
              y = rect.y + rect.height / 2;
            return (
              x >= outer.x &&
              x <= outer.right &&
              y >= outer.y &&
              y <= outer.bottom
            );
          },
        );
      }),
    )
    .toBe(true);
  const link = picker.getByRole("link", {
    name: "Comparar en Google Maps",
    exact: true,
  });
  expect(
    new URL((await link.getAttribute("href"))!).searchParams.get("query"),
  ).toBe("21.168432,-101.712345");
  expect(external).toBe(0);
  await picker
    .getByRole("button", { name: "Reducir mapa de captura", exact: true })
    .click();
  await page
    .getByLabel("Referencia de llegada privada", { exact: true })
    .fill("Entrada ficticia norte");
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  await picker.screenshot({
    path: test.info().outputPath("visit-map-ipad.png"),
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar captura actual", exact: true })
    .click();
  const path = test.info().outputPath("visit-backup.json");
  await (await download).saveAs(path);
  const data = JSON.parse(await readFile(path, "utf8"));
  expect(data.content.visitAccess).toEqual({
    latitude: lat,
    longitude: lng,
    notes: "Entrada ficticia norte",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await expect(
    page.getByLabel("Latitud del acceso privado", { exact: true }),
  ).toHaveValue(lat);
  await expect(
    page.getByLabel("Referencia de llegada privada", { exact: true }),
  ).toHaveValue("Entrada ficticia norte");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("partial access coordinates survive recovery and backup restoration, while confirmed drafts require a valid pair", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/alta");
  await fill(page, "Acceso incompleto de prueba");
  await page
    .getByLabel("Latitud del acceso privado", { exact: true })
    .fill("21.177777");
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator("#error-visitAccess")).toContainText(
    "Completa las dos coordenadas",
  );
  await expect(page.locator(".draft-card")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar captura actual", exact: true })
    .click();
  const path = test.info().outputPath("partial-access.json");
  await (await download).saveAs(path);
  await page
    .getByLabel("Seleccionar respaldo de Home View", { exact: true })
    .setInputFiles(path);
  await page
    .getByRole("checkbox", {
      name: "Revisé el respaldo y quiero restaurarlo como una copia nueva.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Restaurar como captura nueva", exact: true })
    .click();
  await expect(page.locator(".backup-tools .listing-success")).toContainText(
    "Copia restaurada",
  );
  await page
    .getByRole("button", {
      name: "Continuar captura",
      exact: true,
      disabled: false,
    })
    .click();
  await expect(
    page.getByLabel("Latitud del acceso privado", { exact: true }),
  ).toHaveValue("21.177777");
  await expect(
    page.getByLabel("Longitud del acceso privado", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Longitud del acceso privado", { exact: true })
    .fill("-101.733333");
  await page
    .getByRole("checkbox", {
      name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
});
