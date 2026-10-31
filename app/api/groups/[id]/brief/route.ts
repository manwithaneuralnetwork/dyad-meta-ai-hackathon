import { NextResponse } from "next/server";
import { buildFallbackGroupBrief, groupBriefSchema, type GroupBriefActivity } from "@/lib/group-brief";
import { callMuseStructured } from "@/lib/meta";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    arrival: { type: "string" },
    opener: { type: "string" },
    checkIn: { type: "string" },
  },
  required: ["title", "arrival", "opener", "checkIn"],
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase.from("group_members").select("group_id").eq("group_id", id).eq("user_id", userId).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify this group" }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Group membership required" }, { status: 403 });

  const { data: group, error: groupError } = await supabase.from("groups").select("activity_id").eq("id", id).maybeSingle();
  if (groupError) return NextResponse.json({ error: "Unable to load this group" }, { status: 500 });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const { data: activity, error: activityError } = await supabase.from("activities").select("title, description, venue_name, address, city, starts_at, ends_at, topics").eq("id", group.activity_id).maybeSingle();
  if (activityError) return NextResponse.json({ error: "Unable to load this activity" }, { status: 500 });
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const facts: GroupBriefActivity = {
    title: activity.title,
    description: activity.description,
    venue: activity.venue_name,
    address: [activity.address, activity.city].filter(Boolean).join(" · "),
    startsAt: activity.starts_at,
    endsAt: activity.ends_at,
    topics: activity.topics,
  };
  const fallback = buildFallbackGroupBrief(facts);
  let brief = fallback;
  let source = "deterministic-fallback";

  try {
    const result = await callMuseStructured({
      name: "dyad_group_meetup_brief",
      system: "Create a warm, concise meetup coordination card using only the supplied activity facts. Do not use or request private chat. Do not invent parking, accessibility, safety, ticket, or venue details. Arrival must help the group choose a meeting point, opener must be a natural question, and checkIn must be a simple coordination reminder.",
      prompt: JSON.stringify(facts),
      schema: responseSchema,
      validator: groupBriefSchema,
      timeoutMs: 8_000,
    });
    if (result) {
      brief = result.data;
      source = result.model;
    }
  } catch {
    // Keep the same useful response shape when Meta is slow or unavailable.
  }

  return NextResponse.json({ brief, source }, { headers: { "Cache-Control": "private, no-store" } });
}
