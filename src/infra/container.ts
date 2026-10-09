import { createCspReportHandler } from "./security/csp-report-handler";
import { createRateLimiter } from "./security/rate-limit";

/** Composition root: wires platform adapters for src/app/ (ADR-0008). */
export const cspReportHandler = createCspReportHandler({
  perKey: createRateLimiter({ limit: 30, windowMs: 60_000 }),
  global: createRateLimiter({ limit: 300, windowMs: 60_000 }),
});
