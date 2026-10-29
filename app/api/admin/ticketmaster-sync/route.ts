import { NextResponse } from "next/server";
import { fetchSanDiegoEvents, ticketmasterToActivity } from "@/lib/ticketmaster";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const events = await fetchSanDiegoEvents();
    return NextResponse.json({ fetched: events.length, activities: events.map((event) => ticketmasterToActivity(event)), persisted: false, message: "The Supabase Edge Function performs production upserts and enrichment." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 502 });
  }
}
