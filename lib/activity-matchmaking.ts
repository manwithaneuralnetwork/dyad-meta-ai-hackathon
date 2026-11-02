import type { Database } from "@/lib/database.types";
import type { Viewer } from "@/lib/activity-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type MatchmakingPreference = { sizes: number[] };
export type ActivityMatchmakingEntry = Database["public"]["Tables"]["activity_matchmaking"]["Row"];
export type ActivityMatchmakingStatus = { entry: ActivityMatchmakingEntry | null; waitingCount: number };

export type MatchmakingCandidate = {
  userId: string;
  minGroupSize: number;
  maxGroupSize: number;
  acceptedGroupSizes: number[];
  interests: string[];
  oneLiner: string;
  attendedCount: number;
  createdAt: string;
};

export const MATCHMAKING_SIZES = [2, 3, 4, 5, 6] as const;

export function acceptedSizes(entry: Pick<ActivityMatchmakingEntry, "accepted_group_sizes" | "min_group_size" | "max_group_size">) {
  return entry.accepted_group_sizes?.length
    ? entry.accepted_group_sizes
    : Array.from({ length: entry.max_group_size - entry.min_group_size + 1 }, (_, index) => entry.min_group_size + index);
}

export function formatGroupSizes(sizes: number[]) {
  const sorted = [...new Set(sizes)].sort((a, b) => a - b);
  if (!sorted.length) return "Choose sizes";
  if (sorted.length === 1) return `${sorted[0]} people`;
  return `${sorted.join(", ")} people`;
}

export async function listMyMatchmaking(viewer: Viewer) {
  if (viewer.kind !== "real") return {} as Record<string, ActivityMatchmakingEntry>;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return {} as Record<string, ActivityMatchmakingEntry>;
  const { data, error } = await supabase.from("activity_matchmaking").select("*").eq("user_id", viewer.userId).in("status", ["waiting", "matched"]);
  if (error) throw error;
  return Object.fromEntries(data.map((entry) => [entry.activity_id, entry]));
}

export function findMatchablePool(
  viewerId: string,
  preference: MatchmakingPreference,
  candidates: MatchmakingCandidate[],
) {
  for (const targetSize of [...new Set(preference.sizes)].sort((a, b) => a - b)) {
    const compatible = candidates
      .filter((candidate) => candidate.userId !== viewerId)
      .filter((candidate) => candidate.acceptedGroupSizes.includes(targetSize))
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
