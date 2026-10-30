import "server-only";

import { z } from "zod";
import { callMuseStructured } from "@/lib/meta";
import type { Activity } from "@/lib/types";
import { CORE_INTEREST_TAGS, heuristicInterestTags, normalizeInterestTags } from "@/lib/interest-tags";

const taggedActivitySchema = z.object({
  activities: z.array(z.object({
    externalId: z.string(),
    tags: z.array(z.string()).min(1).max(6),
  })),
});

type ActivityTagInput = Pick<Activity, "externalId" | "title" | "description" | "venue">;
export type EnrichedActivity<T extends ActivityTagInput = ActivityTagInput> = { activity: T; tags: string[]; usedAi: boolean };

async function enrichBatch<T extends ActivityTagInput>(activities: T[]): Promise<EnrichedActivity<T>[]> {
  const fallback = () => activities.map((activity) => ({
    activity,
    tags: heuristicInterestTags(activity),
    usedAi: false,
  }));

  try {
    const result = await callMuseStructured({
      name: "dyad_activity_tags",
      system: [
        "You classify public activities for Dyad, a friendship-through-activities app.",
        "Assign 1 to 6 concise interest tags to every activity. Prefer the supplied catalog tags.",
        "Tags must describe the primary reason someone would attend, not incidental amenities or details mentioned in venue copy.",
        "Ignore concessions, restaurants, bars, parking, sponsors, and other secondary details. Only use Food & drink or Trying new food when dining, tasting, cooking, or drinks are a central purpose of the activity.",
        "Create a new tag only when the catalog cannot accurately describe a meaningful activity topic.",
        "New tags must be neutral activity topics, 1 to 3 words, and must never describe demographics, identity, health, politics, religion, or sensitive traits.",
        "Return every externalId exactly once and do not invent facts.",
      ].join(" "),
      prompt: JSON.stringify({
        catalogTags: CORE_INTEREST_TAGS,
        activities: activities.map((activity) => ({
          externalId: activity.externalId,
          title: activity.title,
          description: activity.description.slice(0, 700),
          venue: activity.venue,
        })),
      }),
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          activities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                externalId: { type: "string" },
                tags: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
              },
              required: ["externalId", "tags"],
            },
          },
        },
        required: ["activities"],
      },
      validator: taggedActivitySchema,
    });

    if (!result) return fallback();
    const tagsById = new Map(result.data.activities.map((item) => [item.externalId, item.tags]));
    return activities.map((activity) => ({
      activity,
      tags: filterPrimaryPurposeTags(normalizeInterestTags(tagsById.get(activity.externalId ?? "") ?? [], `${activity.title} ${activity.description} ${activity.venue}`), activity),
      usedAi: true,
    }));
  } catch (error) {
    console.warn("AI activity tagging fell back to deterministic classification", error instanceof Error ? error.message : error);
    return fallback();
  }
}

function filterPrimaryPurposeTags(tags: string[], activity: ActivityTagInput) {
  const title = activity.title.toLowerCase();
  const foodIsCore = /food|tasting|dinner|brunch|culinary|cooking|beer|wine|cocktail|brew|cuisine|restaurant|market/.test(title);
  const outdoorsIsCore = /outdoor|open air|park|garden|nature|beach|hike|trail|camp|kayak|surf/.test(title);
  return tags.filter((tag) => {
    if (["Food & drink", "Trying new food"].includes(tag)) return foodIsCore;
    if (tag === "Outdoors") return outdoorsIsCore;
    return true;
  });
}

export async function enrichActivitiesWithTags<T extends ActivityTagInput>(activities: T[]): Promise<EnrichedActivity<T>[]> {
  const batches: T[][] = [];
  for (let index = 0; index < activities.length; index += 25) batches.push(activities.slice(index, index + 25));

  const results: EnrichedActivity<T>[] = [];
  for (let index = 0; index < batches.length; index += 2) {
    const pair = await Promise.all(batches.slice(index, index + 2).map(enrichBatch));
    results.push(...pair.flat());
  }
  return results;
}

