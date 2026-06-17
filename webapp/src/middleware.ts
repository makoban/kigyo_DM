import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/api/stripe/webhook") {
    return NextResponse.json({ received: true, paused: true });
  }

  if (path.startsWith("/api/cron/")) {
    return NextResponse.json({
      success: true,
      paused: true,
      message: "起業サーチDM営業サービスは現在停止中です。",
    });
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json(
      { error: "起業サーチDM営業サービスは現在停止中です。" },
      { status: 503 }
    );
  }

  if (path !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
