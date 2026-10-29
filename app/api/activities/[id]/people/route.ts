import { NextResponse } from "next/server";
import { DEMO_PROFILES } from "@/lib/demo-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({ activityId: id, people: DEMO_PROFILES.slice(1).map(({ id: userId, name, initials, neighborhood, interests }) => ({ id: userId, name, initials, neighborhood, sharedInterests: interests.slice(0, 2) })) });
}
