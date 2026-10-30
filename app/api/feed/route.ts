import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ activities: [], error: "Activity service is not configured" }, { status: 503 });
  const { data, error } = await supabase.from("activities").select("*").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at");
  if (error) return NextResponse.json({ activities: [], error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data });
}
