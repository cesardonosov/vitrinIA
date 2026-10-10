import { type NextRequest, NextResponse } from "next/server";
import {
  buildCspReportOnly,
  CSP_REPORT_ONLY_HEADER,
  generateNonce,
} from "@/infra/security/csp";
import {
  isPortalHost,
  normalizeHost,
  STOREFRONT_SEGMENT,
} from "@/modules/storefront/application";

/**
 * Next 16 proxy (formerly middleware, ADR-0011). Never a security barrier:
 * it sets the CSP header and routes by host, nothing else.
 *
 * Routing (VIT-137): portal hosts get the app as is; any other host is
 * rewritten into `/s/<host>/...`, where the page resolves the store again
 * from its own Host header (ADR-0003 §2). Unknown hosts end in a 404 there.
 * Paths with a file extension (public assets) are never rewritten. Only the
 * API routes listed in STOREFRONT_API_ROUTES answer on store hosts; any other
 * /api path there is a 404 (threat model A10/C13: auth stays on the portal).
 */
const STOREFRONT_PREFIX = `/${STOREFRONT_SEGMENT}/`;
const PUBLIC_FILE = /\.[a-z0-9]+$/i;
const STOREFRONT_API_ROUTES: ReadonlySet<string> = new Set([
  "/api/csp-report",
  "/api/orders",
]);

function route(
  request: NextRequest,
  host: string | undefined,
): URL | "not-found" | undefined {
  const { pathname } = request.nextUrl;
  // The internal segment is only reachable through the rewrite below.
  if (
    pathname === `/${STOREFRONT_SEGMENT}` ||
    pathname.startsWith(STOREFRONT_PREFIX)
  ) {
    return "not-found";
  }
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  // Public files are the same on every host. The image optimiser fetches
  // them internally without the browser's Host, so this goes before the host check.
  if (!isApi && PUBLIC_FILE.test(pathname)) return undefined;
  if (host === undefined) return "not-found";
  if (isPortalHost(host)) return undefined;
  if (isApi) {
    return STOREFRONT_API_ROUTES.has(pathname) ? undefined : "not-found";
  }
  const url = request.nextUrl.clone();
  url.pathname = `${STOREFRONT_PREFIX}${host}${pathname === "/" ? "" : pathname}`;
  return url;
}

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCspReportOnly(nonce, process.env.NODE_ENV !== "production");

  // Next reads the nonce from this header to tag its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_REPORT_ONLY_HEADER, csp);

  const target = route(request, normalizeHost(request.headers.get("host")));
  const response =
    target === "not-found"
      ? new NextResponse("Not found", { status: 404 })
      : target
        ? NextResponse.rewrite(target, { request: { headers: requestHeaders } })
        : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_REPORT_ONLY_HEADER, csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
