import { test, expect } from "./fixtures";

test("local 360 scenes keep media separate and support manual links and Marzipano preview", async ({ page }) => {
  await page.goto("/alta");
  const editor = page.locator(".draft-tour-editor");
  await editor.getByRole("checkbox").check();
  await editor.getByLabel("Añadir panoramas 360").setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(editor.getByRole("alert")).toContainText("2:1");
  await expect(editor.locator(".draft-scene-card")).toHaveCount(0);
  await editor.getByLabel("Añadir panoramas 360").setInputFiles([
    "public/panoramas/sala.jpg", "public/panoramas/cocina.jpg",
  ]);
  await expect(editor.locator(".draft-scene-card")).toHaveCount(2);
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(0);
  await editor.getByRole("button", { name: "Añadir conexión desde escena 1", exact: true }).click();
  await editor.getByLabel("Ángulo horizontal 1.1 (°)").fill("45");
  await editor.getByRole("button", { name: "Abrir vista previa 360", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Acercar", exact: true })).toBeEnabled({ timeout: 30000 });
  await editor.getByRole("button", { name: "Acercar", exact: true }).click();
  // Viewer controls are embedded in the form and must not submit it.
  await expect(page.locator("#error-title")).toHaveCount(0);
  await expect(editor.locator(".viewer-demo")).toHaveText("VISTA PREVIA LOCAL · NO PUBLICADA");
  await editor.getByRole("button", { name: "Ir a Escena 2", exact: true }).click();
  await expect(editor.locator(".viewer-badge")).toContainText("Escena 2");
  await page.getByLabel("Título del anuncio").fill("Casa ficticia con panoramas");
  await page.getByLabel("Renta mensual (MXN)").fill("18000");
  await page.getByLabel("Superficie construida (m²)").fill("120");
  await page.getByLabel("Descripción", { exact: true }).fill("Vivienda ficticia de prueba con imágenes procedurales autorizadas.");
  await page.getByLabel("Colonia / zona").fill("Zona ficticia");
  await page.getByLabel("Seleccionar fotografías").setInputFiles("public/panoramas/sala-cover.jpg");
  await expect(page.locator(".listing-photo-preview img")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "Tomé estas fotos y panoramas o tengo autorización para utilizarlos." }).check();
  await page.getByRole("button", { name: "Guardar borrador en este navegador", exact: true }).click();
  await expect(page.locator(".draft-card")).toHaveCount(1);
  await page.reload();
  const saved = page.locator(".draft-card");
  await expect(saved).toHaveCount(1);
  await expect(saved.locator(".viewer-shell")).toHaveCount(0);
  await saved.getByRole("button", { name: "Ver recorrido 360 del borrador", exact: true }).click();
  await expect(saved.getByRole("button", { name: "Acercar", exact: true })).toBeEnabled({ timeout: 30000 });
  await saved.getByRole("button", { name: "Ir a Escena 2", exact: true }).click();
  await expect(saved.locator(".viewer-badge")).toContainText("Escena 2");
  await saved.getByRole("button", { name: "Cerrar recorrido 360 del borrador", exact: true }).click();
  await saved.getByRole("button", { name: "Editar borrador", exact: true }).click();
  await expect(editor.getByLabel("Ángulo horizontal 1.1 (°)")).toHaveValue("45");
  await editor.getByRole("button", { name: "Abrir vista previa 360", exact: true }).click();
  await editor.getByRole("button", { name: "Eliminar escena 2", exact: true }).click();
  await expect(editor.locator(".draft-scene-card")).toHaveCount(1);
  await expect(editor.locator(".draft-connection")).toHaveCount(0);
  await expect(editor.locator(".viewer-badge")).toContainText("Escena 1");
});
