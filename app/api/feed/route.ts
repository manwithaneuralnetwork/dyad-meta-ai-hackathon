import { NextResponse } from "next/server";
import { DEMO_ACTIVITIES } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ activities: DEMO_ACTIVITIES, mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase-ready" : "demo" });
}
