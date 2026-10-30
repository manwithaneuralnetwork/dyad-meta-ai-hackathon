import { describe, expect, it } from "vitest";
import { buildActivityDedupeKey, heuristicInterestTags, normalizeInterestTags } from "@/lib/interest-tags";

describe("activity interest intelligence", () => {
  it("normalizes core tags and removes duplicates", () => {
    expect(normalizeInterestTags([" live music ", "Live music", "guided tours"])).toEqual(["Live music", "Guided tours"]);
  });

  it("falls back to useful deterministic tags", () => {
    expect(heuristicInterestTags("Outdoor jazz concert and food tasting in the park")).toEqual(expect.arrayContaining(["Live music", "Outdoors", "Food & drink"]));
  });

  it("deduplicates equivalent title, time, and city combinations", () => {
    const first = buildActivityDedupeKey({ title: "Jazz: After Hours!", startsAt: "2026-11-07T19:30:45-08:00", neighborhood: "San Diego" });
    const second = buildActivityDedupeKey({ title: "Jazz After Hours", startsAt: "2026-11-08T03:30:02Z", neighborhood: "San Diego" });
    expect(first).toBe(second);
  });
});
