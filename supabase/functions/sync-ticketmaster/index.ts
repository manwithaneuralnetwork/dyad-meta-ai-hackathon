import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const TICKETMASTER_API_KEY = Deno.env.get("TICKETMASTER_API_KEY") ?? "";
const MODEL_API_KEY = Deno.env.get("MODEL_API_KEY") ?? "";
const META_MODEL = Deno.env.get("META_MODEL") ?? "muse-spark-1.3";
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORE_TAGS = [
  "Live music", "Coffee", "City walks", "Museums", "Trying new food", "Creative workshops",
  "Outdoor movies", "Book clubs", "Casual sports", "Volunteering", "Photography", "Game nights",
  "Nightlife", "Comedy", "Theatre", "Movies", "Art & galleries", "Fitness", "Outdoors", "Hiking",
  "Food & drink", "Markets", "Learning", "Community", "Dancing", "Wellness", "Technology",
  "Family activities", "Festivals", "Networking",
];

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!CRON_SECRET || request.headers.get("apikey") !== CRON_SECRET) return json({ error: "Unauthorized" }, 401);
  if (!TICKETMASTER_API_KEY) return json({ error: "TICKETMASTER_API_KEY is not configured" }, 503);

  try {
    const events = await fetchTicketmaster();
    const incomingByKey = new Map<string, ReturnType<typeof normalizeEvent>>();
    for (const event of events) {
      const activity = normalizeEvent(event);
      if (!incomingByKey.has(activity.dedupe_key)) incomingByKey.set(activity.dedupe_key, activity);
    }

    const { data: existing, error: existingError } = await supabase.from("activities").select("dedupe_key, external_id");
    if (existingError) throw existingError;
    const existingOwnerByKey = new Map((existing ?? []).map((row) => [row.dedupe_key, row.external_id]));
    const unique = [...incomingByKey.values()].filter((activity) => {
      const owner = existingOwnerByKey.get(activity.dedupe_key);
      return !owner || owner === activity.external_id;
    });

    const enriched = await enrichActivities(unique);
    const { data: storedTags, error: storedTagsError } = await supabase.from("interest_tags").select("label");
    if (storedTagsError) throw storedTagsError;
    const canonicalByLower = new Map((storedTags ?? []).map((tag) => [tag.label.toLowerCase(), tag.label]));
    const newTags = new Map<string, string>();
    for (const item of enriched) for (const tag of item.tags) {
      if (!canonicalByLower.has(tag.toLowerCase())) newTags.set(tag.toLowerCase(), tag);
    }
    if (newTags.size) {
      const { error } = await supabase.from("interest_tags").upsert(
        [...newTags.values()].map((label) => ({ label, is_core: false, source: "ai", active: true })),
        { onConflict: "label" },
      );
      if (error) throw error;
      for (const tag of newTags.values()) canonicalByLower.set(tag.toLowerCase(), tag);
    }

    const rows = enriched.map(({ activity, tags }) => ({
      ...activity,
      topics: tags.map((tag) => canonicalByLower.get(tag.toLowerCase()) ?? tag),
    }));
    if (rows.length) {
      const { error } = await supabase.from("activities").upsert(rows, { onConflict: "external_id" });
      if (error) throw error;
    }

    return json({
      status: "completed",
      fetched: events.length,
      duplicatesRejected: events.length - rows.length,
      aiTagged: enriched.filter((item) => item.usedAi).length,
      dynamicTagsCreated: newTags.size,
      persisted: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 502);
  }
});

async function fetchTicketmaster() {
  const end = new Date();
  end.setDate(end.getDate() + 60);
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", TICKETMASTER_API_KEY);
  url.searchParams.set("latlong", "32.7157,-117.1611");
  url.searchParams.set("radius", "30");
  url.searchParams.set("unit", "miles");
  url.searchParams.set("startDateTime", isoWithoutMillis(new Date()));
  url.searchParams.set("endDateTime", isoWithoutMillis(end));
  url.searchParams.set("size", "100");
  url.searchParams.set("sort", "date,asc");
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
  const body = await response.json();
  return body._embedded?.events ?? [];
}

function normalizeEvent(event: any) {
  const venue = event._embedded?.venues?.[0] ?? {};
  const price = event.priceRanges?.[0];
  const startsAt = event.dates?.start?.dateTime ?? `${event.dates?.start?.localDate}T19:00:00-07:00`;
  const city = venue.city?.name ?? "San Diego";
  return {
    source_type: "official",
    source_name: "Ticketmaster",
    external_id: event.id,
    source_url: event.url ?? null,
    title: event.name,
    description: event.info ?? event.pleaseNote ?? "Official San Diego event. Open the source listing for full details.",
    image_url: [...(event.images ?? [])].sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null,
    venue_name: venue.name ?? "San Diego venue",
    address: venue.address?.line1 ?? "",
    city,
    starts_at: startsAt,
    ends_at: null,
    price_label: price ? `$${Math.round(price.min ?? 0)}–$${Math.round(price.max ?? price.min ?? 0)}` : "See source",
    topics: [] as string[],
    status: event.dates?.status?.code === "cancelled" ? "cancelled" : "published",
    dedupe_key: dedupeKey(event.name, startsAt, city),
  };
}

async function enrichActivities(activities: ReturnType<typeof normalizeEvent>[]) {
  const batches = [];
  for (let index = 0; index < activities.length; index += 25) batches.push(activities.slice(index, index + 25));
  const results: Array<{ activity: ReturnType<typeof normalizeEvent>; tags: string[]; usedAi: boolean }> = [];
  for (let index = 0; index < batches.length; index += 2) {
    const pair = await Promise.all(batches.slice(index, index + 2).map(enrichBatch));
    results.push(...pair.flat());
  }
  return results;
}

async function enrichBatch(batch: ReturnType<typeof normalizeEvent>[]) {
  const fallback = () => batch.map((activity) => ({ activity, tags: heuristicTags(activity), usedAi: false }));
  if (!MODEL_API_KEY) return fallback();
  try {
    const response = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${MODEL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: META_MODEL,
        messages: [
          { role: "developer", content: "Assign 1 to 6 interest tags to every public activity. Prefer the supplied catalog. Create a concise neutral activity-topic tag only if the catalog is insufficient. Never create demographic, identity, health, political, religious, or sensitive-trait tags. Return every externalId exactly once and do not invent facts." },
          { role: "user", content: JSON.stringify({ catalogTags: CORE_TAGS, activities: batch.map((item) => ({ externalId: item.external_id, title: item.title, description: item.description, venue: item.venue_name })) }) },
        ],
        response_format: { type: "json_schema", json_schema: { name: "dyad_activity_tags", strict: true, schema: tagsSchema() } },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return fallback();
    const payload = await response.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    if (!Array.isArray(parsed.activities)) return fallback();
    const tagsById = new Map(parsed.activities.map((item: any) => [item.externalId, item.tags]));
    return batch.map((activity) => ({
      activity,
      tags: normalizeTags(tagsById.get(activity.external_id), activity),
      usedAi: true,
    }));
  } catch {
    return fallback();
  }
}

function tagsSchema() {
  return {
    type: "object", additionalProperties: false,
    properties: { activities: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: { externalId: { type: "string" }, tags: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } } },
      required: ["externalId", "tags"],
    } } }, required: ["activities"],
  };
}

function normalizeTags(values: unknown, activity: ReturnType<typeof normalizeEvent>) {
  if (!Array.isArray(values)) return heuristicTags(activity);
  const coreByLower = new Map(CORE_TAGS.map((tag) => [tag.toLowerCase(), tag]));
  const unique = new Map<string, string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const cleaned = value.replace(/\s+/g, " ").trim().replace(/^[#.,;:!\-–—]+|[#.,;:!\-–—]+$/g, "");
    if (!cleaned || cleaned.length > 60) continue;
    const tag = coreByLower.get(cleaned.toLowerCase()) ?? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
    unique.set(tag.toLowerCase(), tag);
  }
  return unique.size ? [...unique.values()].slice(0, 6) : heuristicTags(activity);
}

function heuristicTags(activity: ReturnType<typeof normalizeEvent>) {
  const text = `${activity.title} ${activity.description} ${activity.venue_name}`.toLowerCase();
  const tags: string[] = [];
  const add = (...items: string[]) => items.forEach((item) => { if (!tags.includes(item)) tags.push(item); });
  if (/concert|music|band|orchestra|jazz|rock|hip-hop|rap|dj\b/.test(text)) add("Live music");
  if (/comedy|comedian|stand-up/.test(text)) add("Comedy", "Nightlife");
  if (/theatre|theater|musical|ballet|opera/.test(text)) add("Theatre");
  if (/baseball|football|soccer|basketball|hockey|tennis|sport/.test(text)) add("Casual sports");
  if (/food|tasting|dinner|beer|wine|cocktail/.test(text)) add("Food & drink", "Trying new food");
  if (/festival|fair/.test(text)) add("Festivals");
  if (/outdoor|park|garden|nature|beach/.test(text)) add("Outdoors");
  if (/dance|dancing|salsa/.test(text)) add("Dancing");
  if (/night|evening|after hours/.test(text)) add("Nightlife");
  if (!tags.length) add("Community");
  return tags.slice(0, 6);
}

function compact(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, ""); }
function dedupeKey(title: string, startsAt: string, city: string) {
  const minute = new Date(startsAt).toISOString().slice(0, 16).replace(/\D/g, "");
  return `${compact(title)}|${minute}|${compact(city)}`;
}
function isoWithoutMillis(date: Date) { return date.toISOString().replace(/\.\d{3}Z$/, "Z"); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
