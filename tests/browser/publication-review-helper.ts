import { expect, type Page } from "@playwright/test";
/** Continue the owner review; callers control acceptance/dismissal of the final native confirmation. */
export async function confirmReviewedPublication(page: Page) {
  const review = page.getByRole("dialog", {
    name: "Revisar antes de publicar",
    exact: true,
  });
  await expect(review).toBeVisible();
  await review
    .getByRole("checkbox", {
      name: "Revisé la ficha, sus medios y los campos por confirmar; autorizo publicar esta versión guardada.",
      exact: true,
    })
    .check();
  await review
    .getByRole("button", { name: "Confirmar publicación", exact: true })
    .click();
}
