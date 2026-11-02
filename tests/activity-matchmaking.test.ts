import { describe, expect, it } from "vitest";
import { fallbackMatchReason, findMatchablePool, rankMatchmakingCandidates, type MatchmakingCandidate } from "@/lib/activity-matchmaking";

const candidates: MatchmakingCandidate[] = [
  { userId: "early", minGroupSize: 3, maxGroupSize: 4, interests: ["Museums"], oneLiner: "", attendedCount: 2, createdAt: "2026-01-01T10:00:00Z" },
  { userId: "music", minGroupSize: 3, maxGroupSize: 5, interests: ["Live music"], oneLiner: "", attendedCount: 4, createdAt: "2026-01-01T10:01:00Z" },
  { userId: "late", minGroupSize: 4, maxGroupSize: 6, interests: ["Live music"], oneLiner: "", attendedCount: 1, createdAt: "2026-01-01T10:02:00Z" },
];

describe("activity matchmaking", () => {
  it("forms the smallest group that satisfies everyone’s range", () => {
    const pool = findMatchablePool("viewer", { min: 3, max: 4 }, candidates);
    expect(pool?.targetSize).toBe(3);
    expect(pool?.candidates.map((candidate) => candidate.userId)).toEqual(["early", "music"]);
  });

  it("does not include people whose preference excludes the target size", () => {
    const pool = findMatchablePool("viewer", { min: 2, max: 2 }, candidates);
    expect(pool).toBeNull();
  });

  it("uses shared interests before queue age for the deterministic fallback", () => {
    const ranked = rankMatchmakingCandidates(["Live music"], candidates);
    expect(ranked.slice(0, 2).map((candidate) => candidate.userId)).toEqual(["music", "late"]);
    expect(fallbackMatchReason(["Live music"], ranked.slice(0, 2))).toContain("Live music");
  });
});
