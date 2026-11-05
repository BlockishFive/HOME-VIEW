import { test, expect } from "./fixtures";

test("PWA exposes install assets and an offline notice without caching user pages", async ({ page, request, context }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/privado");
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.headers()["content-type"]).toContain("image/png");
    const bytes = await asset.body();
    expect([...bytes.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
    const size = Number(icon.sizes.split("x")[0]);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  }
  await page.goto("/alta");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cachedPaths = await page.evaluate(async () => {
    const names = await caches.keys();
    const paths = await Promise.all(names.filter((name) => name.startsWith("home-view-offline-")).map(async (name) => {
      const cache = await caches.open(name);
      return (await cache.keys()).map((entry) => new URL(entry.url).pathname);
    }));
    return paths.flat().sort();
  });
  expect(cachedPaths).toEqual(["/icons/icon-192.png", "/icons/icon-512.png", "/offline.html"]);
  await context.setOffline(true);
  await page.goto("/alta");
  await expect(page.getByRole("heading", { name: "Necesitas conexión para abrir esta pantalla." })).toBeVisible();
  await expect(page.getByText("Los borradores locales siguen en este navegador; los privados permanecen en el servidor.", { exact: false })).toBeVisible();
  await context.setOffline(false);
});
