import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "./lib/security-headers.mjs";

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV !== "production",
  );
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  // Next reads the incoming CSP and applies its nonce to hydration/scripts.
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.svg|apple-touch-icon.png|og.png|cleared-mark.svg|fonts/|samples/).*)",
  ],
};
