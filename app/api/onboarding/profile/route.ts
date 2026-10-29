import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVITY_CATEGORIES, type OnboardingAnswers, type Vibe } from "@/lib/types";
import { buildLocalInterestProfile } from "@/lib/matching";
import { aiRunMetadata, callMuseStructured } from "@/lib/meta";

const answerSchema = z.object({
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(5), freeText: z.string().max(500), availability: z.array(z.string()).min(1),
  neighborhood: z.string().min(1).max(80), travelRadiusMiles: z.number().min(1).max(50), priceBand: z.enum(["free", "budget", "moderate", "flexible"]),
  groupSize: z.enum(["duo", "small", "medium"]), socialEnergy: z.enum(["low", "medium", "high"]), noiseTolerance: z.enum(["low", "medium", "high"]),
  setting: z.enum(["indoor", "outdoor", "either"]), accessibilityRequirements: z.array(z.string().max(100)).max(10), explorationWeight: z.number().min(0).max(1)
});
const museSchema = z.object({ summary: z.string().min(20).max(300), vibes: z.array(z.enum(["relaxed", "energetic", "creative", "competitive", "social"])).min(1).max(4) });

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const answers = answerSchema.parse(await request.json()) as OnboardingAnswers;
    const fallback = buildLocalInterestProfile(answers);
    const result = await callMuseStructured({
      name: "dyad_interest_profile",
      system: "You translate explicit activity preferences into a concise, non-psychological interest summary. Never infer protected traits, health, income, or personality. Use only the supplied answers.",
      prompt: JSON.stringify(answers),
      schema: { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, vibes: { type: "array", items: { type: "string", enum: ["relaxed", "energetic", "creative", "competitive", "social"] }, minItems: 1, maxItems: 4 } }, required: ["summary", "vibes"] },
      validator: museSchema
    });
    const profile = result ? { ...fallback, summary: result.data.summary, vibes: result.data.vibes as Vibe[] } : fallback;
    return NextResponse.json({ profile, ai: aiRunMetadata("onboarding-profile", startedAt, result) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid onboarding answers" }, { status: 400 });
  }
}
