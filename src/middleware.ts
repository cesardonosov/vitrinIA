import { type NextRequest, NextResponse } from "next/server";
import {
  buildCspReportOnly,
  CSP_REPORT_ONLY_HEADER,
  generateNonce,
} from "@/infra/security/csp";

// Pass-through. Host-to-store resolution is added in a later issue.
// This middleware is never a security barrier.
// It only sets response headers (CSP report-only with nonce); it never authorizes.
export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCspReportOnly(nonce, process.env.NODE_ENV !== "production");

  // Next reads the nonce from this header to tag its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_REPORT_ONLY_HEADER, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_REPORT_ONLY_HEADER, csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
