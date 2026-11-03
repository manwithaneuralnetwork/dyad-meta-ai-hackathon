import { createClient } from "@supabase/supabase-js";

function env(name) {
  return globalThis.Netlify?.env.get(name) ?? process.env[name];
}

export default async () => {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const secret = env("SUPABASE_SECRET_KEY");
  if (!url || !secret) throw new Error("Supabase demo cleanup configuration is missing.");
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sessions, error } = await admin.from("demo_sessions").select("user_id").lte("expires_at", new Date().toISOString()).limit(100);
  if (error) throw error;

  let removed = 0;
  for (const session of sessions) {
    try {
      const { data: groups, error: groupsError } = await admin.from("groups").select("id").eq("created_by", session.user_id);
      if (groupsError) throw groupsError;
      for (const group of groups) {
        const { data: member, error: memberError } = await admin.from("group_members").select("user_id").eq("group_id", group.id).neq("user_id", session.user_id).order("joined_at", { ascending: true }).limit(1).maybeSingle();
        if (memberError) throw memberError;
        let replacementUserId = member?.user_id ?? null;
        if (!replacementUserId) {
          const { data: invite, error: inviteError } = await admin.from("group_invites").select("invitee_id").eq("group_id", group.id).neq("invitee_id", session.user_id).in("status", ["pending", "accepted"]).order("created_at", { ascending: true }).limit(1).maybeSingle();
          if (inviteError) throw inviteError;
          replacementUserId = invite?.invitee_id ?? null;
        }
        const { error: groupError } = replacementUserId
          ? await admin.from("groups").update({ created_by: replacementUserId }).eq("id", group.id)
          : await admin.from("groups").delete().eq("id", group.id);
        if (groupError) throw groupError;
      }
      const { error: profileError } = await admin.from("profiles").delete().eq("id", session.user_id);
      if (profileError) throw profileError;
    } catch (cleanupError) {
      console.error("Demo data cleanup failed", session.user_id, cleanupError instanceof Error ? cleanupError.message : cleanupError);
      continue;
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(session.user_id);
    if (deleteError) console.error("Demo auth cleanup failed", session.user_id, deleteError.message);
    else removed += 1;
  }
  console.log(`Removed ${removed} expired demo session(s).`);
  return new Response(null, { status: 204 });
};

export const config = { schedule: "*/10 * * * *" };
