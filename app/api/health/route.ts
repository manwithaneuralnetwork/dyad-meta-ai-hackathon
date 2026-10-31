import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  let database = false;

  if (supabase) {
    const { error } = await supabase.from("activities").select("id", { count: "exact", head: true });
    database = !error;
  }

  const checks = {
    database,
    meta: Boolean(process.env.MODEL_API_KEY),
    ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
  };
  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks, checkedAt: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
