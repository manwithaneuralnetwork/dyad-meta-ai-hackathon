import { describe, expect, it } from "vitest";
import { buildActivityDedupeKey, heuristicInterestTags, normalizeInterestTags, preferDuplicateCandidate } from "@/lib/interest-tags";

describe("activity interest intelligence", () => {
  it("normalizes core tags and removes duplicates", () => {
    expect(normalizeInterestTags([" live music ", "Live music", "guided tours"])).toEqual(["Live music", "Guided tours"]);
  });

  it("falls back to useful deterministic tags", () => {
    expect(heuristicInterestTags("Outdoor jazz concert and food tasting in the park")).toEqual(expect.arrayContaining(["Live music", "Outdoors", "Food & drink"]));
  });

  it("deduplicates equivalent venue, address, and time combinations", () => {
    const first = buildActivityDedupeKey({ startsAt: "2026-11-07T19:30:45-08:00", venue: "Belly Up Tavern", address: "143 S. Cedros Ave", neighborhood: "Solana Beach" });
    const second = buildActivityDedupeKey({ startsAt: "2026-11-08T03:30:02Z", venue: "Belly Up", address: "143 S Cedros Ave", neighborhood: "Solana Beach" });
    expect(first).toBe(second);
  });

  it("keeps simultaneous activities in distinct rooms separate", () => {
    const first = buildActivityDedupeKey({ startsAt: "2026-11-08T03:30:00Z", venue: "House of Blues San Diego", address: "1055 5th Avenue", neighborhood: "San Diego" });
    const second = buildActivityDedupeKey({ startsAt: "2026-11-08T03:30:00Z", venue: "Voodoo Room at the House of Blues San Diego", address: "1055 5th Avenue", neighborhood: "San Diego" });
    expect(first).not.toBe(second);
  });

  it("prefers an event over a same-slot ticket add-on", () => {
    const event = { title: "EPIK HIGH North American Tour", description: "Live performance" };
    const addOn = { title: "Add on - VIP Upgrade - Not an Event Ticket", description: "Upgrade package with extra details" };
    expect(preferDuplicateCandidate(addOn, event)).toBe(event);
  });
});
