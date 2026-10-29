import type { Activity, ActivityCategory, EventSemanticProfile } from "@/lib/types";

type TicketmasterEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  dates?: { start?: { dateTime?: string; localDate?: string }; status?: { code?: string } };
  priceRanges?: Array<{ min?: number; max?: number }>;
  images?: Array<{ url: string; width: number }>;
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string }; subGenre?: { name?: string } }>;
  _embedded?: { venues?: Array<{ name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string }; address?: { line1?: string } }> };
};

export async function fetchSanDiegoEvents(): Promise<TicketmasterEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];
  const startDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const end = new Date();
  end.setDate(end.getDate() + 60);
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("latlong", "32.7157,-117.1611");
  url.searchParams.set("radius", "30");
  url.searchParams.set("unit", "miles");
  url.searchParams.set("startDateTime", startDateTime);
  url.searchParams.set("endDateTime", end.toISOString().replace(/\.\d{3}Z$/, "Z"));
  url.searchParams.set("size", "100");
  url.searchParams.set("sort", "date,asc");
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Ticketmaster returned ${response.status}`);
  const payload = await response.json();
  return payload._embedded?.events ?? [];
}

export function ticketmasterToActivity(event: TicketmasterEvent, semantic?: EventSemanticProfile): Activity {
  const venue = event._embedded?.venues?.[0];
  const price = event.priceRanges?.[0];
  return {
    id: `tm-${event.id}`,
    externalId: event.id,
    sourceType: "official",
    sourceName: "Ticketmaster",
    sourceUrl: event.url,
    title: event.name,
    description: event.info || event.pleaseNote || "Official San Diego event. Open the source listing for full details.",
    imageUrl: [...(event.images ?? [])].sort((a, b) => b.width - a.width)[0]?.url ?? "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80",
    venue: venue?.name ?? "San Diego venue",
    neighborhood: venue?.city?.name ?? "San Diego",
    distanceMiles: 5,
    startsAt: event.dates?.start?.dateTime ?? `${event.dates?.start?.localDate ?? new Date().toISOString().slice(0, 10)}T19:00:00-07:00`,
    priceBand: price?.min === 0 ? "free" : (price?.min ?? 30) <= 20 ? "budget" : (price?.min ?? 30) <= 60 ? "moderate" : "flexible",
    priceLabel: price ? `$${Math.round(price.min ?? 0)}–$${Math.round(price.max ?? price.min ?? 0)}` : "See source",
    state: event.dates?.status?.code === "cancelled" ? "cancelled" : "published",
    capacity: 6,
    semantic: semantic ?? heuristicSemantic(event)
  };
}

function heuristicSemantic(event: TicketmasterEvent): EventSemanticProfile {
  const labels = event.classifications?.flatMap((item) => [item.segment?.name, item.genre?.name, item.subGenre?.name]).filter(Boolean).join(" ").toLowerCase() ?? "";
  let category: ActivityCategory = "community";
  if (/music|concert|jazz|rock|pop/.test(labels)) category = "live-music";
  else if (/sport|baseball|soccer|basketball|hockey/.test(labels)) category = "sports";
  else if (/arts|theatre|theater|comedy|film|museum/.test(labels)) category = "arts-culture";
  else if (/food|drink/.test(labels)) category = "food-drink";
  return {
    categories: [{ category, weight: 1 }], vibes: category === "sports" ? ["energetic", "social"] : ["social", "creative"],
    socialModes: ["watching"], energy: category === "sports" ? "high" : "medium", likelyNoise: "medium", setting: "unknown",
    interactionPotential: "medium", conciseSummary: `A live ${category.replace("-", " ")} event with a shared focus for a new group.`, suggestedGroupSize: { min: 3, max: 6 }, confidence: 0.62
  };
}
