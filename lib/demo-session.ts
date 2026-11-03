import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const DEMO_SESSION_HOURS = 2;

export async function createDemoIdentity() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Demo accounts are not configured.");

  await cleanupExpiredDemoSessions();

  const token = crypto.randomUUID();
  const email = `demo-${token}@demo.dyad.invalid`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const expiresAt = new Date(Date.now() + DEMO_SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { dyad_demo: true, demo_expires_at: expiresAt },
    user_metadata: { display_name: "Demo Guest" },
  });
  if (error || !data.user) throw error ?? new Error("Demo account could not be created.");

  const { error: sessionError } = await admin.from("demo_sessions").insert({ user_id: data.user.id, expires_at: expiresAt });
  if (sessionError) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw sessionError;
  }

  return { userId: data.user.id, email, password, expiresAt };
}

export async function cleanupDemoIdentity(userId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Demo cleanup is not configured.");
  const { data: session, error: sessionError } = await admin.from("demo_sessions").select("user_id").eq("user_id", userId).maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return false;

  const { data: groups, error: groupsError } = await admin.from("groups").select("id").eq("created_by", userId);
  if (groupsError) throw groupsError;
  for (const group of groups) {
    const { data: member, error: memberError } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", group.id)
      .neq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memberError) throw memberError;

    let replacementUserId = member?.user_id ?? null;
    if (!replacementUserId) {
      const { data: invite, error: inviteError } = await admin
        .from("group_invites")
        .select("invitee_id")
        .eq("group_id", group.id)
        .neq("invitee_id", userId)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (inviteError) throw inviteError;
      replacementUserId = invite?.invitee_id ?? null;
    }

    const { error: groupError } = replacementUserId
      ? await admin.from("groups").update({ created_by: replacementUserId }).eq("id", group.id)
      : await admin.from("groups").delete().eq("id", group.id);
    if (groupError) throw groupError;
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) throw profileError;
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;
  return true;
}

export async function cleanupExpiredDemoSessions() {
  const admin = createSupabaseAdminClient();
  if (!admin) return { removed: 0, failed: 0 };
  const { data, error } = await admin.from("demo_sessions").select("user_id").lte("expires_at", new Date().toISOString()).limit(100);
  if (error) throw error;

  let removed = 0;
  let failed = 0;
  for (const session of data) {
    try {
      if (await cleanupDemoIdentity(session.user_id)) removed += 1;
    } catch {
      failed += 1;
    }
  }
  return { removed, failed };
}
