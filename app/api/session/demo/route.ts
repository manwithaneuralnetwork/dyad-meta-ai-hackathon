import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cleanupDemoIdentity, createDemoIdentity, DEMO_SESSION_HOURS } from "@/lib/demo-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !createSupabaseAdminClient()) return NextResponse.redirect(new URL("/login?error=demo-unavailable", `${protocol}://${host}`));

  let identity: Awaited<ReturnType<typeof createDemoIdentity>> | null = null;
  try {
    identity = await createDemoIdentity();
  } catch {
    return NextResponse.redirect(new URL("/login?error=demo-unavailable", `${protocol}://${host}`));
  }
  const response = NextResponse.redirect(new URL("/onboarding/interests", `${protocol}://${host}`));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (error) {
    await cleanupDemoIdentity(identity.userId).catch(() => undefined);
    return NextResponse.redirect(new URL("/login?error=demo-unavailable", `${protocol}://${host}`));
  }
  response.cookies.set("dyad-app-mode", "demo", {
    httpOnly: false,
    maxAge: DEMO_SESSION_HOURS * 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: protocol === "https",
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function DELETE(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Demo cleanup is unavailable." }, { status: 503 });

  const response = NextResponse.json({ ended: true });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data } = await supabase.auth.getUser();
  if (data.user) await cleanupDemoIdentity(data.user.id);
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") || cookie.name === "dyad-app-mode") response.cookies.delete(cookie.name);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
