"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicProfile, Viewer } from "@/lib/activity-data";
import type { Database } from "@/lib/database.types";

export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type FriendshipState = { id: string; status: Friendship["status"]; direction: "incoming" | "outgoing" } | null;

export async function listFriends(viewer: Viewer): Promise<PublicProfile[]> {
  if (viewer.kind !== "real") return [];
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${viewer.userId},addressee_id.eq.${viewer.userId}`);
  if (error) throw error;
  const friendIds = rows.map((row) => row.requester_id === viewer.userId ? row.addressee_id : row.requester_id);
  if (!friendIds.length) return [];
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").in("id", friendIds).order("display_name");
  if (profileError) throw profileError;
  return profiles;
}

export async function getFriendshipState(profileId: string, viewer: Viewer): Promise<FriendshipState> {
  if (viewer.kind !== "real" || profileId === viewer.userId) return null;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`and(requester_id.eq.${viewer.userId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${viewer.userId})`)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, status: data.status, direction: data.addressee_id === viewer.userId ? "incoming" : "outgoing" } : null;
}

export async function requestFriend(profileId: string) {
  const response = await fetch("/api/friends", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId }),
  });
  const payload = await response.json() as { friendship?: Friendship; error?: string };
  if (!response.ok || !payload.friendship) throw new Error(payload.error || "That friend request couldn’t be sent.");
  return payload.friendship;
}

export async function respondToFriendRequest(friendshipId: string, response: "accepted" | "declined") {
  const result = await fetch("/api/friends", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendshipId, response }),
  });
  const payload = await result.json() as { friendship?: Friendship; error?: string };
  if (!result.ok || !payload.friendship) throw new Error(payload.error || "That friend request couldn’t be updated.");
  return payload.friendship;
}
