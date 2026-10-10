import { z } from "zod";
import { logger } from "./logger";
import { TURNSTILE_TEST_SECRET_KEY } from "./security/turnstile-keys";

const FORBIDDEN_PUBLIC_NAME = /SECRET|KEY|TOKEN|PASSWORD/;

function emptyAsUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

const schema = z
  .looseObject({
    APP_ENV: z.enum(["development", "test", "staging", "production"]),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SESSION_SECRET: z.string().min(32),
    // Optional variables: an empty string (as in a copied .env.example) is
    // treated as absent so the default applies.
    LOG_LEVEL: z.preprocess(
      emptyAsUndefined,
      z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),
    ),
    // Cloudflare Turnstile (checkout). Optional outside staging and production, where
    // Cloudflare's public test keys apply (see security/turnstile.ts). Empty = absent.
    TURNSTILE_SITE_KEY: z.preprocess(
      emptyAsUndefined,
      z.string().min(1).optional(),
    ),
    TURNSTILE_SECRET_KEY: z.preprocess(
      emptyAsUndefined,
      z.string().min(1).optional(),
    ),
    // Edge in front of the app whose client-address headers may be trusted (rate limit key).
    // Unset = trust none: one shared bucket. Set by DevOps only when the origin is reachable
    // solely through that edge (VIT-158). A value outside the list fails startup.
    TRUSTED_PROXY: z.preprocess(
      emptyAsUndefined,
      z.enum(["cloudflare"]).optional(),
    ),
    // Test-only override of the siteverify endpoint (E2E fake). Refused in staging and production.
    TURNSTILE_VERIFY_URL: z.preprocess(
      emptyAsUndefined,
      z.url({ protocol: /^https?$/ }).optional(),
    ),
  })
  .superRefine((source, ctx) => {
    if (source.APP_ENV === "production" || source.APP_ENV === "staging") {
      for (const name of [
        "TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET_KEY",
      ] as const) {
        if (source[name] === undefined) {
          ctx.addIssue({ code: "custom", path: [name], message: "required" });
        }
      }
      if (source.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["TURNSTILE_SECRET_KEY"],
          message: "test key",
        });
      }
      if (source.TURNSTILE_VERIFY_URL !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["TURNSTILE_VERIFY_URL"],
          message: "not allowed here",
        });
      }
    }
    for (const name of Object.keys(source)) {
      if (name.startsWith("NEXT_PUBLIC_") && FORBIDDEN_PUBLIC_NAME.test(name)) {
        ctx.addIssue({
          code: "custom",
          path: [name],
          message: "public variable name looks like a secret",
        });
      }
    }
  });

export type Env = Omit<z.output<typeof schema>, `NEXT_PUBLIC_${string}`> &
  Record<string, unknown>;

/**
 * Thrown when the environment is invalid. The message lists variable NAMES
 * only; values are never included.
 */
export class EnvValidationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid environment variables: ${variables.join(", ")}`);
    this.name = "EnvValidationError";
    this.variables = variables;
  }
}

export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = new Set<string>();
    for (const issue of result.error.issues) {
      names.add(String(issue.path[0] ?? "(root)"));
    }
    throw new EnvValidationError([...names].sort());
  }
  return result.data;
}

let cached: Env | undefined;

/**
 * Validates once at startup. On failure prints only variable names and exits 1.
 */
export function getEnv(): Env {
  if (cached) return cached;
  try {
    cached = parseEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      logger.fatal(
        { event: "env.invalid", variables: error.variables },
        error.message,
      );
      process.exit(1);
    }
    throw error;
  }
  return cached;
}
