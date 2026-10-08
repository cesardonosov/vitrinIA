import { z } from "zod";

const FORBIDDEN_PUBLIC_NAME = /SECRET|KEY|TOKEN|PASSWORD/;

const schema = z
  .looseObject({
    APP_ENV: z.enum(["development", "test", "staging", "production"]),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    SESSION_SECRET: z.string().min(32),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
  })
  .superRefine((source, ctx) => {
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
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  return cached;
}
