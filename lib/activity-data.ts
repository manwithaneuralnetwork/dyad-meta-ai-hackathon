"use client";

import type { Database } from "@/lib/database.types";
import { getAppMode, startRealSession } from "@/lib/app-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CORE_INTEREST_TAGS } from "@/lib/interest-tags";

export type ActivityRecord = Database["public"]["Tables"]["activities"]["Row"];
export type PublicProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type ActivityUiState = { interested: boolean; saved: boolean; discoverable: boolean; groupId?: string };
export type Viewer = { kind: "real"; userId: string } | { kind: "demo" } | { kind: "anonymous" };
export type InterestTag = { label: string; isCore: boolean };

const DEMO_ACTIVITY_STATE_KEY = "dyad-activity-states";
const EMPTY_STATE: ActivityUiState = { interested: false, saved: false, discoverable: false };

function readDemoStates(): Record<string, ActivityUiState> {
  try {
    const value = window.sessionStorage.getItem(DEMO_ACTIVITY_STATE_KEY);
    return value ? JSON.parse(value) as Record<string, ActivityUiState> : {};
  } catch {
    window.sessionStorage.removeItem(DEMO_ACTIVITY_STATE_KEY);
    return {};
  }
}

function writeDemoStates(states: Record<string, ActivityUiState>) {
  window.sessionStorage.setItem(DEMO_ACTIVITY_STATE_KEY, JSON.stringify(states));
}

export async function resolveViewer(): Promise<Viewer> {
  if (getAppMode() === "demo") return { kind: "demo" };

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { kind: "anonymous" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  startRealSession();
  return { kind: "real", userId: user.id };
}

export async function listActivities(options?: { includePast?: boolean }): Promise<ActivityRecord[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Activity service is not configured");

  let query = supabase
    .from("activities")
    .select("*")
    .in("status", ["published", "completed"])
    .order("starts_at", { ascending: true });

  if (!options?.includePast) query = query.gte("starts_at", new Date().toISOString());
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listInterestTags(): Promise<InterestTag[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return CORE_INTEREST_TAGS.map((label) => ({ label, isCore: true }));
  const { data, error } = await supabase
    .from("interest_tags")
    .select("label, is_core")
    .eq("active", true);
  if (error) return CORE_INTEREST_TAGS.map((label) => ({ label, isCore: true }));
  const tagByLabel = new Map(data.map((tag) => [tag.label, tag]));
  const core = CORE_INTEREST_TAGS
    .filter((label) => tagByLabel.has(label))
    .map((label) => ({ label, isCore: true }));
  const dynamic = data
    .filter((tag) => !tag.is_core)
    .sort((left, right) => left.label.localeCompare(right.label))
    .map((tag) => ({ label: tag.label, isCore: false }));
  return [...core, ...dynamic];
}

export async function loadViewerInterests(viewer: Viewer): Promise<string[]> {
  if (viewer.kind === "demo") {
    try {
      return JSON.parse(window.sessionStorage.getItem("dyad-interests") ?? "[]") as string[];
    } catch {
      return [];
    }
  }
  if (viewer.kind !== "real") return [];
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profile_interests")
    .select("interest")
    .eq("user_id", viewer.userId)
    .order("created_at");
  if (error) throw error;
  return data.map((item) => item.interest);
}

export async function getActivity(activityId: string): Promise<ActivityRecord | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Activity service is not configured");
  const { data, error } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadActivityStates(activityIds: string[], viewer: Viewer): Promise<Record<string, ActivityUiState>> {
  const states = Object.fromEntries(activityIds.map((id) => [id, { ...EMPTY_STATE }])) as Record<string, ActivityUiState>;
  if (!activityIds.length || viewer.kind === "anonymous") return states;

  if (viewer.kind === "demo") {
    const stored = readDemoStates();
    for (const activityId of activityIds) if (stored[activityId]) states[activityId] = stored[activityId];
    return states;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return states;
  const [stateResult, discoveryResult, membershipResult] = await Promise.all([
    supabase.from("activity_states").select("activity_id, interested, saved").eq("user_id", viewer.userId).in("activity_id", activityIds),
    supabase.from("activity_discovery").select("activity_id").eq("user_id", viewer.userId).in("activity_id", activityIds),
    supabase.from("group_members").select("group_id").eq("user_id", viewer.userId),
  ]);
  if (stateResult.error) throw stateResult.error;
  if (discoveryResult.error) throw discoveryResult.error;
  if (membershipResult.error) throw membershipResult.error;

  const groupIds = membershipResult.data.map((row) => row.group_id);
  const { data: groups, error: groupsError } = groupIds.length
    ? await supabase.from("groups").select("id, activity_id").in("id", groupIds).in("activity_id", activityIds)
    : { data: [], error: null };
  if (groupsError) throw groupsError;

  for (const row of stateResult.data) states[row.activity_id] = { interested: row.interested, saved: row.saved, discoverable: false };
  for (const row of discoveryResult.data) states[row.activity_id] = { ...(states[row.activity_id] ?? EMPTY_STATE), discoverable: true };
  for (const group of groups) states[group.activity_id] = { ...(states[group.activity_id] ?? EMPTY_STATE), interested: false, discoverable: false, groupId: group.id };
  return states;
}

export async function saveActivityState(activityId: string, next: ActivityUiState, viewer: Viewer) {
  const normalized = next.groupId
    ? { ...next, interested: false, discoverable: false }
    : next.interested ? next : { ...next, discoverable: false };
  if (viewer.kind === "anonymous") throw new Error("Choose real or demo mode before saving activities.");

  if (viewer.kind === "demo") {
    const states = readDemoStates();
    if (!normalized.interested && !normalized.saved) delete states[activityId];
    else states[activityId] = normalized;
    writeDemoStates(states);
    return normalized;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Activity service is not configured");
  const { error } = await supabase.rpc("set_my_activity_state", {
    p_activity_id: activityId,
    p_interested: normalized.interested,
    p_saved: normalized.saved,
    p_discoverable: normalized.discoverable,
  });
  if (error) throw error;
  return normalized;
}

export async function listDiscoverableProfiles(activityId: string, viewer: Viewer): Promise<PublicProfile[]> {
  if (viewer.kind !== "real") return [];
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];

  const { data: discoveries, error: discoveryError } = await supabase
    .from("activity_discovery")
    .select("user_id")
    .eq("activity_id", activityId)
    .neq("user_id", viewer.userId);
  if (discoveryError) throw discoveryError;
  const userIds = discoveries.map((row) => row.user_id);
  if (!userIds.length) return [];

  const { data, error } = await supabase.from("profiles").select("*").in("id", userIds).order("display_name");
  if (error) throw error;
  return data;
}

export async function countDiscoverablePeople(activityId: string, viewer: Viewer): Promise<number | null> {
  if (viewer.kind !== "real") return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { count, error } = await supabase
    .from("activity_discovery")
    .select("activity_id", { count: "exact", head: true })
    .eq("activity_id", activityId);
  if (error) throw error;
  return count ?? 0;
}

export async function getViewerProfile(viewer: Viewer): Promise<PublicProfile | null> {
  if (viewer.kind !== "real") return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", viewer.userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function formatActivityDate(startsAt: string, options?: { long?: boolean }) {
  const date = new Date(startsAt);
  return new Intl.DateTimeFormat("en-US", options?.long ? {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  } : {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

export function activityLocation(activity: ActivityRecord) {
  return [activity.venue_name, activity.address, activity.city].filter(Boolean).join(" · ");
}
