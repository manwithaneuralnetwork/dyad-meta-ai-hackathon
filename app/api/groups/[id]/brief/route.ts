import { NextResponse } from "next/server";
import { z } from "zod";
import { callMuseStructured } from "@/lib/meta";

const outputSchema = z.object({ brief: z.string().min(20).max(700) });

export async function POST(request: Request) {
  const input = z.object({ activity: z.object({ title: z.string(), description: z.string(), venue: z.string(), startsAt: z.string() }).passthrough() }).parse(await request.json());
  const result = await callMuseStructured({
    name: "dyad_group_brief",
    system: "Write a practical group coordination brief using only activity facts. Include an easy opener and a check-in reminder. Do not claim accessibility, safety, parking, or venue facts not supplied. Do not mention private chat.",
    prompt: JSON.stringify(input.activity),
    schema: { type: "object", additionalProperties: false, properties: { brief: { type: "string" } }, required: ["brief"] },
    validator: outputSchema
  });
  const fallback = `Meet at ${input.activity.venue} 15 minutes early. Easy opener: what made you pick ${input.activity.title}? Confirm transportation before heading home and keep the group together when moving between spaces.`;
  return NextResponse.json({ brief: result?.data.brief ?? fallback, source: result ? "muse-spark-1.3" : "deterministic-fallback" });
}
