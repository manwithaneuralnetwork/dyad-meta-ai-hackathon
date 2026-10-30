"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ActivityRecord, PublicProfile, Viewer } from "@/lib/activity-data";
import type { Database } from "@/lib/database.types";

export type GroupMessage = Database["public"]["Tables"]["messages"]["Row"];
export type GroupSummary = {
  groupId: string;
  activity: ActivityRecord;
  status: "member";
  memberCount: number;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
};

export type GroupDetail = {
  groupId: string;
  activity: ActivityRecord;
  createdAt: string;
  createdBy: string;
  accepted: boolean;
  members: Array<{ profile: PublicProfile; joinedAt: string; role: string }>;
  acceptedInvites: Array<{ profile: PublicProfile; acceptedAt: string }>;
  invitationCounts: { total: number; pending: number; accepted: number; declined: number };
  canScrap: boolean;
  messages: GroupMessage[];
};

export type InboxNotification = {
  id: string;
  kind: "group_invite" | "invite_response";
  activity: ActivityRecord;
  groupId: string;
  createdAt: string;
  title: string;
  body: string;
  unread: boolean;
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

  const membersResult = await supabase.from("group_members").select("group_id, last_read_at").eq("user_id", viewer.userId);
  if (membersResult.error) throw membersResult.error;
  const groupIds = membersResult.data.map((row) => row.group_id);
  if (!groupIds.length) return [];

  const readAtByGroup = new Map(membersResult.data.map((row) => [row.group_id, row.last_read_at]));

  const { data: groups, error: groupsError } = await supabase.from("groups").select("*").in("id", groupIds).order("last_message_at", { ascending: false });
  if (groupsError) throw groupsError;
  const activityIds = [...new Set(groups.map((group) => group.activity_id))];
  const [activitiesResult, memberRowsResult, messagesResult] = await Promise.all([
    supabase.from("activities").select("*").in("id", activityIds),
    supabase.from("group_members").select("group_id").in("group_id", groupIds),
    supabase.from("messages").select("group_id, body, created_at, sender_id").in("group_id", groupIds).order("created_at", { ascending: false }),
  ]);
  if (activitiesResult.error) throw activitiesResult.error;
  if (memberRowsResult.error) throw memberRowsResult.error;
  if (messagesResult.error) throw messagesResult.error;
  const senderIds = [...new Set(messagesResult.data.map((message) => message.sender_id))];
  const { data: senders, error: sendersError } = senderIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", senderIds)
    : { data: [], error: null };
  if (sendersError) throw sendersError;

  const activityById = new Map(activitiesResult.data.map((activity) => [activity.id, activity]));
  const memberCount = new Map<string, number>();
  for (const row of memberRowsResult.data) memberCount.set(row.group_id, (memberCount.get(row.group_id) ?? 0) + 1);
  const latestMessage = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const message of messagesResult.data) if (!latestMessage.has(message.group_id)) latestMessage.set(message.group_id, message);
  const senderById = new Map(senders.map((profile) => [profile.id, profile.display_name]));
  const unreadByGroup = new Map<string, number>();
  for (const message of messagesResult.data) {
    if (message.sender_id === viewer.userId) continue;
    const readAt = readAtByGroup.get(message.group_id);
    if (readAt && +new Date(message.created_at) <= +new Date(readAt)) continue;
    unreadByGroup.set(message.group_id, (unreadByGroup.get(message.group_id) ?? 0) + 1);
  }

  return groups.flatMap((group) => {
    const activity = activityById.get(group.activity_id);
    if (!activity) return [];
    const message = latestMessage.get(group.id);
    return [{
      groupId: group.id,
      activity,
      status: "member" as const,
      memberCount: memberCount.get(group.id) ?? 0,
      lastMessage: message ? `${message.sender_id === viewer.userId ? "You" : senderById.get(message.sender_id) || "Member"}: ${message.body}` : "Group created — say hello!",
      lastActivityAt: message?.created_at || group.last_message_at,
      unreadCount: unreadByGroup.get(group.id) ?? 0,
    }];
  }).sort((left, right) => +new Date(right.lastActivityAt) - +new Date(left.lastActivityAt));
}

export async function listInboxNotifications(viewer: Viewer): Promise<InboxNotification[]> {
  if (viewer.kind !== "real") return [];
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];

  const { data: invites, error: invitesError } = await supabase
    .from("group_invites")
    .select("*")
    .or(`invitee_id.eq.${viewer.userId},inviter_id.eq.${viewer.userId}`)
    .order("created_at", { ascending: false });
  if (invitesError) throw invitesError;

  const relevantInvites = invites.filter((invite) =>
    (invite.invitee_id === viewer.userId && invite.status === "pending")
    || (invite.inviter_id === viewer.userId && invite.status !== "pending")
  );
  if (!relevantInvites.length) return [];

  const groupIds = [...new Set(relevantInvites.map((invite) => invite.group_id))];
  const { data: groups, error: groupsError } = await supabase.from("groups").select("id, activity_id").in("id", groupIds);
  if (groupsError) throw groupsError;
  const activityIds = [...new Set(groups.map((group) => group.activity_id))];
  const profileIds = [...new Set(relevantInvites.map((invite) => invite.invitee_id === viewer.userId ? invite.inviter_id : invite.invitee_id))];
  const [activitiesResult, profilesResult, readsResult] = await Promise.all([
    supabase.from("activities").select("*").in("id", activityIds),
    supabase.from("profiles").select("id, display_name").in("id", profileIds),
    supabase.from("notification_reads").select("notification_key").eq("user_id", viewer.userId),
  ]);
  if (activitiesResult.error) throw activitiesResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (readsResult.error) throw readsResult.error;

  const groupById = new Map(groups.map((group) => [group.id, group]));
  const activityById = new Map(activitiesResult.data.map((activity) => [activity.id, activity]));
  const nameById = new Map(profilesResult.data.map((profile) => [profile.id, profile.display_name]));
  const readKeys = new Set(readsResult.data.map((row) => row.notification_key));

  return relevantInvites.flatMap((invite) => {
    const group = groupById.get(invite.group_id);
    const activity = group ? activityById.get(group.activity_id) : undefined;
    if (!activity) return [];
    const incoming = invite.invitee_id === viewer.userId;
    const personId = incoming ? invite.inviter_id : invite.invitee_id;
    const personName = nameById.get(personId) || "Someone";
    return [{
      id: invite.id,
      kind: incoming ? "group_invite" as const : "invite_response" as const,
      activity,
      groupId: invite.group_id,
      createdAt: invite.responded_at || invite.created_at,
      title: incoming ? "New group invitation" : `Invitation ${invite.status}`,
      body: incoming
        ? `${personName} invited you to ${activity.title}.`
        : `${personName} ${invite.status} your invitation to ${activity.title}.`,
      unread: !readKeys.has(notificationKey(incoming ? "group_invite" : "invite_response", invite.id)),
    }];
  }).sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
}

function notificationKey(kind: InboxNotification["kind"], id: string) {
  return `${kind}:${id}`;
}

export async function markInboxNotificationsRead(viewer: Viewer, notifications: InboxNotification[]) {
  if (viewer.kind !== "real" || !notifications.length) return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const rows = notifications.map((notification) => ({
    user_id: viewer.userId,
    notification_key: notificationKey(notification.kind, notification.id),
    read_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("notification_reads").upsert(rows, { onConflict: "user_id,notification_key" });
  if (error) throw error;
}

export async function markGroupRead(groupId: string, viewer: Viewer) {
  if (viewer.kind !== "real") return;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  const { error } = await supabase.from("group_members").update({ last_read_at: new Date().toISOString() }).eq("group_id", groupId).eq("user_id", viewer.userId);
  if (error) throw error;
}

export async function getNotificationCounts(viewer: Viewer) {
  if (viewer.kind !== "real") return { chats: 0, inbox: 0 };
  const [groups, notifications] = await Promise.all([listMyGroups(viewer), listInboxNotifications(viewer)]);
  return {
    chats: groups.reduce((total, group) => total + group.unreadCount, 0),
    inbox: notifications.filter((notification) => notification.unread).length,
  };
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
    supabase.from("group_invites").select("invitee_id, status, responded_at").eq("group_id", groupId).order("created_at"),
    accepted ? supabase.from("messages").select("*").eq("group_id", groupId).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (inviteResult.error) throw inviteResult.error;
  if (messagesResult.error) throw messagesResult.error;
  const acceptedInviteRows = inviteResult.data.filter((row) => row.status === "accepted");
  const profileIds = [...new Set([...membersResult.data.map((row) => row.user_id), ...acceptedInviteRows.map((row) => row.invitee_id)])];
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
    acceptedInvites: acceptedInviteRows.flatMap((row) => {
      const profile = profileById.get(row.invitee_id);
      return profile && row.responded_at ? [{ profile, acceptedAt: row.responded_at }] : [];
    }),
    invitationCounts: {
      total: inviteResult.data.length,
      pending: inviteResult.data.filter((row) => row.status === "pending").length,
      accepted: acceptedInviteRows.length,
      declined: inviteResult.data.filter((row) => row.status === "declined").length,
    },
    canScrap: group.created_by === viewer.userId
      && inviteResult.data.length > 0
      && inviteResult.data.every((row) => row.status === "declined")
      && membersResult.data.every((row) => row.user_id === viewer.userId),
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

export async function scrapGroup(groupId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Group service is not configured.");
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
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

export function subscribeToGroupPresence(groupId: string, onChange: () => void): RealtimeChannel | null {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  return supabase
    .channel(`group-presence:${groupId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, onChange)
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_invites", filter: `group_id=eq.${groupId}` }, onChange)
    .subscribe();
}

export function subscribeToNotificationChanges(onChange: () => void): RealtimeChannel | null {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  return supabase
    .channel(`dyad-notification-counts:${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "group_invites" }, onChange)
    .subscribe();
}

export function unsubscribeFromGroup(channel: RealtimeChannel | null) {
  const supabase = createSupabaseBrowserClient();
  if (supabase && channel) void supabase.removeChannel(channel);
}
