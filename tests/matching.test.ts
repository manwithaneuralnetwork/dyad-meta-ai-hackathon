import { describe, expect, it } from "vitest";
import { DEMO_ACTIVITIES } from "@/lib/demo-data";
import { buildLocalInterestProfile, rankActivities, scoreActivity } from "@/lib/matching";
import type { OnboardingAnswers } from "@/lib/types";

const baseAnswers: OnboardingAnswers = {
  interests: ["live-music", "arts-culture", "food-drink", "learning", "thrifting"],
  freeText: "Small jazz shows, museums, and beginner art classes",
  availability: ["weekday-evening", "weekend-afternoon"],
  neighborhood: "North Park",
  travelRadiusMiles: 10,
  priceBand: "moderate",
  groupSize: "small",
  socialEnergy: "medium",
  noiseTolerance: "medium",
  setting: "either",
  accessibilityRequirements: [],
  explorationWeight: 0.3
};

describe("interest profile", () => {
  it("uses explicit choices as the strongest weights", () => {
    const profile = buildLocalInterestProfile(baseAnswers);
    expect(profile.categoryWeights["live-music"]).toBe(1);
    expect(profile.categoryWeights.sports).toBeLessThan(0.2);
    expect(profile.preferredGroupSize).toEqual({ min: 3, max: 6 });
  });

  it("adds weight only for clear free-text evidence", () => {
    const profile = buildLocalInterestProfile({ ...baseAnswers, interests: ["sports", "games", "wellness", "community", "volunteering"], freeText: "I would love a quiet museum or gallery" });
    expect(profile.categoryWeights["arts-culture"]).toBeGreaterThanOrEqual(0.85);
  });
});

describe("activity ranking", () => {
  it("prioritizes shared interests without popularity input", () => {
    const profile = buildLocalInterestProfile(baseAnswers);
    const ranking = rankActivities(profile, DEMO_ACTIVITIES);
    expect(ranking[0].score).toBeGreaterThan(ranking.at(-1)!.score);
    expect(ranking.slice(0, 3).some((item) => item.activity.id === "jazz-waterfront" || item.activity.id === "museum-after-dark")).toBe(true);
  });

  it("applies hard travel-radius filters", () => {
    const profile = buildLocalInterestProfile({ ...baseAnswers, travelRadiusMiles: 2 });
    const ranking = rankActivities(profile, DEMO_ACTIVITIES);
    expect(ranking.every((item) => item.activity.distanceMiles <= 2)).toBe(true);
  });

  it("changes the feed when onboarding changes", () => {
    const arts = buildLocalInterestProfile(baseAnswers);
    const sports = buildLocalInterestProfile({ ...baseAnswers, interests: ["sports", "outdoors", "wellness", "games", "community"], freeText: "baseball and outdoor games", priceBand: "flexible" });
    const event = DEMO_ACTIVITIES.find((item) => item.id === "padres-watch")!;
    expect(scoreActivity(sports, event).score).toBeGreaterThan(scoreActivity(arts, event).score);
  });

  it("limits repeated primary categories near the top", () => {
    const profile = buildLocalInterestProfile({ ...baseAnswers, priceBand: "flexible", travelRadiusMiles: 25 });
    const ranking = rankActivities(profile, DEMO_ACTIVITIES);
    const firstSix = ranking.slice(0, 6).map((item) => item.activity.semantic.categories[0].category);
    for (const category of new Set(firstSix)) expect(firstSix.filter((item) => item === category).length).toBeLessThanOrEqual(2);
  });
});
