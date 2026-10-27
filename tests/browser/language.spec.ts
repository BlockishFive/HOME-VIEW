import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import type { ListingDraft } from "../../lib/listing-drafts";

async function language(page: Page, locale: "es" | "en") {
  await page.getByRole("combobox", { name: "Idioma / Language", exact: true }).selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

async function readDrafts(page: Page) {
  return page.evaluate(() => new Promise<ListingDraft[]>((resolve, reject) => {
    const open = indexedDB.open("home-view-listing-drafts", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("listings", "readonly");
      const request = transaction.objectStore("listings").getAll();
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }));
}

test("Spanish is the default and an English preference survives navigation and reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator('.site-header a[href="/renta"]')).toHaveText("Renta");
  await language(page, "en");
  await expect(page.locator('.site-header a[href="/renta"]')).toHaveText("Rent");
  await expect(page.locator('.site-header a[href="/venta"]')).toHaveText("Sale");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("home-view-language"))).toBe("en");
  await page.locator('.site-header a[href="/renta"]').click();
  await expect(page).toHaveURL(/\/renta$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Idioma / Language", exact: true })).toHaveValue("en");
  await expect(page.locator('.site-header a[href="/alta#saved-title"]')).toHaveText("My drafts");
  await language(page, "es");
  await expect(page.locator('.site-header a[href="/renta"]')).toHaveText("Renta");
});

test("English rental and sale views keep their own conditions and Mexican currency", async ({ page }) => {
  await page.goto("/renta");
  await language(page, "en");
  await expect(page.locator(".selected-property")).toContainText("Monthly rent");
  await expect(page.locator("main")).not.toContainText(/predial|property tax/i);
  await page.locator(".property-card").click();
  await expect(page.locator(".cost-card")).toContainText("Monthly rent");
  await expect(page.locator(".cost-card")).toContainText("Security deposit");
  await expect(page.locator(".cost-card")).toContainText("MXN");
  await expect(page.locator(".cost-card")).not.toContainText(/USD|property tax/i);
  await expect(page.locator(".cost-card")).not.toContainText(/Por confirmar|Mantenimiento mensual/);
  await page.locator('.site-header a[href="/venta"]').click();
  await page.locator(".property-card").first().click();
  await expect(page.locator(".cost-card")).toContainText("Purchase price");
  await expect(page.locator(".cost-card")).toContainText(/annual property tax/i);
  await expect(page.locator(".cost-card")).not.toContainText(/Security deposit|Guarantor|Minimum lease term/);
});

test("changing language preserves an unsaved form and saves canonical draft data", async ({ page }) => {
  await page.goto("/alta");
  // A title that is also an interface phrase must remain user-owned text.
  const title = "Renta mensual";
  const description = "Descripción escrita por la persona propietaria; debe conservarse sin traducción automática.";
  await page.getByLabel("Título del anuncio", { exact: true }).fill(title);
  await page.getByLabel("Renta mensual (MXN)", { exact: true }).fill("18000");
  await page.getByLabel("Superficie construida (m²)", { exact: true }).fill("125");
  await page.getByLabel("Descripción", { exact: true }).fill(description);
  await page.getByLabel("Colonia / zona", { exact: true }).fill("Marroka ficticia de prueba");
  await page.getByLabel("Seleccionar fotografías", { exact: true }).setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.", exact: true }).check();
  await language(page, "en");
  await expect(page.getByLabel("Deposit (MXN)", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Minimum lease (months)", { exact: true })).toBeVisible();
  await page.getByLabel("Is there a maintenance fee?", { exact: true }).selectOption("yes");
  await expect(page.getByLabel("Monthly maintenance (MXN)", { exact: true })).toBeVisible();
  await expect(page.locator('.listing-form input[name="title"]')).toHaveValue(title);
  await expect(page.locator('.listing-form input[name="rentPrice"]')).toHaveValue("18000");
  await expect(page.locator(".listing-form textarea")).toHaveValue(description);
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await expect(page.locator('.listing-form select').first()).toHaveValue("Renta");
  await expect(page.locator('.listing-form select').first().locator('option[value="Renta"]')).toHaveText("Rent");
  await expect(page.locator('.listing-form button[type="submit"]')).not.toContainText("Guardar");
  await page.locator('.listing-form button[type="submit"]').click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await expect(page.locator(".draft-card h3").first()).toHaveText(title);
  await expect(page.locator(".draft-description")).toHaveText(description);
  const [stored] = await readDrafts(page);
  expect(stored.operation).toBe("Renta");
  expect(stored.propertyType).toBe("Casa");
  expect(stored.title).toBe(title);
  expect(stored.description).toBe(description);
  expect(stored.photos).toHaveLength(1);
  expect(stored.operation === "Renta" && stored.rental.monthlyRent).toBe(18000);
  expect(stored.operation === "Renta" && stored.rental.services.water).toBe("unknown");
  expect(stored).not.toHaveProperty("sale");
  await page.reload();
  await expect(page.locator(".draft-card h3").first()).toHaveText(title);
  await expect(page.locator(".draft-description")).toHaveText(description);
});

test("English validation messages retain accessible focus and avoid Spanish fallback", async ({ page }) => {
  await page.goto("/alta");
  await language(page, "en");
  await page.locator('.listing-form button[type="submit"]').click();
  const errors = page.locator(".listing-form .listing-error");
  await expect(errors).toBeVisible();
  await expect(errors).toContainText(/title/i);
  await expect(errors).not.toContainText(/Escribe|Describe|Añade|Confirma|Revisa/);
  await expect(page.locator('.listing-form input[name="title"]')).toBeFocused();
});

test("language selection still works when browser preference storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() { throw new DOMException("Storage unavailable", "SecurityError"); },
  }));
  await page.goto("/");
  await language(page, "en");
  await expect(page.locator('.site-header a[href="/renta"]')).toHaveText("Rent");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("English installation metadata and the offline notice honor the same language preference", async ({ page, request, context }) => {
  await page.goto("/alta");
  await language(page, "en");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest-en.webmanifest");
  const manifest = await (await request.get("/manifest-en.webmanifest")).json();
  expect(manifest.lang).toBe("en");
  expect(manifest.name).toContain("Local pilot");
  expect(manifest.start_url).toBe("/alta#saved-title");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  try {
    await page.goto("/alta");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: "You need a connection to open this screen.", exact: true })).toBeVisible();
    await expect(page.getByText("Your saved drafts are still in this browser.", { exact: true })).toBeVisible();
    await expect(page).toHaveTitle("Offline · Home View");
    await language(page, "es");
    await expect(page.getByRole("heading", { name: "Necesitas conexión para abrir esta pantalla.", exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
