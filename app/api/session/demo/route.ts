import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const response = NextResponse.redirect(new URL("/onboarding/interests", `${protocol}://${host}`));
  response.cookies.set("dyad-app-mode", "demo", {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    secure: protocol === "https",
  });
  return response;
}
