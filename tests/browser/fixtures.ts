import { test as base, expect } from "@playwright/test";
// Deterministic tile transport only. These images do not validate OSM cartographic data
// or external connectivity; the live service check is reported separately.
export const test = base.extend<{ mapTiles: void }>({
  mapTiles: [
    async ({ context }, use) => {
      await context.route("https://tile.openstreetmap.org/**", (route) =>
        route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#6d8060"/></svg>',
        }),
      );
      await use();
    },
    { auto: true },
  ],
});
export { expect };
