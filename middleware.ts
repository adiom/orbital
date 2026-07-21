import { NextResponse } from "next/server";

// Dev-only sandbox/documentation pages that must not be reachable in production.
// Scoped narrowly via `config.matcher` so this middleware never touches auth,
// API, or app routes.
export function middleware() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/test-artifact",
    "/test-artifact/:path*",
    "/docs",
    "/docs/:path*",
    "/api/docs",
    "/api/docs/:path*",
  ],
};
