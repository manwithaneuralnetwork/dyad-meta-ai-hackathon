import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ activityId: id, people: [] }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ activityId: id, people: [] }, { status: 401 });
  const { data: discoveries, error } = await supabase.from("activity_discovery").select("user_id").eq("activity_id", id).neq("user_id", user.id);
  if (error) return NextResponse.json({ activityId: id, people: [] }, { status: 500 });
  const ids = discoveries.map((row) => row.user_id);
  if (!ids.length) return NextResponse.json({ activityId: id, people: [] });
  const { data: people } = await supabase.from("profiles").select("id, display_name, avatar_url, one_liner, attended_count").in("id", ids).order("display_name");
  return NextResponse.json({ activityId: id, people: people ?? [] });
}
