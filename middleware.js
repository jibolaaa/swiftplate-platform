// Allows the mobile apps (Expo) to call our API from outside the
// website's own origin. Native apps don't strictly need CORS, but
// Snack's web preview does, and being explicit costs nothing here.
import { NextResponse } from "next/server";

export function middleware(request) {
  const res = request.method === "OPTIONS"
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export const config = { matcher: "/api/:path*" };
