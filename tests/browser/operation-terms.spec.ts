import { test, expect } from "./fixtures";

test("rental catalog, map panel and property page omit tax and expose rental terms", async ({ page }) => {
  await page.goto("/renta");
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator(".selected-property")).toContainText("Renta mensual");
  await expect(page.locator(".selected-property")).toContainText("Mantenimiento por confirmar");
  await expect(page.locator("main")).not.toContainText(/predial/i);
  await page.getByRole("button", { name: "Tarjetas", exact: false }).click();
  await expect(page.locator(".property-grid .card-cost-summary")).toContainText("$18,500 MXN/mes");
  await expect(page.locator(".property-grid")).not.toContainText(/predial/i);
  await page.locator(".property-card").click();
  await expect(page.locator(".cost-card")).toContainText("Renta mensual");
  for (const label of ["Depósito", "Plazo mínimo", "Aval", "Póliza jurídica", "Mascotas", "Amueblado", "Agua", "Electricidad", "Gas", "Internet"])
    await expect(page.locator(".cost-card dt").filter({ hasText: new RegExp(`^${label}$`) })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/predial/i);
  await expect(page.locator(".cost-card")).toContainText("Por confirmar");
  await expect(page.locator(".cost-card")).not.toContainText("Renta y mantenimiento");
});

test("sale views show purchase price, annual tax and maintenance without rental requirements", async ({ page }) => {
  await page.goto("/venta");
  await expect(page.locator(".selected-property")).toContainText("Predial anual (demo)");
  await page.locator(".property-card").first().click();
  await expect(page.locator(".cost-card")).toContainText("Precio de compra");
  await expect(page.locator(".cost-card")).toContainText("$4,850,000");
  await expect(page.locator(".cost-card")).toContainText("Predial anual estimado");
  await expect(page.locator(".cost-card")).toContainText("$7,800");
  await expect(page.locator(".cost-card")).toContainText("$1,200");
  await expect(page.locator(".cost-card")).not.toContainText(/Depósito|Plazo mínimo|Aval|Póliza jurídica|Mascotas|Amueblado/);
});

test("rental validation summary links focus the corresponding conditions field", async ({ page }) => {
  await page.goto("/alta");
  await page.getByLabel("Depósito (MXN)", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "Guardar borrador en este navegador" }).click();
  await page.getByRole("link", { name: "Usa un monto con hasta dos decimales mayor o igual a cero, o déjalo por confirmar.", exact: true }).click();
  await expect(page.getByLabel("Depósito (MXN)", { exact: true })).toBeFocused();
});
