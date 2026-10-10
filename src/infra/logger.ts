import pino, { type DestinationStream, type Logger } from "pino";

export type { Logger };

const LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
type Level = (typeof LEVELS)[number];

export const REDACTED = "[redacted]";
export const SCRUBBED_EMAIL = "[email]";
export const SCRUBBED_PHONE = "[phone]";

/**
 * Keys that never reach a log line, at the top level or one level deep.
 * Personal data (VITRINIA §6.8) and secrets: the value is replaced, the key kept.
 */
const SENSITIVE_KEYS = [
  "email",
  "phone",
  "whatsapp",
  "fullName",
  "buyerName",
  "address",
  "rut",
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "set-cookie",
  "connectionString",
  "databaseUrl",
  "DATABASE_URL",
  "SESSION_SECRET",
] as const;

const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => {
  const safe = /^[A-Za-z_$][\w$]*$/.test(key) ? key : `["${key}"]`;
  const nested = safe.startsWith("[") ? `*${safe}` : `*.${safe}`;
  // Request headers sit two levels deep (`req.headers.cookie`).
  return [safe, nested, `*.headers${safe.startsWith("[") ? safe : `.${safe}`}`];
});

// Second line of defence for values under keys we did not foresee
// (a free-text message, an error message that echoes input).
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g;
// Chilean numbers, with or without +56 and separators: +56 9 1234 5678, 912345678.
// Not inside ids: no word character, `+` or `-` right before, none right after.
const PHONE = /(?<![\w+-])(?:\+?56[\s.-]?)?9[\s.-]?\d{4}[\s.-]?\d{4}(?![\w-])/g;

// Credentials inside URLs: postgres://user:pass@host and ?token=, ?code= (magic links).
const DB_URL = /postgres(?:ql)?:\/\/[^\s"'<>]+/g;
const URL_SECRET =
  /\b(token|code|key|secret|password|signature)=[^&\s"'<>#]+/gi;

/**
 * Replaces anything that looks like an email, a Chilean mobile number, a
 * database URL or a secret query parameter. Exported for Sentry's beforeSend.
 */
export function scrub(value: string): string {
  return value
    .replace(DB_URL, `${REDACTED}`)
    .replace(URL_SECRET, `$1=${REDACTED}`)
    .replace(EMAIL, SCRUBBED_EMAIL)
    .replace(PHONE, SCRUBBED_PHONE);
}

export const TRUNCATED = "[truncated]";
const MAX_DEPTH = 4;

function scrubDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrub(value);
  if (value === null || typeof value !== "object") return value;
  // Fail closed: anything nested deeper than we scrub is dropped, not logged raw.
  if (depth > MAX_DEPTH) return TRUNCATED;
  // An Error under any key: its enumerable fields (pg's `detail`, `table`...)
  // can echo user input, so it gets the same treatment as `err`.
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value))
    out[key] = scrubDeep(v, depth + 1);
  return out;
}

/**
 * Keeps type, code and the scrubbed message. The stack is left out: its first
 * line repeats the message and dependency paths carry `@`, which would break
 * the "no `@` in logs" check. Stacks belong to the error tracker, not to logs.
 */
export function serializeError(value: unknown): unknown {
  if (!(value instanceof Error)) return scrubDeep(value);
  const { code } = value as Error & { code?: unknown };
  return {
    type: value.constructor.name,
    message: scrub(value.message),
    ...(typeof code === "string" || typeof code === "number" ? { code } : {}),
  };
}

function levelFrom(value: string | undefined): Level {
  return LEVELS.find((level) => level === value) ?? "info";
}

export interface LoggerOptions {
  readonly level?: string;
  /** Tests pass a stream to read the lines back. Defaults to stdout. */
  readonly destination?: DestinationStream;
}

/**
 * Structured JSON logs (pino). Never log request bodies, buyer data or
 * secrets: keys in SENSITIVE_KEYS are redacted and any string that looks like
 * an email or phone number is scrubbed. Context goes in fields
 * (`event`, `request_id`, `store_id`), not in the message.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return pino(
    {
      level: levelFrom(options.level),
      base: { service: "vitrinia" },
      messageKey: "msg",
      timestamp: pino.stdTimeFunctions.isoTime,
      serializers: { err: serializeError },
      redact: { paths: REDACT_PATHS, censor: REDACTED },
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => scrubDeep(object) as Record<string, unknown>,
      },
      hooks: {
        logMethod(args, method) {
          method.apply(
            this,
            args.map((arg) =>
              typeof arg === "string" ? scrub(arg) : arg,
            ) as Parameters<typeof method>,
          );
        },
      },
    },
    options.destination,
  );
}

/** Process logger. Reads LOG_LEVEL directly so it works before getEnv() runs. */
export const logger: Logger = createLogger({ level: process.env.LOG_LEVEL });
