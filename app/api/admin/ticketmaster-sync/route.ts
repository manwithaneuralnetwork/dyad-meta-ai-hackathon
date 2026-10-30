import { NextResponse } from "next/server";
import { fetchSanDiegoEvents, ticketmasterToActivity } from "@/lib/ticketmaster";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Catalog sync is not configured" }, { status: 503 });
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase server secret is not configured" }, { status: 503 });
    const events = await fetchSanDiegoEvents();
    const activities = events.map((event) => ticketmasterToActivity(event));
    const rows = activities.map((activity) => ({
      source_type: activity.sourceType,
      source_name: activity.sourceName,
      external_id: activity.externalId ?? null,
      source_url: activity.sourceUrl ?? null,
      title: activity.title,
      description: activity.description,
      image_url: activity.imageUrl || null,
      venue_name: activity.venue,
      address: activity.address ?? "",
      city: activity.neighborhood,
      starts_at: activity.startsAt,
      price_label: activity.priceLabel,
      topics: activity.semantic.categories.map((item) => item.category),
      status: activity.state === "cancelled" ? "cancelled" : "published",
    }));
    const { error } = rows.length ? await supabase.from("activities").upsert(rows, { onConflict: "external_id" }) : { error: null };
    if (error) throw error;
    return NextResponse.json({ fetched: events.length, persisted: rows.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 502 });
  }
}
