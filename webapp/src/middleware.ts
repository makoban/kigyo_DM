import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sessionToken =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token");

  if (!sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding/signup";
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
