import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("storefront cart persists and checkout remains within the viewport", async ({ page }) => {
  await page.goto("/products/noor-ivory-aari-kurta-set");
  await page.getByRole("button", { name: "ADD TO BAG" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("houseofpashm-cart-v1") ?? "[]").length)).toBe(1);
  await page.goto("/");
  await page.getByRole("button", { name: "Shopping bag" }).click();
  await expect(page.getByText("YOUR BAG")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Shopping bag" }).click();
  await expect(page.getByText("YOUR BAG")).toBeVisible();
  await page.getByRole("link", { name: "SECURE CHECKOUT" }).click();
  await expect(page.getByRole("heading", { name: /where should we send it/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("product details expose a selectable variant and accessible add action", async ({ page }) => {
  await page.goto("/products/noor-ivory-aari-kurta-set");
  await expect(page.getByRole("heading", { name: "Noor Ivory Aari Kurta Set" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Choose size and colour" })).toBeVisible();
  const imageTrigger = page.getByRole("button", { name: "Open a larger image of Noor Ivory Aari Kurta Set" });
  await expect(imageTrigger).toHaveCSS("cursor", "zoom-in");
  await imageTrigger.click();
  const viewer = page.getByRole("dialog", { name: "Noor Ivory Aari Kurta Set image viewer" });
  await expect(viewer).toBeVisible();
  const zoomToggle = page.getByRole("button", { name: "Zoom image in" });
  await zoomToggle.click();
  await expect(page.getByRole("button", { name: "Zoom image out" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await page.getByRole("button", { name: "ADD TO BAG" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("houseofpashm-cart-v1") ?? "[]").length)).toBe(1);
});

test("checkout and policy pages have no serious automated accessibility violations", async ({ page }) => {
  for (const path of ["/products/noor-ivory-aari-kurta-set", "/checkout", "/policies/privacy", "/track-order"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), `${path} accessibility violations`).toEqual([]);
  }
});
