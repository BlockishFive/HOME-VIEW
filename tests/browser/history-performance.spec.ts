import { test, expect } from "./fixtures";
import type { APIRequestContext, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";
import sharp from "sharp";
const ORIGIN = "http://127.0.0.1:3000",
  PASSWORD = "Fictitious-browser-pilot-2026";
async function login(request: APIRequestContext, origin = ORIGIN) {
  const r = await request.post(origin + "/api/private/login", {
    headers: { Origin: origin },
    data: { username: "pilot", password: PASSWORD },
  });
  expect(r.status()).toBe(200);
}
async function fixture(request: APIRequestContext) {
  await login(request);
  const id = randomUUID(),
    photo = randomUUID(),
    scene = randomUUID(),
    title = "Historial ficticio " + id.slice(0, 6);
  const data = {
    id,
    title,
    description:
      "Casa ficticia autorizada para verificar historial y recuperación.",
    operation: "Venta",
    sale: { purchasePrice: 2000000, annualTax: null },
    propertyType: "Casa",
    area: 120,
    beds: null,
    baths: null,
    locationReviewed: true,
    publicLocation: "approximate",
    city: "León",
    state: "Guanajuato",
    neighborhood: "Zona ficticia",
    latitude: 21.12,
    longitude: -101.68,
    maintenance: { status: "unknown", amount: null, included: "unknown" },
    community: "unknown",
    imageRights: true,
    photos: [{ id: photo, name: "photo.jpg" }],
    scenes: [
      {
        id: scene,
        name: "Sala ficticia",
        hotspots: [],
        initialView: { yaw: 0.2, pitch: 0.1, fov: 1.2 },
      },
    ],
    createdAt: new Date().toISOString(),
  };
  const photoBytes = await readFile("public/panoramas/sala-cover.jpg"),
    panorama = await readFile("public/panoramas/sala.jpg");
  async function save(revision: number, titleOverride = title) {
    const result = await request.put(ORIGIN + "/api/private/drafts", {
      headers: { Origin: ORIGIN },
      multipart: {
        draft: JSON.stringify({ ...data, title: titleOverride }),
        revision: String(revision),
        [`photo:${photo}`]: {
          name: "photo.jpg",
          mimeType: "image/jpeg",
          buffer: photoBytes,
        },
        [`scene:${scene}`]: {
          name: "sphere.jpg",
          mimeType: "image/jpeg",
          buffer: panorama,
        },
      },
    });
    expect(result.status()).toBe(200);
    return (await result.json()).draft;
  }
  await save(0);
  return { id, photo, scene, title, save };
}
async function publication(
  request: APIRequestContext,
  id: string,
  revision: number,
  publish: boolean,
) {
  expect(
    (
      await request.post(`/api/private/publication/${id}`, {
        headers: { Origin: ORIGIN },
        data: { revision, publish },
      })
    ).status(),
  ).toBe(200);
}
async function current(request: APIRequestContext, id: string) {
  return (await (await request.get(`/api/private/drafts/${id}`)).json()).draft;
}
test.use({
  serviceWorkers: "block",
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
});
test("history stays private, validates revisions and rejects foreign-origin recovery", async ({
  request,
}) => {
  const id = randomUUID(),
    asset = randomUUID();
  for (const path of [
    "history",
    "activity",
    `history/${id}`,
    `history/${id}/1`,
    `history/${id}/1/media/${asset}`,
  ])
    expect((await request.get(`/api/private/${path}`)).status()).toBe(401);
  await login(request);
  expect(
    (await request.get("/api/private/history")).headers()["cache-control"],
  ).toContain("no-store");
  expect((await request.get("/api/private/activity?before=1.2")).status()).toBe(
    400,
  );
  expect(
    (await request.get(`/api/private/history/${id}/9007199254740993`)).status(),
  ).toBe(400);
  expect((await request.get(`/api/private/history/${id}/1`)).status()).toBe(
    404,
  );
  expect(
    (
      await request.post(`/api/private/history/${id}/restore`, {
        headers: { Origin: "https://other.example" },
        data: { sourceRevision: 1, expectedRevision: 1, deleted: false },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(`/api/private/history/${id}/restore`, {
        headers: { Origin: ORIGIN },
        data: { sourceRevision: 1, expectedRevision: 1, deleted: "false" },
      })
    ).status(),
  ).toBe(400);
});
test("iPad history previews immutable media, restores a draft without changing the capture/publication, and purges deleted history", async ({
  page,
}) => {
  test.setTimeout(90000);
  const item = await fixture(page.request);
  await publication(page.request, item.id, 1, true);
  await item.save(1, item.title + " v2");
  await page.goto("/privado");
  await page
    .getByRole("button", { name: "Nueva propiedad", exact: true })
    .click();
  const field = page.getByLabel("Título del anuncio", { exact: true });
  await field.fill("Captura pendiente conservada");
  const history = page.locator(".private-history");
  await history.locator("summary").click();
  await history
    .getByRole("button", { name: new RegExp(item.title + " v2") })
    .click();
  await expect(history.locator(".history-versions li")).toHaveCount(2);
  await history
    .locator(".history-versions li")
    .nth(1)
    .getByRole("button", { name: "Revisar versión", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar antes de publicar",
    exact: true,
  });
  await expect(dialog).toContainText("VERSIÓN HISTÓRICA");
  await expect(
    dialog.getByRole("button", { name: "Confirmar publicación", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Ver ficha previa", exact: true })
    .click();
  await expect
    .poll(() =>
      dialog
        .locator(".property-gallery img")
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await dialog
    .getByRole("button", { name: "Cerrar revisión", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await history
    .locator(".history-versions li")
    .nth(1)
    .getByRole("button", { name: "Restaurar como borrador", exact: true })
    .click();
  await expect(history.locator(".listing-success")).toContainText("restaurada");
  await expect(field).toHaveValue("Captura pendiente conservada");
  const restored = await current(page.request, item.id);
  expect(restored.sharedRevision).toBe(3);
  expect(restored.publishedRevision).toBe(1);
  expect(restored.imageRights).toBe(false);
  expect(restored.locationReviewed).toBe(false);
  expect(
    (
      await page.request.post(`/api/private/history/${item.id}/restore`, {
        headers: { Origin: ORIGIN },
        data: { sourceRevision: 2, expectedRevision: 2, deleted: false },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.delete(`/api/private/drafts/${item.id}?revision=3`, {
        headers: { Origin: ORIGIN },
      })
    ).status(),
  ).toBe(200);
  await history
    .getByRole("button", {
      name: "Actualizar historial y actividad",
      exact: true,
    })
    .click();
  await history
    .getByRole("button", { name: new RegExp(item.title + " · Eliminado") })
    .click();
  page.once("dialog", (d) => d.accept());
  await history
    .locator(".history-versions li")
    .first()
    .getByRole("button", { name: "Restaurar como borrador", exact: true })
    .click();
  await expect(history.locator(".listing-success")).toContainText("restaurada");
  expect((await current(page.request, item.id)).sharedRevision).toBe(4);
  expect((await current(page.request, item.id)).publishedRevision).toBeNull();
  await page.request.delete(`/api/private/drafts/${item.id}?revision=4`, {
    headers: { Origin: ORIGIN },
  });
  await history
    .getByRole("button", {
      name: "Actualizar historial y actividad",
      exact: true,
    })
    .click();
  await history
    .getByRole("button", { name: new RegExp(item.title + " · Eliminado") })
    .click();
  page.once("dialog", (d) => d.accept());
  await history
    .getByRole("button", {
      name: "Eliminar historial definitivamente",
      exact: true,
    })
    .click();
  await expect(history.locator(".listing-success")).toContainText(
    "Historial eliminado",
  );
  expect(
    (
      await page.request.get(
        `/api/private/history/${item.id}/1/media/${item.photo}`,
      )
    ).status(),
  ).toBe(404);
  await page
    .getByRole("combobox", { name: "Idioma / Language" })
    .selectOption("en");
  await expect(history.locator("summary")).toHaveText("History and activity");
  await expect(history).toContainText("Version restored");
  expect(await history.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await history.screenshot({
    path: test.info().outputPath("history-ipad.png"),
  });
});
test("full-server backup starts in an isolated HTTP environment with snapshots, media, history and revoked old sessions", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const item = await fixture(page.request);
  await publication(page.request, item.id, 1, true);
  await item.save(1, item.title + " privado nuevo");
  const oldState = await page.context().storageState();
  const directory = await mkdtemp(join(tmpdir(), "home-view-http-restore-")),
    file = join(directory, "backup.sqlite"),
    destination = join(directory, "restored");
  const execute = promisify(execFile);
  let server: ReturnType<typeof spawn> | undefined;
  try {
    const env = {
      ...process.env,
      HOME_VIEW_DATA_DIR: process.env.HOME_VIEW_TEST_DATA_DIR,
    };
    await execute(
      process.execPath,
      ["--import", "tsx", "scripts/backup-private.ts", file],
      { env },
    );
    await execute(
      process.execPath,
      ["--import", "tsx", "scripts/restore-private.ts", file, destination],
      { env },
    );
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const port = (probe.address() as { port: number }).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          HOME_VIEW_DATA_DIR: destination,
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: "ignore",
      },
    );
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(origin + "/api/private/session")).status;
          } catch {
            return 0;
          }
        },
        { timeout: 30000 },
      )
      .toBe(200);
    const context = await browser.newContext({
      storageState: oldState,
      baseURL: origin,
    });
    try {
      expect((await context.request.get("/api/private/drafts")).status()).toBe(
        401,
      );
      await login(context.request, origin);
      const draft = (
        await (
          await context.request.get(`/api/private/drafts/${item.id}`)
        ).json()
      ).draft;
      expect(draft.title).toBe(item.title + " privado nuevo");
      expect(draft.sharedRevision).toBe(2);
      expect(draft.publishedRevision).toBe(1);
      expect((await context.request.get(draft.scenes[0].url)).status()).toBe(
        200,
      );
      const publicPage = await context.request.get(
        `/propiedades/anuncio-${item.id}`,
      );
      expect(publicPage.status()).toBe(200);
      expect(await publicPage.text()).toContain(item.title);
      expect(await publicPage.text()).not.toContain(
        item.title + " privado nuevo",
      );
      const originalImage = await page.request.get(
          `/api/public/media/${item.id}/${item.photo}`,
        ),
        copiedImage = await context.request.get(
          `/api/public/media/${item.id}/${item.photo}`,
        );
      expect(await copiedImage.body()).toEqual(await originalImage.body());
      const history = await (
        await context.request.get(`/api/private/history/${item.id}`)
      ).json();
      expect(history.versions).toHaveLength(2);
      const activity = await (
        await context.request.get("/api/private/activity")
      ).json();
      expect(
        activity.events.some((e: any) => e.action === "server.restored"),
      ).toBe(true);
      // Original sessions and source data are unaffected by isolated restore.
      expect(
        (await page.request.get(`/api/private/drafts/${item.id}`)).status(),
      ).toBe(200);
    } finally {
      await context.close();
    }
  } finally {
    server?.kill("SIGTERM");
    if (server)
      await new Promise<void>((resolve) => {
        if (server!.exitCode !== null) resolve();
        else server!.once("exit", () => resolve());
      });
    await publication(page.request, item.id, 2, false);
    await rm(directory, { recursive: true, force: true });
  }
});
test("camera-sized media is reduced sequentially, strips metadata and rejects oversized headers before decoding", async ({
  page,
}) => {
  test.setTimeout(120000);
  const synthetic = (width: number, height: number) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><pattern id="p" width="120" height="80" patternUnits="userSpaceOnUse"><rect width="120" height="80" fill="#376478"/><circle cx="30" cy="40" r="24" fill="#d8ba62"/><path d="M70 0L120 80H70Z" fill="#577544"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`,
    );
  const photo = await sharp(synthetic(6000, 4000))
    .withMetadata({ orientation: 6 })
    .jpeg({ quality: 80 })
    .toBuffer();
  const sphere = await sharp(synthetic(8192, 4096))
    .jpeg({ quality: 80 })
    .toBuffer();
  await page.goto("/alta");
  await page.evaluate(() => {
    const state = {
      active: 0,
      maxActive: 0,
      decodes: 0,
      outputs: [] as { width: number; height: number; bytes: number }[],
      ticks: 0,
      maxGap: 0,
    };
    (window as any).mediaBenchmark = state;
    let previous = performance.now();
    setInterval(() => {
      const now = performance.now();
      state.maxGap = Math.max(state.maxGap, now - previous);
      previous = now;
      state.ticks++;
    }, 50);
    const bitmap = window.createImageBitmap.bind(window);
    window.createImageBitmap = (async (...args: any[]) => {
      state.active++;
      state.decodes++;
      state.maxActive = Math.max(state.maxActive, state.active);
      try {
        return await (bitmap as any)(...args);
      } finally {
        state.active--;
      }
    }) as any;
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      const width = this.width,
        height = this.height;
      return encode.call(
        this,
        (blob) => {
          if (blob && type === "image/jpeg")
            state.outputs.push({ width, height, bytes: blob.size });
          callback(blob);
        },
        type,
        quality,
      );
    };
  });
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles([
      { name: "synthetic-camera.jpg", mimeType: "image/jpeg", buffer: photo },
      { name: "synthetic-camera-2.jpg", mimeType: "image/jpeg", buffer: photo },
    ]);
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(2);
  const editor = page.locator(".draft-tour-editor");
  await editor.getByRole("checkbox").check();
  const started = Date.now();
  await editor
    .getByLabel("Añadir panoramas 360", { exact: true })
    .setInputFiles(
      Array.from({ length: 7 }, (_, i) => ({
        name: `sphere-8k-${i}.jpg`,
        mimeType: "image/jpeg",
        buffer: sphere,
      })),
    );
  await expect(editor.locator(".draft-scene-card")).toHaveCount(7);
  await editor
    .getByLabel("Tamaño para nuevos panoramas", { exact: true })
    .selectOption("4096");
  await editor
    .getByLabel("Añadir panoramas 360", { exact: true })
    .setInputFiles({
      name: "sphere-detail.jpg",
      mimeType: "image/jpeg",
      buffer: sphere,
    });
  await expect(editor.locator(".draft-scene-card")).toHaveCount(8);
  const preparationMs = Date.now() - started;
  const stats = await page.evaluate(() => (window as any).mediaBenchmark);
  expect(stats.maxActive).toBe(1);
  expect(stats.outputs[0].width).toBe(1280);
  expect(stats.outputs[0].height).toBe(1920);
  expect(stats.outputs[2].width).toBe(3072);
  expect(stats.outputs[2].height).toBe(1536);
  expect(stats.outputs[9].width).toBe(4096);
  expect(stats.outputs[9].height).toBe(2048);
  await editor
    .getByRole("button", { name: "Abrir vista previa 360", exact: true })
    .click();
  const viewer = editor.locator(".draft-tour-preview");
  const views = [];
  for (let n = 0; n < 8; n++) {
    const viewStarted = Date.now();
    const previous = n
      ? await viewer.locator(".viewer-shell canvas").elementHandle()
      : null;
    await viewer.locator(".draft-scene-tabs button").nth(n).click();
    if (previous) {
      await expect
        .poll(() => previous.evaluate((node) => node.isConnected))
        .toBe(false);
      await previous.dispose();
    }
    await expect(viewer.locator(".viewer-shell canvas")).toHaveCount(1);
    await expect(
      viewer.getByRole("button", { name: "Acercar", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    views.push({ scene: n + 1, milliseconds: Date.now() - viewStarted });
  }
  await editor
    .getByRole("button", { name: "Cerrar vista previa 360", exact: true })
    .click();
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Ensayo sintético de cámara conservado");
  const huge = Buffer.alloc(24);
  huge.set([137, 80, 78, 71, 13, 10, 26, 10]);
  huge.writeUInt32BE(13, 8);
  huge.write("IHDR", 12);
  huge.writeUInt32BE(20000, 16);
  huge.writeUInt32BE(10000, 20);
  const before = await page.evaluate(
    () => (window as any).mediaBenchmark.decodes,
  );
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles({
      name: "oversized-header.png",
      mimeType: "image/png",
      buffer: huge,
    });
  await expect(page.locator("#error-photos")).toContainText("60 millones");
  expect(
    await page.evaluate(() => (window as any).mediaBenchmark.decodes),
  ).toBe(before);
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar captura actual", exact: true })
    .click();
  const backupFile = test.info().outputPath("camera-backup.json");
  await (await download).saveAs(backupFile);
  const backup = JSON.parse(await readFile(backupFile, "utf8"));
  for (const asset of [...backup.content.photos, ...backup.content.scenes]) {
    const info = await sharp(
      Buffer.from(asset.dataUrl.split(",")[1], "base64"),
    ).metadata();
    expect(info.exif).toBeUndefined();
    expect(info.xmp).toBeUndefined();
  }
  await writeFile(
    test.info().outputPath("media-benchmark.json"),
    JSON.stringify(
      {
        environment:
          "Automated Chromium, synthetic media, iPad-sized viewport; not physical Safari",
        sourcePhoto: {
          width: 6000,
          height: 4000,
          orientation: 6,
          bytes: photo.length,
        },
        sourcePanorama: { width: 8192, height: 4096, bytes: sphere.length },
        preparationMs,
        views,
        ...stats,
      },
      null,
      2,
    ),
  );
});
test("a scene uses one panorama HTTP fetch and retry does not navigate", async ({
  page,
}) => {
  test.setTimeout(90000);
  let requests = 0,
    fail = true,
    navigations = 0;
  await page.route("**/panoramas/sala.jpg", async (route) => {
    requests++;
    if (fail) await route.abort();
    else await route.continue();
  });
  await page.goto("/propiedades/casa-oliva");
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      navigations++;
  });
  await expect(
    page.getByRole("button", { name: "Volver a intentar", exact: true }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Volver a intentar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  expect(requests).toBe(2);
  expect(navigations).toBe(0);
});
test("image preparation and panorama validation work through the Image fallback without bitmap support", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    Object.defineProperty(window, "createImageBitmap", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/alta");
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  const editor = page.locator(".draft-tour-editor");
  await editor.getByRole("checkbox").check();
  await editor
    .getByLabel("Añadir panoramas 360", { exact: true })
    .setInputFiles("public/panoramas/sala.jpg");
  await expect(editor.locator(".draft-scene-card")).toHaveCount(1);
  await editor
    .getByRole("button", { name: "Abrir vista previa 360", exact: true })
    .click();
  await expect(
    editor.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .getByLabel("Título del anuncio", { exact: true })
    .fill("Captura con fallback conservada");
  expect(await page.evaluate(() => typeof createImageBitmap)).toBe("undefined");
  await expect(
    page.getByLabel("Título del anuncio", { exact: true }),
  ).toHaveValue("Captura con fallback conservada");
});
