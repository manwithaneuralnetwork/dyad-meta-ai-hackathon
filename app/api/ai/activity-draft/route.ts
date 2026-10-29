import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVITY_CATEGORIES } from "@/lib/types";
import { callMuseStructured } from "@/lib/meta";

const draftSchema = z.object({ title: z.string(), description: z.string(), category: z.enum(ACTIVITY_CATEGORIES), suggestedGroupSize: z.object({ min: z.number(), max: z.number() }), safetyNote: z.string() });

export async function POST(request: Request) {
  const input = z.object({ idea: z.string().min(10).max(800) }).parse(await request.json());
  const result = await callMuseStructured({
    name: "dyad_activity_draft",
    system: "Turn the user's idea into a concise public-place community activity draft. Do not invent a venue, date, accessibility claim, or factual detail. Reject private-home or unsafe meetups in safetyNote.",
    prompt: input.idea,
    schema: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string", enum: [...ACTIVITY_CATEGORIES] }, suggestedGroupSize: { type: "object", additionalProperties: false, properties: { min: { type: "number" }, max: { type: "number" } }, required: ["min", "max"] }, safetyNote: { type: "string" } }, required: ["title", "description", "category", "suggestedGroupSize", "safetyNote"] },
    validator: draftSchema
  });
  return NextResponse.json({ draft: result?.data ?? { title: "Community plan", description: input.idea, category: "community", suggestedGroupSize: { min: 3, max: 6 }, safetyNote: "Choose a public venue before publishing." }, source: result ? "muse-spark-1.3" : "deterministic-fallback" });
}
