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
      const current = incomingByKey.get(activity.dedupe_key);
      incomingByKey.set(activity.dedupe_key, current ? preferDuplicate(current, activity) : activity);
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

    const rows = enriched.map(({ activity, tags, displayTitle }) => ({
      ...activity,
      title: displayTitle,
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
    dedupe_key: dedupeKey(startsAt, venue.name ?? "San Diego venue", venue.address?.line1 ?? "", city),
  };
}

async function enrichActivities(activities: ReturnType<typeof normalizeEvent>[]) {
  const batches = [];
  for (let index = 0; index < activities.length; index += 25) batches.push(activities.slice(index, index + 25));
  const results: Array<{ activity: ReturnType<typeof normalizeEvent>; tags: string[]; displayTitle: string; usedAi: boolean }> = [];
  for (let index = 0; index < batches.length; index += 2) {
    const pair = await Promise.all(batches.slice(index, index + 2).map(enrichBatch));
    results.push(...pair.flat());
  }
  return results;
}

async function enrichBatch(batch: ReturnType<typeof normalizeEvent>[]) {
  const fallback = () => batch.map((activity) => {
    const tags = heuristicTags(activity);
    return {
      activity,
      tags,
      displayTitle: informativeTitle(activity.title, tags),
      usedAi: false,
    };
  });
  if (!MODEL_API_KEY) return fallback();
  try {
    const response = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${MODEL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: META_MODEL,
        messages: [
          { role: "developer", content: "For every public activity, create an informative display title and assign 1 to 6 interest tags. A display title must be concise, preserve the event or performer identity, and make the activity type clear when the source title is vague (for example, 'Knox' becomes 'Knox Concert'). Keep an already-informative source title when changing it would not help. Do not add dates, venues, genres, or other facts unless they are supported by the supplied activity. Tags must describe the primary reason someone would attend, never incidental amenities or venue copy. Ignore concessions, restaurants, bars, parking, sponsors, and secondary details. Only assign Food & drink or Trying new food when dining, tasting, cooking, or drinks are a central purpose of the event. Only assign Outdoors when the outdoor setting or outdoor activity is central, not merely because a venue happens to be outside. Prefer the supplied tag catalog. Create a concise neutral activity-topic tag only if the catalog is insufficient. Never create demographic, identity, health, political, religious, or sensitive-trait tags. Return every externalId exactly once and do not invent facts." },
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
    const analysisById = new Map(parsed.activities.map((item: any) => [item.externalId, item]));
    return batch.map((activity) => {
      const analysis = analysisById.get(activity.external_id);
      const tags = normalizeTags(analysis?.tags, activity);
      return {
        activity,
        tags,
        displayTitle: normalizeDisplayTitle(analysis?.displayTitle, activity.title, tags),
        usedAi: true,
      };
    });
  } catch {
    return fallback();
  }
}

function tagsSchema() {
  return {
    type: "object", additionalProperties: false,
    properties: { activities: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: {
        externalId: { type: "string" },
        displayTitle: { type: "string", minLength: 2, maxLength: 120 },
        tags: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
      },
      required: ["externalId", "displayTitle", "tags"],
    } } }, required: ["activities"],
  };
}

function normalizeDisplayTitle(value: unknown, sourceTitle: string, tags: string[]) {
  if (typeof value !== "string") return informativeTitle(sourceTitle, tags);
  const title = value.replace(/\s+/g, " ").trim().replace(/^[\"'“”]+|[\"'“”]+$/g, "");
  if (title.length < 2 || title.length > 120) return informativeTitle(sourceTitle, tags);
  return informativeTitle(title, tags);
}

function informativeTitle(title: string, tags: string[]) {
  const clean = title.replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 3 || /\b(concert|show|performance|game|match|festival|workshop|class|tour|exhibit(?:ion)?|screening|movie|film|market|fair|meetup|conference|party|night|experience|event)\b/i.test(clean)) return clean;
  const suffix = tags.includes("Live music") ? "Concert"
    : tags.includes("Comedy") ? "Comedy Show"
    : tags.includes("Theatre") ? "Theatre Performance"
    : tags.includes("Casual sports") ? "Game"
    : tags.includes("Dancing") ? "Dance Event"
    : tags.includes("Festivals") ? "Festival"
    : tags.includes("Art & galleries") ? "Exhibition"
    : tags.includes("Fitness") ? "Fitness Event"
    : "";
  if (!suffix || clean.toLowerCase().endsWith(suffix.toLowerCase())) return clean;
  return `${clean} ${suffix}`;
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
    if (!isPrimaryPurposeTag(tag, activity)) continue;
    unique.set(tag.toLowerCase(), tag);
  }
  return unique.size ? [...unique.values()].slice(0, 6) : heuristicTags(activity);
}

function heuristicTags(activity: ReturnType<typeof normalizeEvent>) {
  const text = `${activity.title} ${activity.description} ${activity.venue_name}`.toLowerCase();
  const title = activity.title.toLowerCase();
  const tags: string[] = [];
  const add = (...items: string[]) => items.forEach((item) => { if (!tags.includes(item)) tags.push(item); });
  if (/concert|music|band|orchestra|jazz|rock|hip-hop|rap|dj\b/.test(text)) add("Live music");
  if (/comedy|comedian|stand-up/.test(text)) add("Comedy", "Nightlife");
  if (/theatre|theater|musical|ballet|opera/.test(text)) add("Theatre");
  if (/baseball|football|soccer|basketball|hockey|tennis|sport/.test(text)) add("Casual sports");
  if (/food|tasting|dinner|brunch|culinary|cooking|beer|wine|cocktail|brew|cuisine|restaurant|market/.test(title)) add("Food & drink", "Trying new food");
  if (/festival|fair/.test(text)) add("Festivals");
  if (/outdoor|open air|park|garden|nature|beach|hike|trail|camp|kayak|surf/.test(title)) add("Outdoors");
  if (/dance|dancing|salsa/.test(text)) add("Dancing");
  if (/night|evening|after hours/.test(text)) add("Nightlife");
  if (!tags.length) add("Community");
  return tags.slice(0, 6);
}

function isPrimaryPurposeTag(tag: string, activity: ReturnType<typeof normalizeEvent>) {
  const title = activity.title.toLowerCase();
  if (["Food & drink", "Trying new food"].includes(tag)) return /food|tasting|dinner|brunch|culinary|cooking|beer|wine|cocktail|brew|cuisine|restaurant|market/.test(title);
  if (tag === "Outdoors") return /outdoor|open air|park|garden|nature|beach|hike|trail|camp|kayak|surf/.test(title);
  return true;
}

function compact(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, ""); }
function canonicalVenue(value: string) {
  return value
    .replace(/\s*(?:-|–|—)?\s*(?:san diego|sd)$/i, "")
    .replace(/\s+tavern$/i, "")
    .trim();
}
function duplicateQualityScore(activity: ReturnType<typeof normalizeEvent>) {
  const nonEvent = /(add.?on|not an event ticket|parking|vip.*upgrade)/i.test(activity.title);
  const informativeType = /\b(concert|show|performance|game|festival|tour|workshop|class|party|event)\b/i.test(activity.title);
  return (nonEvent ? -10_000 : 0) + (informativeType ? 100 : 0) + Math.min(activity.title.length, 140) + Math.min(activity.description.length, 500) / 20;
}
function preferDuplicate(current: ReturnType<typeof normalizeEvent>, candidate: ReturnType<typeof normalizeEvent>) {
  return duplicateQualityScore(candidate) > duplicateQualityScore(current) ? candidate : current;
}
function dedupeKey(startsAt: string, venue: string, address: string, city: string) {
  const minute = new Date(startsAt).toISOString().slice(0, 16).replace(/\D/g, "");
  return `${minute}|${compact(canonicalVenue(venue))}|${compact(address)}|${compact(city)}`;
}
function isoWithoutMillis(date: Date) { return date.toISOString().replace(/\.\d{3}Z$/, "Z"); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
