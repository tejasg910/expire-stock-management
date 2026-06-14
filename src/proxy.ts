import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/provider/login", "/provider/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = getSessionCookie(request);

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const isProviderPath = pathname.startsWith("/provider");
  const isCustomerAuthPath = ["/my-pickups", "/claim"].some((p) => pathname.startsWith(p));

  if ((isProviderPath || isCustomerAuthPath) && !session) {
    const loginUrl = isProviderPath
      ? new URL("/provider/login", request.url)
      : new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/provider/:path*", "/my-pickups/:path*", "/claim/:path*"],
};
