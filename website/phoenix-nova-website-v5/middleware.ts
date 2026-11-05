import { NextResponse, type NextRequest } from "next/server";
import { nodeRequestHeaders } from "./lib/node-request-headers";

export function middleware(request: NextRequest) {
  // Worker deployments already derive their own internal headers.
  if (process.env.PHOENIX_RUNTIME_TARGET !== "node") return NextResponse.next();
  return NextResponse.next({
    request: { headers: nodeRequestHeaders(request.headers, request.nextUrl.pathname) },
  });
}

export const config = { matcher: "/:path*" };
