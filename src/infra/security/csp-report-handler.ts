import { logger } from "../logger";
import { MAX_REPORT_BYTES, parseCspReport } from "./csp-report";
import type { RateLimiter } from "./rate-limit";

export const MAX_KEY_LENGTH = 64;
/** Single bucket used when no trusted client address is available. */
export const GLOBAL_KEY = "global";

export type CspReportHandlerDeps = {
  /** Per-client limit. */
  perKey: RateLimiter;
  /** Process-wide limit, applied on top of the per-client one. */
  global: RateLimiter;
};

const noContent = (status: number) => new Response(null, { status });

/**
 * Only `cf-connecting-ip` is trusted (set by Cloudflare, the edge in front of
 * the app). `x-forwarded-for` is client-controlled and never used. Without
 * the header every caller shares one key.
 */
export function clientKey(request: Request): string {
  const ip = request.headers.get("cf-connecting-ip")?.trim();
  return ip ? ip.slice(0, MAX_KEY_LENGTH) : GLOBAL_KEY;
}

/** Reads at most MAX_REPORT_BYTES; returns null as soon as the limit is exceeded. */
async function readBounded(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REPORT_BYTES) {
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

export function createCspReportHandler(deps: CspReportHandlerDeps) {
  return async function handleCspReport(request: Request): Promise<Response> {
    // Per-key first so a throttled client does not consume the global budget.
    if (!deps.perKey.allow(clientKey(request)) || !deps.global.allow("*")) {
      logger.warn({ event: "security.rate_limited", route: "csp-report" });
      return noContent(429);
    }

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_REPORT_BYTES) return noContent(413);

    const raw = await readBounded(request);
    if (raw === null) return noContent(413);

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return noContent(400);
    }

    const violations = parseCspReport(payload);
    if (!violations) return noContent(400);

    for (const violation of violations) {
      logger.warn({ event: "security.csp_violation", ...violation });
    }
    return noContent(204);
  };
}
