import {
  type PlaceOrderDeps,
  type PlaceOrderError,
  placeOrder,
} from "../../application";
import {
  placeOrderRequestSchema,
  safeIssues,
  toOrderRequest,
} from "./place-order-request";

/** Body cap (threat model orders O3). The largest legitimate order is a few KB. */
export const MAX_BODY_BYTES = 16 * 1024;

const HEADERS = {
  "content-type": "application/json",
  // O17: the answer carries the buyer's data and a wa.me link. Never cached or shared.
  "cache-control": "private, no-store",
} as const;

function json(
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HEADERS, ...extra },
  });
}

/** `Origin` must be the same site as `Host` (O13). A missing Origin is refused too. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

/** Edge whose client-address headers are trusted. Comes from the validated `TRUSTED_PROXY`. */
export type TrustedProxy = "cloudflare";

export interface PlaceOrderHandlerOptions {
  /** Read per request so the environment is validated at runtime, not at build. */
  readonly trustedProxy?: () => TrustedProxy | undefined;
}

/**
 * Address used for the rate limit and logs, truncated (/24 for IPv4, /48 for IPv6) so a
 * log line or event cannot identify one person. The forwarding headers are client-controlled
 * unless the origin is reachable only through a known edge, so they are read ONLY when
 * `trustedProxy` is set (`TRUSTED_PROXY=cloudflare`, set by DevOps once VIT-158 holds). Then
 * `cf-connecting-ip` wins, else the LAST hop of `x-forwarded-for` (the one the nearest proxy
 * appended). Without the flag every request shares one bucket (threat model orders R2/O12).
 */
export function clientKeyOf(
  headers: Headers,
  trustedProxy?: TrustedProxy,
): string {
  if (trustedProxy !== "cloudflare") return "unknown";
  const cf = headers.get("cf-connecting-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return truncateAddress(cf || forwarded || "");
}

export function truncateAddress(raw: string): string {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/.exec(raw);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`;
  if (raw.includes(":") && /^[0-9a-fA-F:.]+$/.test(raw) && raw.length <= 45) {
    return `${raw.toLowerCase().split(":").slice(0, 3).join(":")}::`;
  }
  return "unknown";
}

async function readBounded(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function fromError(error: PlaceOrderError): Response {
  switch (error.code) {
    case "StoreNotFound":
      return json(404, { error: "NOT_FOUND" });
    case "InvalidOrder":
      return json(400, { error: "INVALID_ORDER", issues: error.issues });
    case "ItemUnavailable":
      return json(422, { error: "ITEM_UNAVAILABLE" });
    case "RateLimited":
      return json(429, { error: "RATE_LIMITED" }, { "retry-after": "600" });
    case "HumanVerificationFailed":
      return json(403, { error: "VERIFICATION_FAILED" });
    case "IdempotencyConflict":
      return json(409, { error: "IDEMPOTENCY_CONFLICT" });
  }
}

/**
 * `POST /api/orders` (VIT-186). Checks, in order, before any state changes: same origin,
 * body size, JSON, strict schema. The use case resolves the store from the Host header and
 * does the rest. No branch logs or returns anything the buyer typed.
 */
export function createPlaceOrderHandler(
  deps: PlaceOrderDeps,
  options: PlaceOrderHandlerOptions = {},
) {
  return async function handlePlaceOrder(request: Request): Promise<Response> {
    if (!isSameOrigin(request)) return json(403, { error: "FORBIDDEN" });

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BODY_BYTES) return json(413, { error: "TOO_LARGE" });
    const raw = await readBounded(request);
    if (raw === null) return json(413, { error: "TOO_LARGE" });

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json(400, { error: "INVALID_JSON" });
    }
    const body = placeOrderRequestSchema.safeParse(payload);
    if (!body.success) {
      return json(400, {
        error: "INVALID_ORDER",
        issues: safeIssues(body.error),
      });
    }

    try {
      const result = await placeOrder(deps, {
        host: request.headers.get("host"),
        clientKey: clientKeyOf(request.headers, options.trustedProxy?.()),
        idempotencyKey: body.data.idempotencyKey,
        humanToken: body.data.turnstileToken,
        request: toOrderRequest(body.data),
      });
      return result.ok ? json(200, result.value) : fromError(result.error);
    } catch (error) {
      // Unexpected failure: the type and driver code only. Messages can echo buyer data.
      const code = (error as { code?: unknown }).code;
      deps.log.warn("order.failed", {
        error: error instanceof Error ? error.constructor.name : "unknown",
        ...(typeof code === "string" ? { code } : {}),
      });
      return json(500, { error: "INTERNAL" });
    }
  };
}
