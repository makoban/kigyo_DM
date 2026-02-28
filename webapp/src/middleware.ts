import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const sessionToken =
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token");

  if (!sessionToken) {
    const path = req.nextUrl.pathname;

    if (path.startsWith("/dashboard")) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding/signup";
      url.searchParams.set("redirect", path);
      return NextResponse.redirect(url);
    }

    if (path.startsWith("/admin") && path !== "/admin/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
