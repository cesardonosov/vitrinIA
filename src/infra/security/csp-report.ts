import { z } from "zod";

export const MAX_REPORT_BYTES = 8 * 1024;

const text = z.string().max(2048);

const legacyReport = z.object({
  "csp-report": z.object({
    "document-uri": text.optional(),
    "blocked-uri": text.optional(),
    "effective-directive": text.optional(),
    "violated-directive": text.optional(),
    disposition: text.optional(),
  }),
});

const modernReport = z
  .array(
    z.object({
      type: z.literal("csp-violation"),
      body: z.object({
        documentURL: text.optional(),
        blockedURL: text.optional(),
        effectiveDirective: text.optional(),
        disposition: text.optional(),
      }),
    }),
  )
  .min(1)
  .max(10);

export type SafeCspViolation = {
  directive: string;
  blockedOrigin: string;
  documentOrigin: string;
  disposition: string;
};

/** Keeps scheme+host only. Paths and queries can carry tokens or personal data. */
export function originOnly(value: string | undefined): string {
  if (!value) return "unknown";
  if (["inline", "eval", "self", "data", "blob"].includes(value)) return value;
  try {
    const url = new URL(value);
    return url.host ? `${url.protocol}//${url.host}` : url.protocol;
  } catch {
    return "invalid";
  }
}

function token(value: string | undefined): string {
  return value && /^[a-z-]{1,40}$/.test(value) ? value : "unknown";
}

/** Returns null when the payload is not a valid CSP report. */
export function parseCspReport(payload: unknown): SafeCspViolation[] | null {
  const legacy = legacyReport.safeParse(payload);
  if (legacy.success) {
    const r = legacy.data["csp-report"];
    return [
      {
        directive: token(
          r["effective-directive"] ?? r["violated-directive"]?.split(" ")[0],
        ),
        blockedOrigin: originOnly(r["blocked-uri"]),
        documentOrigin: originOnly(r["document-uri"]),
        disposition: token(r.disposition),
      },
    ];
  }
  const modern = modernReport.safeParse(payload);
  if (modern.success) {
    return modern.data.map(({ body }) => ({
      directive: token(body.effectiveDirective),
      blockedOrigin: originOnly(body.blockedURL),
      documentOrigin: originOnly(body.documentURL),
      disposition: token(body.disposition),
    }));
  }
  return null;
}
