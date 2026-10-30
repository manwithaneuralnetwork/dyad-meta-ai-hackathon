import { NextResponse } from "next/server";
import { z } from "zod";
import { aiRunMetadata, callMuseStructured } from "@/lib/meta";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({ prompt: z.string().min(3).max(600), profile: z.record(z.string(), z.unknown()).optional() });
const responseSchema = z.object({ activityIds: z.array(z.string()).min(1).max(3), explanation: z.string().max(300) });

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const input = requestSchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "Activity service is not configured" }, { status: 503 });
    const { data: rows, error } = await supabase.from("activities").select("id,title,description,starts_at,price_label,city,topics").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(50);
    if (error) throw error;
    const catalog = rows.map((activity) => ({ id: activity.id, title: activity.title, description: activity.description, startsAt: activity.starts_at, price: activity.price_label, neighborhood: activity.city, categories: activity.topics, vibes: [] as string[] }));
    if (!catalog.length) return NextResponse.json({ activityIds: [], explanation: "No published activities are available yet.", ai: aiRunMetadata("plan-something", startedAt, null) });
    const result = await callMuseStructured({
      name: "dyad_plan_options",
      system: "You are Dyad's activity planner. Select only IDs from the supplied grounded catalog. Do not invent events, dates, venues, prices, accessibility, or IDs. Prefer plans that fit the explicit request and user profile.",
      prompt: JSON.stringify({ request: input.prompt, profile: input.profile, catalog }),
      schema: { type: "object", additionalProperties: false, properties: { activityIds: { type: "array", items: { type: "string", enum: catalog.map((item) => item.id) }, minItems: 1, maxItems: 3 }, explanation: { type: "string" } }, required: ["activityIds", "explanation"] },
      validator: responseSchema
    });
    const fallbackIds = catalog.slice(0, 3).map((item) => item.id);
    return NextResponse.json({ activityIds: result?.data.activityIds ?? fallbackIds, explanation: result?.data.explanation ?? "Grounded local matches", ai: aiRunMetadata("plan-something", startedAt, result) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid planning request" }, { status: 400 });
  }
}
