import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_ACTIVITIES } from "@/lib/demo-data";

export async function POST(request: Request) {
  const input = z.object({ mutual: z.boolean(), previousActivityId: z.string() }).parse(await request.json());
  if (!input.mutual) return NextResponse.json({ connectionCreated: false, suggestions: [] });
  return NextResponse.json({ connectionCreated: true, suggestions: DEMO_ACTIVITIES.filter((item) => item.id !== input.previousActivityId).slice(0, 3).map((item) => item.id) });
}
