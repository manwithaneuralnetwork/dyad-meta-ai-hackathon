import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const TICKETMASTER_API_KEY = Deno.env.get("TICKETMASTER_API_KEY") ?? "";
const MODEL_API_KEY = Deno.env.get("MODEL_API_KEY") ?? "";
const META_MODEL = Deno.env.get("META_MODEL") ?? "muse-spark-1.3";
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const categories = ["live-music", "sports", "arts-culture", "food-drink", "outdoors", "learning", "games", "volunteering", "nightlife", "wellness", "thrifting", "community"];

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const providedKey = request.headers.get("apikey");
  if (!SUPABASE_SECRET_KEY || providedKey !== SUPABASE_SECRET_KEY) return json({ error: "Unauthorized" }, 401);
  if (!TICKETMASTER_API_KEY) return json({ error: "TICKETMASTER_API_KEY is not configured" }, 503);

  const { data: run, error: runError } = await supabase.from("event_sync_runs").insert({ status: "running" }).select("id").single();
  if (runError) return json({ error: runError.message }, 500);

  try {
    const events = await fetchTicketmaster();
    const externalIds = events.map((event) => event.id);
    const { data: existing, error: existingError } = await supabase.from("activities").select("id, external_id, source_hash").eq("source_name", "Ticketmaster").in("external_id", externalIds);
    if (existingError) throw existingError;
    const existingByExternalId = new Map((existing ?? []).map((item) => [item.external_id, item]));

    const normalized = await Promise.all(events.map(normalizeEvent));
    const changed = normalized.filter((item) => existingByExternalId.get(item.external_id)?.source_hash !== item.source_hash);
    let enrichedCount = 0;

    for (let index = 0; index < changed.length; index += 20) {
      const batch = changed.slice(index, index + 20);
      const { data: rows, error: upsertError } = await supabase.from("activities").upsert(batch, { onConflict: "source_name,external_id" }).select("id, external_id");
      if (upsertError) throw upsertError;
      const semantics = await enrichBatch(batch);
      const activityIdByExternalId = new Map((rows ?? []).map((row) => [row.external_id, row.id]));
      const semanticRows = semantics.map((semantic) => ({
        activity_id: activityIdByExternalId.get(semantic.externalId),
        categories: semantic.categories,
        vibes: semantic.vibes,
        social_modes: semantic.socialModes,
        energy: semantic.energy,
        likely_noise: semantic.likelyNoise,
        setting: semantic.setting,
        interaction_potential: semantic.interactionPotential,
        concise_summary: semantic.conciseSummary,
        suggested_group_min: semantic.suggestedGroupSize.min,
        suggested_group_max: semantic.suggestedGroupSize.max,
        confidence: semantic.confidence,
        model_name: MODEL_API_KEY ? META_MODEL : "heuristic-fallback",
        prompt_version: "event-profile-v1",
        enriched_at: new Date().toISOString()
      })).filter((row) => row.activity_id);
      if (semanticRows.length) {
        const { error: semanticError } = await supabase.from("event_semantic_profiles").upsert(semanticRows, { onConflict: "activity_id" });
        if (semanticError) throw semanticError;
        const { error: publishError } = await supabase.from("activities").update({ state: "published" }).in("id", semanticRows.map((row) => row.activity_id));
        if (publishError) throw publishError;
      }
      enrichedCount += semanticRows.length;
    }

    await supabase.from("activities").update({ state: "expired" }).eq("source_name", "Ticketmaster").lt("starts_at", new Date().toISOString()).neq("state", "cancelled");
    await supabase.from("event_sync_runs").update({ status: "completed", completed_at: new Date().toISOString(), fetched_count: events.length, changed_count: changed.length, enriched_count: enrichedCount }).eq("id", run.id);
    return json({ status: "completed", fetched: events.length, changed: changed.length, enriched: enrichedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("event_sync_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message.slice(0, 2000) }).eq("id", run.id);
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
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
  const body = await response.json();
  return body._embedded?.events ?? [];
}

async function normalizeEvent(event: any) {
  const venue = event._embedded?.venues?.[0] ?? {};
  const price = event.priceRanges?.[0];
  const sourcePayload = {
    name: event.name,
    info: event.info ?? event.pleaseNote ?? "",
    dates: event.dates,
    classifications: event.classifications,
    venue: { name: venue.name, city: venue.city?.name, address: venue.address?.line1, location: venue.location },
    priceRanges: event.priceRanges,
    url: event.url
  };
  const sourceHash = await sha256(JSON.stringify(sourcePayload));
  const image = [...(event.images ?? [])].sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;
  const latitude = Number(venue.location?.latitude);
  const longitude = Number(venue.location?.longitude);
  const minPrice = price?.min;
  return {
    source_type: "official",
    source_name: "Ticketmaster",
    external_id: event.id,
    source_url: event.url,
    title: event.name,
    description: event.info ?? event.pleaseNote ?? "Official San Diego event. Open the source for details.",
    image_url: image,
    venue_name: venue.name ?? "San Diego venue",
    neighborhood: venue.city?.name ?? "San Diego",
    location: Number.isFinite(latitude) && Number.isFinite(longitude) ? `POINT(${longitude} ${latitude})` : null,
    starts_at: event.dates?.start?.dateTime ?? `${event.dates?.start?.localDate}T19:00:00-07:00`,
    price_band: minPrice === 0 ? "free" : (minPrice ?? 30) <= 20 ? "budget" : (minPrice ?? 30) <= 60 ? "moderate" : "flexible",
    price_label: price ? `$${Math.round(price.min ?? 0)}–$${Math.round(price.max ?? price.min ?? 0)}` : "See source",
    capacity: 6,
    state: event.dates?.status?.code === "cancelled" ? "cancelled" : "imported",
    source_hash: sourceHash,
    source_payload: sourcePayload
  };
}

async function enrichBatch(batch: any[]) {
  if (!MODEL_API_KEY) return batch.map(heuristicProfile);
  const response = await fetch("https://api.meta.ai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${MODEL_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: META_MODEL,
      messages: [
        { role: "developer", content: "Classify each event into Dyad's shared activity taxonomy. Keep Ticketmaster facts unchanged. Use only evidence in the supplied event. Unknown is better than guessing, especially for accessibility, setting, and noise." },
        { role: "user", content: JSON.stringify(batch.map((event) => ({ externalId: event.external_id, title: event.title, description: event.description, venue: event.venue_name, source: event.source_payload }))) }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "dyad_event_profiles", strict: true, schema: eventProfilesJsonSchema(batch.map((item) => item.external_id)) }
      }
    })
  });
  if (!response.ok) return batch.map(heuristicProfile);
  const payload = await response.json();
  try {
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
    return Array.isArray(parsed.events) && parsed.events.length === batch.length ? parsed.events : batch.map(heuristicProfile);
  } catch { return batch.map(heuristicProfile); }
}

function eventProfilesJsonSchema(ids: string[]) {
  return {
    type: "object", additionalProperties: false,
    properties: { events: { type: "array", minItems: ids.length, maxItems: ids.length, items: {
      type: "object", additionalProperties: false,
      properties: {
        externalId: { type: "string", enum: ids },
        categories: { type: "array", minItems: 1, maxItems: 4, items: { type: "object", additionalProperties: false, properties: { category: { type: "string", enum: categories }, weight: { type: "number", minimum: 0, maximum: 1 } }, required: ["category", "weight"] } },
        vibes: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", enum: ["relaxed", "energetic", "creative", "competitive", "social"] } },
        socialModes: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", enum: ["watching", "participating", "learning", "exploring"] } },
        energy: { type: "string", enum: ["low", "medium", "high"] }, likelyNoise: { type: "string", enum: ["low", "medium", "high", "unknown"] },
        setting: { type: "string", enum: ["indoor", "outdoor", "mixed", "unknown"] }, interactionPotential: { type: "string", enum: ["low", "medium", "high"] },
        conciseSummary: { type: "string", maxLength: 500 }, suggestedGroupSize: { type: "object", additionalProperties: false, properties: { min: { type: "integer", minimum: 2, maximum: 12 }, max: { type: "integer", minimum: 2, maximum: 12 } }, required: ["min", "max"] },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["externalId", "categories", "vibes", "socialModes", "energy", "likelyNoise", "setting", "interactionPotential", "conciseSummary", "suggestedGroupSize", "confidence"]
    } } }, required: ["events"]
  };
}

function heuristicProfile(event: any) {
  const labels = JSON.stringify(event.source_payload?.classifications ?? "").toLowerCase();
  const category = /music|concert|jazz/.test(labels) ? "live-music" : /sport|baseball|soccer|basketball/.test(labels) ? "sports" : /arts|theatre|theater|comedy|film/.test(labels) ? "arts-culture" : "community";
  return { externalId: event.external_id, categories: [{ category, weight: 1 }], vibes: category === "sports" ? ["energetic", "social"] : ["social", "creative"], socialModes: ["watching"], energy: category === "sports" ? "high" : "medium", likelyNoise: "unknown", setting: "unknown", interactionPotential: "medium", conciseSummary: `A live ${category.replace("-", " ")} event with a shared focus for a new group.`, suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.6 };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isoWithoutMillis(date: Date) { return date.toISOString().replace(/\.\d{3}Z$/, "Z"); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
