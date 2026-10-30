import { expect, test } from "@playwright/test";

test("demo onboarding reaches Discovery without creating an account", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue as demo" }).click();
  await expect(page.getByRole("heading", { name: "What are you into?" })).toBeVisible();

  for (const interest of ["Live music", "Coffee", "City walks", "Museums", "Trying new food"]) {
    await page.getByRole("button", { name: interest }).click();
  }

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Where should we look?" })).toBeVisible();
  await page.getByRole("textbox", { name: "Enter your street address" }).fill("123 Main St, San Diego, CA");
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("dyad-app-mode"))).toBe("demo");
});

test("real account forms collect email and password", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("minlength", "8");

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Log in/ })).toBeVisible();
});
