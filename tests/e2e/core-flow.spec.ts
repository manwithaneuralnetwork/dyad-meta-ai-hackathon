import { expect, test } from "@playwright/test";

test("demo onboarding reaches Discovery without creating an account", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("link", { name: "Continue as demo" }).click();
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

  const firstActivity = page.getByRole("region", { name: "Nearby activities" }).locator("article").first();
  const firstTitle = await firstActivity.getByRole("heading").innerText();
  await firstActivity.getByRole("button", { name: "Interested" }).click();
  await firstActivity.getByRole("button", { name: `Save ${firstTitle}` }).click();

  await page.getByRole("link", { name: "My Activities" }).click();
  await expect(page.getByRole("heading", { name: "Your groups" })).toBeVisible();
  await expect(page.getByText(firstTitle, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Discovery" }).first()).toHaveAttribute("href", "/feed");

  await page.getByRole("searchbox", { name: "Search your activities" }).fill("no-such-dyad-activity");
  await expect(page.getByText("No interested activities match your search.")).toBeVisible();
  await expect(page.getByText("No saved activities match your search.")).toBeVisible();
});

test("real account forms collect email and password", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("minlength", "8");

  await page.route("**/auth/v1/signup", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Test signup rejected safely" }),
    });
  });
  await page.getByRole("textbox", { name: "Email" }).fill("browser-test@example.com");
  await page.getByLabel("Password").fill("safe-test-password");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByText("Test signup rejected safely", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Log in/ })).toBeVisible();
});
