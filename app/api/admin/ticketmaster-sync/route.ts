import { NextResponse } from "next/server";
import { fetchSanDiegoEvents, ticketmasterToActivity } from "@/lib/ticketmaster";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enrichActivitiesWithTags } from "@/lib/activity-enrichment";
import { buildActivityDedupeKey } from "@/lib/interest-tags";

const LEGACY_TAGS = new Set(["live-music", "sports", "arts-culture", "food-drink", "outdoors", "learning", "games", "volunteering", "nightlife", "wellness", "thrifting", "community"]);

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Catalog sync is not configured" }, { status: 503 });
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase server secret is not configured" }, { status: 503 });
    const events = await fetchSanDiegoEvents();
    const incomingByKey = new Map<string, ReturnType<typeof ticketmasterToActivity>>();
    for (const event of events) {
      const activity = ticketmasterToActivity(event);
      const key = buildActivityDedupeKey(activity);
      if (!incomingByKey.has(key)) incomingByKey.set(key, activity);
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("activities")
      .select("*");
    if (existingError) throw existingError;
    const existingOwnerByKey = new Map(existingRows.map((row) => [row.dedupe_key, row.external_id]));
    const activities = [...incomingByKey.entries()]
      .filter(([key, activity]) => {
        const owner = existingOwnerByKey.get(key);
        return !owner || owner === activity.externalId;
      })
      .map(([, activity]) => activity);

    const currentExternalIds = new Set(activities.map((activity) => activity.externalId));
    const legacyInputs = existingRows
      .filter((row) => !currentExternalIds.has(row.external_id ?? undefined) && row.topics.some((tag) => LEGACY_TAGS.has(tag)))
      .map((row) => ({
        externalId: row.external_id ?? undefined,
        title: row.title,
        description: row.description,
        venue: row.venue_name,
        existing: row,
      }));
    const enriched = await enrichActivitiesWithTags([
      ...activities.map((activity) => ({ externalId: activity.externalId, title: activity.title, description: activity.description, venue: activity.venue, incoming: activity })),
      ...legacyInputs,
    ]);
    const { data: knownTags, error: tagsReadError } = await supabase
      .from("interest_tags")
      .select("label");
    if (tagsReadError) throw tagsReadError;
    const canonicalTagByLower = new Map(knownTags.map((tag) => [tag.label.toLowerCase(), tag.label]));
    const newTags = new Map<string, string>();
    for (const item of enriched) {
      for (const tag of item.tags) {
        if (!canonicalTagByLower.has(tag.toLowerCase())) newTags.set(tag.toLowerCase(), tag);
      }
    }
    if (newTags.size) {
      const { error: tagsWriteError } = await supabase.from("interest_tags").upsert(
        [...newTags.values()].map((label) => ({ label, is_core: false, source: "ai", active: true })),
        { onConflict: "label" },
      );
      if (tagsWriteError) throw tagsWriteError;
      for (const tag of newTags.values()) canonicalTagByLower.set(tag.toLowerCase(), tag);
    }

    const rows = enriched.map(({ activity: input, tags }) => {
      const topics = tags.map((tag) => canonicalTagByLower.get(tag.toLowerCase()) ?? tag);
      if ("incoming" in input) {
        const activity = input.incoming;
        return {
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
          topics,
          dedupe_key: buildActivityDedupeKey(activity),
          status: activity.state === "cancelled" ? "cancelled" : "published",
        };
      }
      return { ...input.existing, topics };
    });
    const incomingRows = rows.filter((row) => !("id" in row));
    const legacyRows = rows.filter((row) => "id" in row);
    if (incomingRows.length) {
      const { error } = await supabase.from("activities").upsert(incomingRows, { onConflict: "external_id" });
      if (error) throw error;
    }
    if (legacyRows.length) {
      const { error } = await supabase.from("activities").upsert(legacyRows, { onConflict: "id" });
      if (error) throw error;
    }
    return NextResponse.json({
      fetched: events.length,
      duplicatesRejected: events.length - incomingByKey.size + (incomingByKey.size - activities.length),
      aiTagged: enriched.filter((item) => item.usedAi).length,
      legacyRetagged: legacyInputs.length,
      dynamicTagsCreated: newTags.size,
      persisted: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Sync failed";
    console.error("Ticketmaster catalog sync failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
