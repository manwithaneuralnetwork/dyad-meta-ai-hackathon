import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_ACTIVITIES } from "@/lib/demo-data";
import { aiRunMetadata, callMuseStructured } from "@/lib/meta";

const requestSchema = z.object({ prompt: z.string().min(3).max(600), profile: z.record(z.string(), z.unknown()).optional() });
const responseSchema = z.object({ activityIds: z.array(z.string()).min(1).max(3), explanation: z.string().max(300) });

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const input = requestSchema.parse(await request.json());
    const catalog = DEMO_ACTIVITIES.map((activity) => ({ id: activity.id, title: activity.title, description: activity.description, startsAt: activity.startsAt, price: activity.priceLabel, neighborhood: activity.neighborhood, categories: activity.semantic.categories.map((item) => item.category), vibes: activity.semantic.vibes }));
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
