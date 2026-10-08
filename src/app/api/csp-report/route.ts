import { MAX_REPORT_BYTES, parseCspReport } from "@/infra/security/csp-report";
import { createRateLimiter } from "@/infra/security/rate-limit";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const noContent = (status: number) => new Response(null, { status });

function clientKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || "unknown";
}

export async function POST(request: Request) {
  if (!limiter.allow(clientKey(request))) {
    console.warn(
      JSON.stringify({ event: "security.rate_limited", route: "csp-report" }),
    );
    return noContent(429);
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REPORT_BYTES) return noContent(413);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_REPORT_BYTES)
    return noContent(413);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return noContent(400);
  }

  const violations = parseCspReport(payload);
  if (!violations) return noContent(400);

  for (const violation of violations) {
    console.warn(
      JSON.stringify({ event: "security.csp_violation", ...violation }),
    );
  }
  return noContent(204);
}
