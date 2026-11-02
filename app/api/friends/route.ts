import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ profileId: z.string().uuid() });
const responseSchema = z.object({ friendshipId: z.string().uuid(), response: z.enum(["accepted", "declined"]) });

export async function GET(request: Request) {
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const profileId = new URL(request.url).searchParams.get("profileId");
  if (!profileId || !z.string().uuid().safeParse(profileId).success) return NextResponse.json({ error: "Choose a valid profile" }, { status: 400 });
  const { admin } = session;
  const { count, error } = await admin.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
  if (error) return NextResponse.json({ error: "Friend count couldn’t be loaded" }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Choose a valid profile" }, { status: 400 });
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const { userId, admin } = session;
  if (userId === input.data.profileId) return NextResponse.json({ error: "You can’t add yourself as a friend" }, { status: 400 });

  const { data: profile } = await admin.from("profiles").select("id").eq("id", input.data.profileId).maybeSingle();
  if (!profile) return NextResponse.json({ error: "That profile is no longer available" }, { status: 404 });

  const { data: existing, error: existingError } = await admin
    .from("friendships")
    .select("*")
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${input.data.profileId}),and(requester_id.eq.${input.data.profileId},addressee_id.eq.${userId})`)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Friendship status couldn’t be checked" }, { status: 500 });

  if (existing?.status === "accepted" || (existing?.status === "pending" && existing.requester_id === userId)) {
    return NextResponse.json({ friendship: existing }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (existing?.status === "pending" && existing.addressee_id === userId) {
    const { data, error } = await admin.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
    if (error) return NextResponse.json({ error: "That friend request couldn’t be accepted" }, { status: 500 });
    return NextResponse.json({ friendship: data }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (existing) {
    const { data, error } = await admin.from("friendships").update({ requester_id: userId, addressee_id: input.data.profileId, status: "pending", created_at: new Date().toISOString(), responded_at: null }).eq("id", existing.id).select("*").single();
    if (error) return NextResponse.json({ error: "That friend request couldn’t be sent" }, { status: 500 });
    return NextResponse.json({ friendship: data }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const { data, error } = await admin.from("friendships").insert({ requester_id: userId, addressee_id: input.data.profileId }).select("*").single();
  if (error) return NextResponse.json({ error: "That friend request couldn’t be sent" }, { status: 500 });
  return NextResponse.json({ friendship: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const input = responseSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid friend response" }, { status: 400 });
  const session = await authenticatedUser();
  if (session.error) return session.error;
  const { userId, admin } = session;
  const { data, error } = await admin
    .from("friendships")
    .update({ status: input.data.response, responded_at: new Date().toISOString() })
    .eq("id", input.data.friendshipId)
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "That friend request couldn’t be updated" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Pending friend request not found" }, { status: 404 });
  return NextResponse.json({ friendship: data }, { headers: { "Cache-Control": "private, no-store" } });
}

async function authenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { error: NextResponse.json({ error: "Friends are unavailable" }, { status: 503 }) } as const;
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) } as const;
  return { userId, admin, error: null } as const;
}
