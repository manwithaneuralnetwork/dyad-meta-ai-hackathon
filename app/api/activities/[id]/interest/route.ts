import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const input = z.object({ interested: z.boolean(), discoverable: z.boolean() }).parse(await request.json());
  return NextResponse.json({ activityId: id, ...input, persisted: false, message: "Connect Supabase to persist this server-side; demo mode persists in the browser." });
}
