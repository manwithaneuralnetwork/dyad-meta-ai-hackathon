export type MatchmakingPreference = { min: number; max: number };

export type MatchmakingCandidate = {
  userId: string;
  minGroupSize: number;
  maxGroupSize: number;
  interests: string[];
  oneLiner: string;
  attendedCount: number;
  createdAt: string;
};

export const MATCHMAKING_PRESETS = [
  { label: "Duo", detail: "2 people", min: 2, max: 2 },
  { label: "Small", detail: "3–4 people", min: 3, max: 4 },
  { label: "Social", detail: "5–6 people", min: 5, max: 6 },
] as const;

export function findMatchablePool(
  viewerId: string,
  preference: MatchmakingPreference,
  candidates: MatchmakingCandidate[],
) {
  for (let targetSize = preference.min; targetSize <= preference.max; targetSize += 1) {
    const compatible = candidates
      .filter((candidate) => candidate.userId !== viewerId)
      .filter((candidate) => candidate.minGroupSize <= targetSize && candidate.maxGroupSize >= targetSize)
      .sort((left, right) => +new Date(left.createdAt) - +new Date(right.createdAt));
    if (compatible.length >= targetSize - 1) return { targetSize, candidates: compatible };
  }
  return null;
}

export function rankMatchmakingCandidates(viewerInterests: string[], candidates: MatchmakingCandidate[]) {
  const viewerTags = new Set(viewerInterests.map(normalize));
  return [...candidates].sort((left, right) => {
    const overlap = (candidate: MatchmakingCandidate) => candidate.interests.reduce((score, interest) => score + (viewerTags.has(normalize(interest)) ? 1 : 0), 0);
    return overlap(right) - overlap(left) || +new Date(left.createdAt) - +new Date(right.createdAt);
  });
}

export function fallbackMatchReason(viewerInterests: string[], selected: MatchmakingCandidate[]) {
  const counts = new Map<string, number>();
  for (const interest of [...viewerInterests, ...selected.flatMap((candidate) => candidate.interests)]) {
    const key = interest.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const shared = [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, count]) => count > 1).slice(0, 2).map(([interest]) => interest);
  return shared.length
    ? `You share an interest in ${shared.join(" and ")} and wanted a similar group size.`
    : "You chose compatible group sizes and are all interested in the same activity.";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
