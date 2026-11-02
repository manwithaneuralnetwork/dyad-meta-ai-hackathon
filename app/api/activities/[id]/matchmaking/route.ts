import { NextResponse } from "next/server";
import { z } from "zod";
import { callMuseStructured } from "@/lib/meta";
import { fallbackMatchReason, findMatchablePool, rankMatchmakingCandidates, type MatchmakingCandidate } from "@/lib/activity-matchmaking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const preferenceSchema = z.object({
  minGroupSize: z.number().int().min(2).max(6),
  maxGroupSize: z.number().int().min(2).max(6),
}).refine((value) => value.minGroupSize <= value.maxGroupSize, "Invalid group-size range");

const museChoiceSchema = z.object({
  selectedUserIds: z.array(z.string().uuid()).min(1).max(5),
  reason: z.string().trim().min(1).max(180),
});

const museChoiceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    selectedUserIds: { type: "array", minItems: 1, maxItems: 5, uniqueItems: true, items: { type: "string" } },
    reason: { type: "string", minLength: 1, maxLength: 180 },
  },
  required: ["selectedUserIds", "reason"],
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const { userId, admin } = session;
  const [{ data: entry, error }, waitingCount] = await Promise.all([
    admin.from("activity_matchmaking").select("*").eq("user_id", userId).eq("activity_id", activityId).maybeSingle(),
    countWaiting(admin, activityId),
  ]);
  if (error) return NextResponse.json({ error: "Matchmaking status couldn’t be loaded" }, { status: 500 });
  return NextResponse.json({ entry, waitingCount }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const input = preferenceSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a valid group size" }, { status: 400 });
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const { userId, admin } = session;

  const { data: activity, error: activityError } = await admin.from("activities").select("id, title, topics, starts_at, status").eq("id", activityId).maybeSingle();
  if (activityError || !activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  if (activity.status !== "published" || new Date(activity.starts_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Matching has closed for this activity" }, { status: 409 });
  }

  const existingGroupId = await findExistingGroup(admin, userId, activityId);
  if (existingGroupId) return NextResponse.json({ matched: true, groupId: existingGroupId, reason: "You already have a group for this activity." });
  const { data: existingMatch } = await admin.from("activity_matchmaking").select("status, group_id, match_reason").eq("user_id", userId).eq("activity_id", activityId).maybeSingle();
  if (existingMatch?.status === "matched" && existingMatch.group_id) {
    return NextResponse.json({ matched: true, groupId: existingMatch.group_id, reason: existingMatch.match_reason || "Muse already found your group." });
  }

  const now = new Date().toISOString();
  const { error: queueError } = await admin.from("activity_matchmaking").upsert({
    user_id: userId,
    activity_id: activityId,
    min_group_size: input.data.minGroupSize,
    max_group_size: input.data.maxGroupSize,
    status: "waiting",
    group_id: null,
    match_reason: "",
    updated_at: now,
  }, { onConflict: "user_id,activity_id" });
  if (queueError) return NextResponse.json({ error: "You couldn’t join matchmaking right now" }, { status: 500 });

  const { data: queue, error: poolError } = await admin.from("activity_matchmaking").select("*").eq("activity_id", activityId).eq("status", "waiting").order("created_at");
  if (poolError) return NextResponse.json({ error: "The matching pool couldn’t be checked" }, { status: 500 });

  const userIds = queue.map((entry) => entry.user_id);
  const [profilesResult, interestsResult] = await Promise.all([
    admin.from("profiles").select("id, display_name, one_liner, attended_count").in("id", userIds),
    admin.from("profile_interests").select("user_id, interest").in("user_id", userIds),
  ]);
  if (profilesResult.error || interestsResult.error) return NextResponse.json({ error: "Profiles couldn’t be compared" }, { status: 500 });

  const interestsByUser = new Map<string, string[]>();
  for (const row of interestsResult.data) interestsByUser.set(row.user_id, [...(interestsByUser.get(row.user_id) ?? []), row.interest]);
  const profileById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const candidates: MatchmakingCandidate[] = queue.map((entry) => ({
    userId: entry.user_id,
    minGroupSize: entry.min_group_size,
    maxGroupSize: entry.max_group_size,
    interests: interestsByUser.get(entry.user_id) ?? [],
    oneLiner: profileById.get(entry.user_id)?.one_liner ?? "",
    attendedCount: profileById.get(entry.user_id)?.attended_count ?? 0,
    createdAt: entry.created_at,
  }));
  const pool = findMatchablePool(userId, { min: input.data.minGroupSize, max: input.data.maxGroupSize }, candidates);
  if (!pool) return NextResponse.json({ matched: false, waiting: true, waitingCount: queue.length });

  const viewerInterests = interestsByUser.get(userId) ?? [];
  const deterministic = rankMatchmakingCandidates(viewerInterests, pool.candidates).slice(0, pool.targetSize - 1);
  let selected = deterministic;
  let reason = fallbackMatchReason(viewerInterests, selected);
  try {
    const result = await callMuseStructured({
      name: "dyad_activity_group_match",
      system: `You are Muse, helping form a friendly in-person activity group. Select exactly ${pool.targetSize - 1} people from the candidate list to join the requesting user. Prioritize genuinely shared interests, compatible social cues in one-liners, and a welcoming mix of experience. Never use or infer sensitive traits, demographics, or protected characteristics. Return only candidate IDs and one warm, specific sentence explaining the fit without claiming certainty.`,
      prompt: JSON.stringify({
        activity: { title: activity.title, topics: activity.topics },
        requester: { userId, interests: viewerInterests, oneLiner: profileById.get(userId)?.one_liner ?? "" },
        targetGroupSize: pool.targetSize,
        candidates: pool.candidates.map((candidate) => ({
          userId: candidate.userId,
          interests: candidate.interests,
          oneLiner: candidate.oneLiner,
          activitiesAttended: candidate.attendedCount,
        })),
      }),
      schema: museChoiceJsonSchema,
      validator: museChoiceSchema,
      timeoutMs: 12_000,
    });
    const allowed = new Set(pool.candidates.map((candidate) => candidate.userId));
    const uniqueIds = result ? [...new Set(result.data.selectedUserIds)] : [];
    if (result && uniqueIds.length === pool.targetSize - 1 && uniqueIds.every((id) => allowed.has(id))) {
      selected = uniqueIds.map((id) => pool.candidates.find((candidate) => candidate.userId === id)!);
      reason = result.data.reason;
    }
  } catch {
    // The deterministic overlap ranking keeps matching available if the model is temporarily unavailable.
  }

  const participantIds = [userId, ...selected.map((candidate) => candidate.userId)];
  const { data: groupId, error: matchError } = await admin.rpc("create_matchmade_activity_group", {
    p_activity_id: activityId,
    p_creator_id: userId,
    p_participant_ids: participantIds,
    p_match_reason: reason,
  });
  if (matchError || !groupId) {
    const { data: current } = await admin.from("activity_matchmaking").select("status, group_id, match_reason").eq("user_id", userId).eq("activity_id", activityId).maybeSingle();
    if (current?.status === "matched" && current.group_id) return NextResponse.json({ matched: true, groupId: current.group_id, reason: current.match_reason });
    return NextResponse.json({ matched: false, waiting: true, waitingCount: await countWaiting(admin, activityId) });
  }
  return NextResponse.json({ matched: true, groupId, reason }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const { userId, admin } = session;
  const { error } = await admin.from("activity_matchmaking").update({ status: "cancelled", group_id: null, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("activity_id", activityId).eq("status", "waiting");
  if (error) return NextResponse.json({ error: "Matchmaking couldn’t be paused" }, { status: 500 });
  return NextResponse.json({ cancelled: true }, { headers: { "Cache-Control": "private, no-store" } });
}

async function authenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { error: NextResponse.json({ error: "Matchmaking is unavailable" }, { status: 503 }) } as const;
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) } as const;
  return { userId, admin, error: null } as const;
}

async function findExistingGroup(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string, activityId: string) {
  const { data: memberships } = await admin.from("group_members").select("group_id").eq("user_id", userId);
  const groupIds = memberships?.map((membership) => membership.group_id) ?? [];
  if (!groupIds.length) return null;
  const { data: group } = await admin.from("groups").select("id").in("id", groupIds).eq("activity_id", activityId).maybeSingle();
  return group?.id ?? null;
}

async function countWaiting(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, activityId: string) {
  const { count } = await admin.from("activity_matchmaking").select("activity_id", { count: "exact", head: true }).eq("activity_id", activityId).eq("status", "waiting");
  return count ?? 0;
}
