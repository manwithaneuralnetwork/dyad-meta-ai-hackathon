import { expect, test } from "@playwright/test";
import { CORE_INTEREST_TAGS } from "../../lib/interest-tags";

test("demo onboarding reaches Discovery without creating an account", async ({ page }) => {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
  await page.route("**/rest/v1/interest_tags**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CORE_INTEREST_TAGS.map((label) => ({ label, is_core: true }))) }));
  await page.route("**/rest/v1/activities**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{
      id: "00000000-0000-4000-8000-000000000101",
      title: "San Diego Jazz Night",
      description: "An official live jazz listing used by the offline browser test.",
      venue_name: "Balboa Park",
      address: "1549 El Prado",
      city: "San Diego",
      starts_at: startsAt,
      ends_at: endsAt,
      price_label: "$15",
      topics: ["Live music"],
      image_url: null,
      source_name: "Ticketmaster",
      source_type: "ticketmaster",
      source_url: "https://example.test/activity",
      external_id: "offline-fixture",
      dedupe_key: "offline-fixture",
      status: "published",
      created_at: "2026-10-31T00:00:00.000Z",
      updated_at: "2026-10-31T00:00:00.000Z",
    }]),
  }));
  await page.goto("/signup");
  await page.getByRole("link", { name: "Continue as demo" }).click();
  await expect(page.getByRole("heading", { name: "What are you into?" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search interests" }).fill("Live music");
  await expect(page.getByRole("button", { name: "Live music", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search interests" }).fill("");
  await page.getByRole("button", { name: "Live music", exact: true }).click();

  for (const interest of ["Coffee", "City walks", "Museums", "Trying new food"]) {
    await page.getByRole("button", { name: interest }).click();
  }

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What should people call you?" })).toBeVisible();
  await page.getByRole("textbox", { name: "Preferred full name" }).fill("Demo Sam");
  await page.getByRole("spinbutton", { name: "Age" }).fill("28");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Where should we look?" })).toBeVisible();
  await page.getByRole("textbox", { name: "Enter a San Diego street address" }).fill("123 Main St, San Diego, CA");
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
  const liveMusicFilter = page.getByRole("button", { name: "Live music", exact: true });
  await liveMusicFilter.click();
  await expect(liveMusicFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Nearby activities" }).locator("article").first()).toBeVisible();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("dyad-app-mode"))).toBe("demo");
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("dyad-profile") ?? "{}").age)).toBe(28);

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

  await page.getByRole("link", { name: "Chats" }).click();
  await expect(page.getByRole("heading", { name: "No conversations yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Discovery" })).toHaveAttribute("href", "/feed");
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
