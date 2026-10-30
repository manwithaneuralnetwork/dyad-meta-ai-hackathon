"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ActivityRecord, PublicProfile, Viewer } from "@/lib/activity-data";
import type { Database } from "@/lib/database.types";

export type GroupMessage = Database["public"]["Tables"]["messages"]["Row"];
export type GroupSummary = {
  groupId: string;
  activity: ActivityRecord;
  status: "member" | "pending";
  memberCount: number;
  lastMessage: string;
  lastActivityAt: string;
  inviterName?: string;
};

export type GroupDetail = {
  groupId: string;
  activity: ActivityRecord;
  createdAt: string;
  createdBy: string;
  accepted: boolean;
  members: Array<{ profile: PublicProfile; joinedAt: string; role: string }>;
  acceptedInvites: Array<{ profile: PublicProfile; acceptedAt: string }>;
  messages: GroupMessage[];
};

export async function createActivityGroup(activityId: string, inviteeIds: string[], viewer: Viewer) {
  if (viewer.kind !== "real") throw new Error("Sign in with a real account to invite people.");
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Group service is not configured.");
  const { data, error } = await supabase.rpc("create_activity_group", { p_activity_id: activityId, p_invitee_ids: inviteeIds });
  if (error) throw error;
  return data;
}

export async function listMyGroups(viewer: Viewer): Promise<GroupSummary[]> {
  if (viewer.kind !== "real") return [];
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];

  const [membersResult, invitesResult] = await Promise.all([
    supabase.from("group_members").select("group_id").eq("user_id", viewer.userId),
    supabase.from("group_invites").select("group_id, inviter_id").eq("invitee_id", viewer.userId).eq("status", "pending"),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (invitesResult.error) throw invitesResult.error;

  const memberIds = new Set(membersResult.data.map((row) => row.group_id));
  const pendingById = new Map(invitesResult.data.map((row) => [row.group_id, row.inviter_id]));
  const groupIds = [...new Set([...memberIds, ...pendingById.keys()])];
  if (!groupIds.length) return [];

  const { data: groups, error: groupsError } = await supabase.from("groups").select("*").in("id", groupIds).order("last_message_at", { ascending: false });
  if (groupsError) throw groupsError;
  const activityIds = [...new Set(groups.map((group) => group.activity_id))];
  const inviterIds = [...new Set(pendingById.values())];
  const [activitiesResult, memberRowsResult, messagesResult, invitersResult] = await Promise.all([
    supabase.from("activities").select("*").in("id", activityIds),
    supabase.from("group_members").select("group_id").in("group_id", groupIds),
    memberIds.size ? supabase.from("messages").select("group_id, body, created_at").in("group_id", [...memberIds]).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    inviterIds.length ? supabase.from("profiles").select("id, display_name").in("id", inviterIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (activitiesResult.error) throw activitiesResult.error;
  if (memberRowsResult.error) throw memberRowsResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (invitersResult.error) throw invitersResult.error;

  const activityById = new Map(activitiesResult.data.map((activity) => [activity.id, activity]));
  const memberCount = new Map<string, number>();
  for (const row of memberRowsResult.data) memberCount.set(row.group_id, (memberCount.get(row.group_id) ?? 0) + 1);
  const latestMessage = new Map<string, { body: string; created_at: string }>();
  for (const message of messagesResult.data) if (!latestMessage.has(message.group_id)) latestMessage.set(message.group_id, message);
  const inviterById = new Map(invitersResult.data.map((profile) => [profile.id, profile.display_name]));

  return groups.flatMap((group) => {
    const activity = activityById.get(group.activity_id);
    if (!activity) return [];
    const message = latestMessage.get(group.id);
    const pendingInviter = pendingById.get(group.id);
    return [{
      groupId: group.id,
      activity,
      status: memberIds.has(group.id) ? "member" as const : "pending" as const,
      memberCount: memberCount.get(group.id) ?? 0,
      lastMessage: pendingInviter ? `${inviterById.get(pendingInviter) || "Someone"} invited you` : message?.body || "Group created — say hello!",
      lastActivityAt: message?.created_at || group.last_message_at,
      inviterName: pendingInviter ? inviterById.get(pendingInviter) || "Someone" : undefined,
    }];
  });
}

export async function getGroupDetail(groupId: string, viewer: Viewer): Promise<GroupDetail | null> {
  if (viewer.kind !== "real") return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: group, error: groupError } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
  if (groupError) throw groupError;
  if (!group) return null;

  const { data: activity, error: activityError } = await supabase.from("activities").select("*").eq("id", group.activity_id).single();
  if (activityError) throw activityError;
  const { data: ownMember, error: ownError } = await supabase.from("group_members").select("group_id").eq("group_id", groupId).eq("user_id", viewer.userId).maybeSingle();
  if (ownError) throw ownError;
  const accepted = Boolean(ownMember);

  const [membersResult, inviteResult, messagesResult] = await Promise.all([
    supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", groupId).order("joined_at"),
    supabase.from("group_invites").select("invitee_id, responded_at").eq("group_id", groupId).eq("status", "accepted").order("responded_at"),
    accepted ? supabase.from("messages").select("*").eq("group_id", groupId).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (inviteResult.error) throw inviteResult.error;
  if (messagesResult.error) throw messagesResult.error;
  const profileIds = [...new Set([...membersResult.data.map((row) => row.user_id), ...inviteResult.data.map((row) => row.invitee_id)])];
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from("profiles").select("*").in("id", profileIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    groupId,
    activity,
    createdAt: group.created_at,
    createdBy: group.created_by,
    accepted,
    members: membersResult.data.flatMap((row) => {
      const profile = profileById.get(row.user_id);
      return profile ? [{ profile, joinedAt: row.joined_at, role: row.role }] : [];
    }),
    acceptedInvites: inviteResult.data.flatMap((row) => {
      const profile = profileById.get(row.invitee_id);
      return profile && row.responded_at ? [{ profile, acceptedAt: row.responded_at }] : [];
    }),
    messages: messagesResult.data,
  };
}

export async function respondToInvite(groupId: string, response: "accepted" | "declined") {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Group service is not configured.");
  const { error } = await supabase.rpc("respond_to_group_invite", { p_group_id: groupId, p_response: response });
  if (error) throw error;
}

export async function inviteMoreToGroup(groupId: string, inviteeIds: string[]) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Group service is not configured.");
  const { data, error } = await supabase.rpc("invite_more_to_group", { p_group_id: groupId, p_invitee_ids: inviteeIds });
  if (error) throw error;
  return data;
}

export async function sendGroupMessage(groupId: string, senderId: string, body: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Chat service is not configured.");
  const { data, error } = await supabase.from("messages").insert({ group_id: groupId, sender_id: senderId, body: body.trim() }).select("*").single();
  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId: string, userId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Group service is not configured.");
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
}

export function subscribeToGroupMessages(groupId: string, onMessage: (message: GroupMessage) => void): RealtimeChannel | null {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  return supabase
    .channel(`group-messages:${groupId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` }, (payload) => onMessage(payload.new as GroupMessage))
    .subscribe();
}

export function unsubscribeFromGroup(channel: RealtimeChannel | null) {
  const supabase = createSupabaseBrowserClient();
  if (supabase && channel) void supabase.removeChannel(channel);
}
