import { expect, test } from "@playwright/test";

test("onboarding builds a personalized feed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  for (const label of ["Live Music", "Arts Culture", "Food Drink", "Learning", "Thrifting"]) await page.getByRole("button", { name: label }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Weekend afternoons" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Meet your San Diego/ }).click();
  await expect(page.getByText(/Your San Diego/)).toBeVisible();
  await expect(page.getByText("Made for your week")).toBeVisible();
});

test("interested and find company remain distinct", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const state = { activeUserId: "demo-you", onboardingComplete: true, answers: { interests: ["live-music", "arts-culture", "food-drink", "learning", "thrifting"], freeText: "", availability: ["weekend-afternoon"], neighborhood: "North Park", travelRadiusMiles: 15, priceBand: "flexible", groupSize: "small", socialEnergy: "medium", noiseTolerance: "medium", setting: "either", accessibilityRequirements: [], explorationWeight: 0.3 }, interestProfile: { categoryWeights: { "live-music": 1, sports: .08, "arts-culture": 1, "food-drink": 1, outdoors: .08, learning: 1, games: .08, volunteering: .08, nightlife: .08, wellness: .08, thrifting: 1, community: .08 }, vibes: ["social", "creative"], settings: ["indoor", "outdoor"], preferredGroupSize: { min: 3, max: 6 }, noiseTolerance: "medium", priceBand: "flexible", availability: { "weekend-afternoon": true }, travelRadiusMiles: 15, explorationWeight: .3, accessibilityRequirements: [], summary: "Art, music, and good company close to home." }, interests: [], groups: [], messages: [], reconnectVotes: {} };
    localStorage.setItem("dyad-demo-state-v2", JSON.stringify(state));
  });
  await page.reload();
  await page.getByText("Jazz by the Bay").first().click();
  await expect(page.getByRole("button", { name: "Interested" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find company" })).toBeVisible();
});
