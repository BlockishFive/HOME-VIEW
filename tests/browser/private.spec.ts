import { test, expect } from "./fixtures";
import type { Page, APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const ORIGIN = "http://127.0.0.1:3000";
const PASSWORD = "Fictitious-browser-pilot-2026";
async function signIn(page: Page) {
  await page.goto("/privado");
  await page.getByLabel("Usuario privado", { exact: true }).fill("pilot");
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mis borradores privados", exact: true }),
  ).toBeVisible();
  await page.getByRole("button",{name:"Nueva propiedad",exact:true}).click();
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
      "Propiedad ficticia para comprobar almacenamiento entre dos dispositivos.",
    );
  await page
    .getByLabel("Colonia / zona", { exact: true })
    .fill("Zona ficticia");
  await page
    .getByLabel("Seleccionar fotografías", { exact: true })
    .setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page.getByRole("checkbox", {name:"Revisé la ubicación y autorizo la precisión pública seleccionada.",exact:true}).check();
  await page
    .getByRole("checkbox", {
      name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.",
      exact: true,
    })
    .check();
}
async function apiLogin(request: APIRequestContext) {
  const response = await request.post("/api/private/login", {
    headers: { Origin: ORIGIN },
    data: { username: "pilot", password: PASSWORD },
  });
  expect(response.status()).toBe(200);
  return response;
}
test("private APIs require authentication, same-origin writes and non-cacheable media", async ({
  request,
}) => {
  expect((await request.get("/api/private/drafts")).status()).toBe(401);
  expect(
    (
      await request.get(`/api/private/media/${randomUUID()}/${randomUUID()}`)
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/private/login", {
        headers: { Origin: "https://other.example" },
        data: { username: "pilot", password: PASSWORD },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/private/login", {
        headers: { Origin: ORIGIN },
        data: { username: "pilot", password: "wrong" },
      })
    ).status(),
  ).toBe(401);
  const response = await apiLogin(request);
  const cookie = response.headers()["set-cookie"];
  expect(cookie).toContain("HttpOnly");
  expect(cookie.toLowerCase()).toContain("samesite=strict");
  expect(
    (await request.get("/api/private/drafts")).headers()["cache-control"],
  ).toContain("no-store");
  await request.post("/api/private/logout", { headers: { Origin: ORIGIN } });
  expect((await request.get("/api/private/drafts")).status()).toBe(401);
});
test("an iPad capture with 360 media opens on a second device and remains outside the public catalog", async ({
  browser,
  page,
}) => {
  test.setTimeout(60000);
  const title = `Casa privada ficticia ${randomUUID().slice(0, 8)}`;
  await page.setViewportSize({ width: 820, height: 1180 });
  await signIn(page);
  await fill(page, title);
  const editor = page.locator(".draft-tour-editor");
  await editor.getByRole("checkbox").check();
  await editor
    .getByLabel("Añadir panoramas 360")
    .setInputFiles("public/panoramas/sala.jpg");
  await expect(editor.locator(".draft-scene-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Guardar borrador privado", exact: true })
    .click();
  await expect(
    page.locator(".draft-save-feedback .listing-success"),
  ).toContainText("servidor privado");
  const second = await browser.newContext({viewport:{width:1440,height:1000}});
  const pc = await second.newPage();
  await signIn(pc);
  expect(await pc.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const card = pc
    .locator(".draft-card")
    .filter({ has: pc.getByRole("heading", { name: title, exact: true }) });
  await expect(card).toBeVisible();
  await card.getByText("Ver detalles y medios",{exact:true}).click();
  await expect(card.locator(".draft-photo-grid img")).toBeVisible();
  await card
    .getByRole("button", {
      name: "Ver recorrido 360 del borrador",
      exact: true,
    })
    .click();
  await expect(
    card.getByRole("button", { name: "Acercar", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const dto = (
    await (await pc.request.get("/api/private/drafts")).json()
  ).drafts.find((d: { title: string }) => d.title === title);
  const media = await pc.request.get(dto.photos[0].url);
  expect(media.status()).toBe(200);
  expect(media.headers()["cache-control"]).toContain("no-store");
  const outsider = await browser.newContext();
  expect(
    (await outsider.request.get(ORIGIN + dto.photos[0].url)).status(),
  ).toBe(401);
  await outsider.close();
  await card.getByRole("button",{name:"Editar borrador",exact:true}).click();
  await pc.getByLabel("Título del anuncio",{exact:true}).fill(title+" actualizada en PC");
  await pc.getByRole("button",{name:"Guardar cambios del borrador",exact:true}).click();
  await expect(pc.locator(".draft-save-feedback .listing-success")).toContainText("servidor privado");
  await page.getByRole("button",{name:"Actualizar lista privada",exact:true}).click();
  await expect(page.locator(".draft-card-heading h3").filter({hasText:title+" actualizada en PC"})).toBeVisible();
  await page.getByRole("button",{name:"Guardar cambios del borrador",exact:true}).click();
  await expect(page.locator(".draft-save-feedback [role=alert]")).toContainText("versión más reciente");
  await expect(page.getByLabel("Título del anuncio",{exact:true})).toHaveValue(title);
  await pc.goto("/");
  await expect(pc.locator("main")).not.toContainText(title);
  await pc.goto("/privado");
  await pc.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(pc.getByLabel("Usuario privado", { exact: true })).toBeVisible();
  expect((await pc.request.get(dto.photos[0].url)).status()).toBe(401);
  await second.close();
});
test("a local iPad draft can be copied explicitly without deleting its local original", async ({
  page,
  browser,
}) => {
  const title = `Copia privada ficticia ${randomUUID().slice(0, 8)}`;
  await page.goto("/alta");
  await fill(page, title);
  await page
    .getByRole("button", {
      name: "Guardar borrador en este navegador",
      exact: true,
    })
    .click();
  const local = page
    .locator(".draft-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(local).toBeVisible();
  await apiLogin(page.request);
  await local
    .getByRole("button", { name: "Copiar al área privada", exact: true })
    .click();
  await expect(local.getByRole("status")).toContainText(
    "El original sigue en este navegador",
  );
  const context = await browser.newContext();
  const other = await context.newPage();
  await signIn(other);
  await expect(
    other
      .locator(".draft-card")
      .filter({
        has: other.getByRole("heading", { name: title, exact: true }),
      }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".draft-card-heading h3")).toHaveText(title);
  await context.close();
});
test("server rejects malformed media and stale updates without replacing the current version", async ({
  request,
}) => {
  await apiLogin(request);
  const id = randomUUID(),
    photo = randomUUID();
  const file = await readFile("public/panoramas/sala-cover.jpg");
  const draft = {
    schemaVersion: 2,
    id,
    createdAt: new Date().toISOString(),
    title: "Propiedad ficticia API privada",
    operation: "Venta",
    propertyType: "Casa",
    sale: { purchasePrice: 3000000, annualTax: null },
    maintenance: { status: "unknown", amount: null, included: "unknown" },
    community: "unknown",
    description:
      "Descripción ficticia suficientemente larga para probar revisión privada.",
    state: "Guanajuato",
    city: "León",
    neighborhood: "Zona ficticia",
    area: 120,
    beds: null,
    baths: null,
    latitude: 21.12,
    longitude: -101.68,
    imageRights: true,
    photos: [{ id: photo, name: "foto.jpg" }],
    scenes: [],
  };
  const upload = (title: string, revision: number, buffer = file) =>
    request.put("/api/private/drafts", {
      headers: { Origin: ORIGIN },
      multipart: {
        draft: JSON.stringify({ ...draft, title }),
        revision: String(revision),
        [`photo:${photo}`]: {
          name: "foto.jpg",
          mimeType: "image/jpeg",
          buffer,
        },
      },
    });
  expect(
    (await upload(draft.title, 0, Buffer.from("not an image"))).status(),
  ).toBe(422);
  expect((await upload(draft.title, 0)).status()).toBe(200);
  expect((await upload("Nueva versión ficticia privada", 1)).status()).toBe(
    200,
  );
  expect(
    (await upload("Versión antigua que no debe reemplazarla", 1)).status(),
  ).toBe(409);
  const stored = (
    await (await request.get("/api/private/drafts")).json()
  ).drafts.find((d: { id: string }) => d.id === id);
  expect(stored.title).toBe("Nueva versión ficticia privada");
  expect(stored.sharedRevision).toBe(2);
  expect(
    (
      await request.delete(`/api/private/drafts/${id}?revision=1`, {
        headers: { Origin: ORIGIN },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.delete(`/api/private/drafts/${id}?revision=2`, {
        headers: { Origin: ORIGIN },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await request.get(`/api/private/media/${id}/${photo}`)).status(),
  ).toBe(404);
});

test("admin publishes a reviewed snapshot, edits privately, republishes and withdraws without losing the draft", async ({page, browser}) => {
  test.setTimeout(90000);
  const title = `Publicación ficticia ${randomUUID().slice(0,8)}`;
  await signIn(page);
  await fill(page, title);
  const tour = page.locator(".draft-tour-editor");
  await tour.getByRole("checkbox").check();
  await tour.getByLabel("Añadir panoramas 360").setInputFiles("public/panoramas/sala.jpg");
  await expect(tour.locator(".draft-scene-card")).toHaveCount(1);
  await page.getByRole("button", {name:"Guardar borrador privado",exact:true}).click();
  await expect(page.locator(".draft-save-feedback .listing-success")).toContainText("servidor privado");
  const card = page.locator(".draft-card").filter({has:page.getByRole("heading",{name:title,exact:true})});
  const outsider = await browser.newContext();
  const publicPage = await outsider.newPage();
  const dto = (await (await page.request.get("/api/private/drafts")).json()).drafts.find((d:{title:string})=>d.title===title);
  const url = `/propiedades/anuncio-${dto.id}`;
  const asset = `/api/public/media/${dto.id}/${dto.photos[0].id}`;
  expect((await publicPage.request.get(asset)).status()).toBe(404);
  expect((await publicPage.request.post(`/api/private/publication/${dto.id}`, {headers:{Origin:ORIGIN},data:{revision:1,publish:true}})).status()).toBe(401);
  page.once("dialog", d => d.dismiss());
  await card.getByRole("button",{name:"Publicar propiedad",exact:true}).click();
  expect((await publicPage.request.get(asset)).status()).toBe(404);
  page.once("dialog", d => d.accept());
  await card.getByRole("button",{name:"Publicar propiedad",exact:true}).click();
  await expect(card.getByRole("link",{name:"Ver publicación",exact:true})).toBeVisible();
  const image = await publicPage.request.get(asset);
  expect(image.status()).toBe(200);
  expect(image.headers()["cache-control"]).toBe("no-store");
  expect((await publicPage.request.get(`/_next/image?url=${encodeURIComponent(asset)}&w=640&q=75`)).status()).toBe(400);
  await publicPage.goto("/renta");
  await expect(publicPage.locator(".property-card").filter({hasText:title})).toBeVisible();
  await publicPage.goto(url);
  await expect(publicPage.getByRole("heading",{name:title,exact:true})).toBeVisible();
  await expect(publicPage.locator(".property-page")).not.toContainText("Datos ficticios");
  await expect(publicPage.locator("#costos")).not.toContainText("Predial");
  await expect(publicPage.locator(".property-gallery img").first()).toBeVisible();
  await expect(publicPage.locator("#recorrido").getByRole("button",{name:"Acercar",exact:true})).toBeEnabled({timeout:30000});
  await expect(publicPage.locator(".floorplan")).toHaveCount(0);
  await expect(publicPage.locator("#recorrido")).not.toContainText("INTERIOR SINTÉTICO");
  await publicPage.getByRole("combobox", {name:"Idioma / Language"}).selectOption("en");
  await expect(publicPage.getByRole("heading", {name:title, exact:true})).toBeVisible();
  await expect(publicPage.locator(".property-heading .eyebrow")).toContainText("PUBLISHED PROPERTY");
  await publicPage.getByRole("combobox", {name:"Idioma / Language"}).selectOption("es");
  expect((await page.request.post(`/api/private/publication/${dto.id}`, {headers:{Origin:"https://other.example"},data:{revision:1,publish:false}})).status()).toBe(403);
  expect((await page.request.post(`/api/private/publication/${dto.id}`, {headers:{Origin:ORIGIN},data:{revision:99,publish:false}})).status()).toBe(409);
  await page.getByLabel("Título del anuncio",{exact:true}).fill(title+" editada");
  await page.getByRole("button",{name:"Guardar cambios del borrador",exact:true}).click();
  await expect(page.locator(".draft-save-feedback .listing-success")).toContainText("servidor privado");
  await publicPage.reload();
  await expect(publicPage.getByRole("heading",{name:title,exact:true})).toBeVisible();
  const updated = page.locator(".draft-card").filter({hasText:title+" editada"});
  await expect(updated).toContainText("Cambios pendientes de publicar");
  page.once("dialog", d=>d.accept());
  await updated.getByRole("button",{name:"Actualizar publicación",exact:true}).click();
  await expect(updated.locator(".draft-status")).toHaveText("Publicado");
  await publicPage.reload();
  await expect(publicPage.getByRole("heading",{name:title+" editada",exact:true})).toBeVisible();
  page.once("dialog", d=>d.accept());
  await updated.getByRole("button",{name:"Retirar publicación",exact:true}).click();
  await expect(updated.locator(".draft-status")).toHaveText("Borrador privado · No publicado");
  expect((await publicPage.request.get(asset)).status()).toBe(404);
  expect((await publicPage.request.get(url)).status()).toBe(404);
  await publicPage.goto("/renta");
  await expect(publicPage.locator(".property-card").filter({hasText:title})).toHaveCount(0);
  await expect(updated).toBeVisible();
  await outsider.close();
});
