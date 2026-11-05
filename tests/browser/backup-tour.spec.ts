import { confirmReviewedPublication } from "./publication-review-helper";
import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initialCaptureValues } from "../../lib/capture-store";
import {
  defaultMaintenance,
  defaultRentalTerms,
} from "../../lib/property-terms";
test.use({
  serviceWorkers: "block",
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
});
const ORIGIN = "http://127.0.0.1:3000";
async function fixture() {
  const jpeg = `data:image/jpeg;base64,${(await readFile("public/panoramas/sala.jpg")).toString("base64")}`;
  return {
    format: "home-view-capture",
    version: 1,
    content: {
      values: {
        ...initialCaptureValues,
        title: "Respaldo ficticio",
        rentPrice: "",
        salePrice: "2200000",
      },
      rental: defaultRentalTerms(),
      sale: { purchasePrice: null, annualTax: null },
      maintenance: defaultMaintenance(),
      community: "unknown",
      publicLocation: "approximate",
      locationReviewed: false,
      photos: [{ id: "photo-old", name: "Foto.jpg", dataUrl: jpeg }],
      scenes: [
        {
          id: "room-a",
          name: "Sala",
          dataUrl: jpeg,
          initialView: { yaw: 0.4, pitch: 0.1, fov: 1 },
          hotspots: [{ target: "room-b", yaw: 0.8, pitch: 0.1 }],
        },
        { id: "room-b", name: "Patio", dataUrl: jpeg, hotspots: [] },
      ],
    },
  };
}
function file(value: unknown) {
  return {
    name: "home-view-prueba.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  };
}
async function rows(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open("home-view-captures", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("captures", "readonly"),
            all = tx.objectStore("captures").getAll();
          tx.oncomplete = () => {
            resolve(all.result);
            db.close();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}
async function selectBackup(page: Page, value: unknown) {
  await page
    .getByLabel("Seleccionar respaldo de Home View", { exact: true })
    .setInputFiles(file(value));
  await expect(
    page.getByRole("heading", {
      name: "Revisar antes de restaurar",
      exact: true,
    }),
  ).toBeVisible();
}
async function restore(page: Page) {
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
  await expect(
    page.getByRole("button", { name: "Nueva propiedad", exact: true }),
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
    .fill("Casa ficticia autorizada para comprobar respaldos y recorridos.");
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
test("partial captures download and restore across browsers after review; photos, independent prices and 360 links survive", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.goto("/alta");
  await selectBackup(page, await fixture());
  await restore(page);
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Captura incompleta autorizada");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar captura actual", exact: true })
    .click();
  const saved = await download,
    path = test.info().outputPath("capture-backup.json");
  await saved.saveAs(path);
  const json = JSON.parse(await readFile(path, "utf8"));
  expect(json.format).toBe("home-view-capture");
  expect(json.content.values.rentPrice).toBe("");
  expect(json.content.values.salePrice).toBe("2200000");
  expect(json.content.scenes[0].initialView.yaw).toBe(0.4);
  expect(json.content.photos[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  expect(json.sharedRevision).toBeUndefined();
  const other = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    serviceWorkers: "block",
  });
  try {
    const tablet = await other.newPage();
    let uploads = 0;
    tablet.on("request", (r) => {
      if (r.method() === "PUT") uploads++;
    });
    await tablet.goto(`${ORIGIN}/alta`);
    await tablet
      .getByLabel("Seleccionar respaldo de Home View", { exact: true })
      .setInputFiles(path);
    await expect(tablet.locator(".backup-review")).toContainText(
      "Captura incompleta autorizada",
    );
    await expect(tablet.locator(".backup-photos img")).toHaveCount(1);
    await expect
      .poll(() =>
        tablet
          .locator(".backup-photos img")
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await tablet
      .getByRole("button", { name: "Cancelar restauración", exact: true })
      .click();
    expect(await rows(tablet)).toHaveLength(0);
    await tablet
      .getByLabel("Seleccionar respaldo de Home View", { exact: true })
      .setInputFiles(path);
    await expect(tablet.locator(".backup-review")).toBeVisible();
    await tablet
      .getByRole("combobox", { name: "Idioma / Language" })
      .selectOption("en");
    await expect(
      tablet.getByRole("heading", {
        name: "Review before restoring",
        exact: true,
      }),
    ).toBeVisible();
    await tablet
      .locator(".backup-tools")
      .screenshot({ path: test.info().outputPath("backup-review-ipad.png") });
    await tablet
      .getByRole("checkbox", {
        name: "I reviewed the backup and want to restore it as a new copy.",
        exact: true,
      })
      .check();
    await tablet
      .getByRole("button", { name: "Restore as a new capture", exact: true })
      .click();
    await expect(
      tablet.locator(".backup-tools .listing-success"),
    ).toContainText("Copy restored");
    expect(uploads).toBe(0);
    const captures = await rows(tablet);
    expect(captures).toHaveLength(1);
    expect(captures[0].sharedRevision).toBe(0);
    expect(captures[0].content.values.imageRights).toBe(false);
    expect(captures[0].content.locationReviewed).toBe(false);
    expect(captures[0].content.scenes[0].hotspots[0].target).toBe(
      captures[0].content.scenes[1].id,
    );
    expect(captures[0].content.scenes[0].id).not.toBe(
      json.content.scenes[0].id,
    );
    await tablet
      .getByRole("combobox", { name: "Idioma / Language" })
      .selectOption("es");
    await tablet
      .getByRole("button", { name: "Continuar captura", exact: true })
      .click();
    await expect(
      tablet.getByLabel("Renta mensual (MXN)", { exact: true }),
    ).toHaveValue("");
    await expect(tablet.locator(".listing-photo-preview img")).toHaveCount(1);
    await expect(tablet.locator(".draft-scene-card")).toHaveCount(2);
    await tablet
      .getByRole("combobox", { name: "Operación", exact: true })
      .selectOption("Venta");
    await expect(
      tablet.getByLabel("Precio de venta (MXN)", { exact: true }),
    ).toHaveValue("2200000");
    expect(
      await tablet.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await other.close();
  }
});
test("confirmed version 2 backups restore as a separate copy and keep the original draft", async ({
  page,
}) => {
  await page.goto("/alta");
  await fill(page, "Original ficticio del respaldo");
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  const card = page.locator(".draft-card"),
    originalId = await card.getAttribute("id");
  const download = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Descargar respaldo", exact: true })
    .click();
  const path = test.info().outputPath("confirmed-backup.json");
  await (await download).saveAs(path);
  const json = JSON.parse(await readFile(path, "utf8"));
  expect(json.version).toBe(2);
  expect(json.sharedRevision).toBeUndefined();
  await selectBackup(page, json);
  await restore(page);
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.",
      exact: true,
    }),
  ).not.toBeChecked();
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
  await expect(page.locator(".draft-card")).toHaveCount(2);
  expect(
    await page
      .locator(".draft-card")
      .evaluateAll((cards) => cards.map((card) => card.id)),
  ).toContain(originalId);
});
test("invalid or external backup media is rejected before restoration and leaves the current capture untouched", async ({
  page,
}) => {
  await page.goto("/alta");
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Mi captura permanece");
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  const before = await rows(page);
  let external = 0;
  page.on("request", (r) => {
    if (r.url().includes("never-download.invalid")) external++;
  });
  const bad = await fixture();
  bad.content.photos[0].dataUrl = "https://never-download.invalid/photo.jpg";
  await page
    .getByLabel("Seleccionar respaldo de Home View", { exact: true })
    .setInputFiles(file(bad));
  await expect(page.locator(".backup-tools [role=alert]")).toContainText(
    "no se descargan enlaces externos",
  );
  bad.content.photos[0].dataUrl = "data:image/jpeg;base64,/9j/AAAA";
  await page
    .getByLabel("Seleccionar respaldo de Home View", { exact: true })
    .setInputFiles(file(bad));
  await expect(page.locator(".backup-tools [role=alert]")).toContainText(
    /no se pudo decodificar/i,
  );
  expect(external).toBe(0);
  expect(await rows(page)).toEqual(before);
  await expect(
    page.getByRole("button", {
      name: "Restaurar como captura nueva",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Mi captura permanece");
});
test("an aborted restore never claims success; its reviewed file remains available for retry without duplicates", async ({
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
        (window as any).failRestore
      )
        tx.abort();
      return tx;
    };
  });
  await page.goto("/alta");
  await selectBackup(page, await fixture());
  await page.evaluate(() => {
    (window as any).failRestore = true;
  });
  await page
    .getByRole("checkbox", {
      name: "Revisé el respaldo y quiero restaurarlo como una copia nueva.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Restaurar como captura nueva", exact: true })
    .click();
  await expect(page.locator(".backup-tools [role=alert]")).toBeVisible();
  await expect(page.locator(".backup-tools .listing-success")).toHaveCount(0);
  expect(await rows(page)).toHaveLength(0);
  await page.evaluate(() => {
    (window as any).failRestore = false;
  });
  await page
    .getByRole("button", { name: "Restaurar como captura nueva", exact: true })
    .click();
  await expect(page.locator(".backup-tools .listing-success")).toContainText(
    "Copia restaurada",
  );
  expect(await rows(page)).toHaveLength(1);
});
async function addScenes(page: Page) {
  const editor = page.locator(".draft-tour-editor");
  await editor.getByRole("checkbox").check();
  await editor
    .getByLabel("Añadir panoramas 360", { exact: true })
    .setInputFiles([
      "public/panoramas/sala.jpg",
      "public/panoramas/cocina.jpg",
    ]);
  await expect(editor.locator(".draft-scene-card")).toHaveCount(2);
  return editor;
}
test("iPad visual editor projects a tap, ignores drags, preserves entry direction and diagnoses directed connections", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/alta");
  const editor = await addScenes(page);
  await expect(editor.locator(".tour-connectivity")).toContainText(
    "Sin camino desde",
  );
  await editor
    .getByRole("button", { name: "Editar visualmente escena 1", exact: true })
    .click();
  const visual = editor.locator(".tour-visual-editor"),
    viewer = visual.locator(".viewer-shell");
  await expect(
    visual.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await visual
    .getByRole("button", { name: "Activar colocación por toque", exact: true })
    .click();
  const panorama = visual.locator(".panorama");
  await panorama.scrollIntoViewIfNeeded();
  let box = (await panorama.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(editor.locator(".draft-connection")).toHaveCount(0);
  // Real multi-touch input must not be mistaken for the final finger's tap.
  const touch = await page.context().newCDPSession(page);
  try {
    const points = [
      { x: box.x + box.width * 0.35, y: box.y + box.height * 0.5, id: 0 },
      { x: box.x + box.width * 0.65, y: box.y + box.height * 0.5, id: 1 },
    ];
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points,
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { ...points[0], x: box.x + box.width * 0.25 },
        { ...points[1], x: box.x + box.width * 0.75 },
      ],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await touch.detach();
  }
  await expect(editor.locator(".draft-connection")).toHaveCount(0);
  const previousYaw = Number(await viewer.getAttribute("data-view-yaw"));
  box = (await panorama.boundingBox())!;
  await page.touchscreen.tap(
    box.x + box.width * 0.75,
    box.y + box.height * 0.6,
  );
  await expect(editor.locator(".draft-connection")).toHaveCount(1);
  await expect(editor.locator(".tour-connectivity")).not.toContainText(
    "Sin camino desde",
  );
  await expect(editor.locator(".tour-connectivity")).toContainText(
    "Sin camino de regreso",
  );
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  const captured = (await rows(page))[0];
  expect(
    Math.abs(captured.content.scenes[0].hotspots[0].yaw - previousYaw),
  ).toBeGreaterThan(0.05);
  await visual
    .getByRole("combobox", { name: "Escena que estás editando", exact: true })
    .selectOption(captured.content.scenes[1].id);
  await expect(viewer).toHaveAttribute("data-view-yaw", "0");
  await visual
    .getByRole("button", { name: "Mirar a la izquierda", exact: true })
    .click();
  await visual
    .getByRole("button", {
      name: "Colocar flecha en el centro de la vista",
      exact: true,
    })
    .click();
  await expect(editor.locator(".tour-connectivity")).toHaveCount(0);
  const yaw = Number(await viewer.getAttribute("data-view-yaw"));
  await visual
    .getByRole("button", { name: "Usar esta vista al entrar", exact: true })
    .click();
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  expect((await rows(page))[0].content.scenes[1].initialView.yaw).toBeCloseTo(
    yaw,
    3,
  );
  await editor
    .getByRole("button", { name: "Empezar recorrido en escena 2", exact: true })
    .click();
  await expect
    .poll(async () => (await rows(page))[0].content.scenes[0].id)
    .toBe(captured.content.scenes[1].id);
  await expect(page.locator(".capture-save-state")).toHaveAttribute(
    "data-save-state",
    "device",
  );
  await visual.screenshot({
    path: test.info().outputPath("visual-tour-ipad.png"),
  });
  await editor
    .getByRole("button", { name: "Cerrar editor visual", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Abrir vista previa 360", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await editor.locator(".viewer-shell").getAttribute("data-view-yaw"),
      ),
    )
    .toBeCloseTo(yaw, 3);
  await expect(editor.locator(".viewer-badge")).toHaveText("Escena 2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Abrir vista previa 360", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await editor.locator(".viewer-shell").getAttribute("data-view-yaw"),
      ),
    )
    .toBeCloseTo(yaw, 3);
  await editor
    .getByRole("button", { name: "Cerrar vista previa 360", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await editor
    .getByRole("button", { name: "Visually edit scene 1", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Use this view on entry", exact: true }),
  ).toBeVisible();
});
test("restoring in private stays local until save; entry direction survives server validation and explicit publication", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await login(page);
  const before = (await (await page.request.get("/api/private/drafts")).json())
    .drafts;
  let uploads = 0;
  page.on("request", (r) => {
    if (r.method() === "PUT" && r.url().endsWith("/api/private/drafts"))
      uploads++;
  });
  await selectBackup(page, await fixture());
  await restore(page);
  expect(uploads).toBe(0);
  expect(
    (await (await page.request.get("/api/private/drafts")).json()).drafts,
  ).toHaveLength(before.length);
  await page
    .getByRole("button", { name: "Continuar captura", exact: true })
    .click();
  const title = `Respaldo privado ficticio ${randomUUID().slice(0, 6)}`;
  await fill(page, title);
  await page
    .getByRole("checkbox", {
      name: "Revisé la ubicación y autorizo la precisión pública seleccionada.",
      exact: true,
    })
    .check();
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
  expect(dto.scenes[0].initialView.yaw).toBe(0.4);
  expect(dto.sharedRevision).toBe(1);
  const jpeg = await readFile("public/panoramas/sala.jpg"),
    invalid = {
      ...dto,
      scenes: dto.scenes.map((s: object, i: number) =>
        i ? s : { ...s, initialView: { yaw: 0, pitch: 0, fov: 9 } },
      ),
    };
  const multipart: Record<string, any> = {
    draft: JSON.stringify(invalid),
    revision: String(dto.sharedRevision),
  };
  for (const photo of dto.photos)
    multipart[`photo:${photo.id}`] = {
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: jpeg,
    };
  for (const scene of dto.scenes)
    multipart[`scene:${scene.id}`] = {
      name: "scene.jpg",
      mimeType: "image/jpeg",
      buffer: jpeg,
    };
  expect(
    (
      await page.request.put("/api/private/drafts", {
        headers: { Origin: ORIGIN },
        multipart,
      })
    ).status(),
  ).toBe(400);
  await page.reload();
  const card = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await card
    .getByRole("button", { name: "Editar borrador", exact: true })
    .click();
  await page
    .locator(".draft-tour-editor")
    .getByRole("button", { name: "Abrir vista previa 360", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .locator(".draft-tour-editor .viewer-shell")
          .getAttribute("data-view-yaw"),
      ),
    )
    .toBeCloseTo(0.4, 3);
  await page
    .locator(".draft-tour-editor")
    .getByRole("button", { name: "Cerrar vista previa 360", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await card
    .getByRole("button", { name: "Publicar propiedad", exact: true })
    .click();
  await confirmReviewedPublication(page);
  const link = card.getByRole("link", { name: "Ver publicación", exact: true });
  await expect(link).toBeVisible();
  const outsider = await browser.newContext({ serviceWorkers: "block" });
  try {
    const publicPage = await outsider.newPage();
    await publicPage.goto(`${ORIGIN}${await link.getAttribute("href")}`);
    await expect(publicPage.locator(".viewer-shell")).toBeVisible();
    await expect
      .poll(async () =>
        Number(
          await publicPage
            .locator(".viewer-shell")
            .getAttribute("data-view-yaw"),
        ),
      )
      .toBeCloseTo(0.4, 3);
    expect(
      (await outsider.request.get(`/api/private/drafts/${dto.id}`)).status(),
    ).toBe(401);
  } finally {
    await outsider.close();
    await page.request.post(`/api/private/publication/${dto.id}`, {
      headers: { Origin: ORIGIN },
      data: { revision: dto.sharedRevision, publish: false },
    });
  }
});
