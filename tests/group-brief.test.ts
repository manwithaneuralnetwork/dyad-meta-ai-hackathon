import { describe, expect, it } from "vitest";
import { buildFallbackGroupBrief, groupBriefSchema } from "@/lib/group-brief";

describe("group meetup brief fallback", () => {
  it("returns a valid, grounded brief with the activity and venue", () => {
    const brief = buildFallbackGroupBrief({
      title: "Jazz in the Courtyard",
      description: "An outdoor jazz performance.",
      venue: "Marina Park",
      address: "222 Marina Park Way · San Diego",
      startsAt: "2026-11-06T19:30:00-08:00",
      endsAt: null,
      topics: ["Live music", "Jazz"],
    });

    expect(groupBriefSchema.parse(brief)).toEqual(brief);
    expect(brief.arrival).toContain("Marina Park");
    expect(brief.opener).toContain("Jazz in the Courtyard");
  });

  it("uses the address when no venue name is available", () => {
    const brief = buildFallbackGroupBrief({
      title: "Neighborhood Walk",
      description: "A guided walk.",
      venue: "",
      address: "9500 Gilman Dr. · San Diego",
      startsAt: "2026-11-08T10:00:00-08:00",
      endsAt: null,
      topics: ["City walks"],
    });

    expect(brief.arrival).toContain("9500 Gilman Dr.");
  });
});
