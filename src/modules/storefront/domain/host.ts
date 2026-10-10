/**
 * Host normalisation for storefront routing (ADR-0003 §1, VIT-137).
 *
 * Mirrors the rules of `resolve_host()` in the database so routing and
 * resolution agree on what a host is: ASCII allow-list before lowercasing
 * (no Unicode aliasing), port and trailing dot removed, DNS label shape.
 * Anything else is `undefined`, which routing turns into a 404.
 */

const ASCII_HOST = /^[A-Za-z0-9.:-]+$/;
const DNS_NAME =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

export function normalizeHost(
  raw: string | null | undefined,
): string | undefined {
  if (!raw || raw.length > 260) return undefined;
  let host = raw.trim();
  if (!ASCII_HOST.test(host)) return undefined;
  host = host
    .toLowerCase()
    .replace(/:[0-9]{1,5}$/, "")
    .replace(/\.$/, "");
  if (host.length === 0 || host.length > 253 || !DNS_NAME.test(host)) {
    return undefined;
  }
  return host;
}

/**
 * Hosts that serve the portal, never a storefront. Every other host is
 * routed to the storefront and must resolve to a verified store or 404.
 */
export const PORTAL_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "vitrinia.cl",
  "www.vitrinia.cl",
  "app.vitrinia.cl",
]);

export function isPortalHost(host: string): boolean {
  return PORTAL_HOSTS.has(host);
}

/** Internal path segment the proxy rewrites storefront requests into. */
export const STOREFRONT_SEGMENT = "s";
