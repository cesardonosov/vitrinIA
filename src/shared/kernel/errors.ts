/**
 * Typed domain errors.
 *
 * A domain error is plain, frozen data with a literal `code` that works as a
 * discriminant in `switch` statements. It is never an `Error` subclass and is
 * never thrown: it travels inside `Result.err(...)`. Being plain data it can
 * cross server-action boundaries and be logged without leaking stack traces.
 *
 * Modules extend it with their own fields:
 *
 *   type ProductNotFound = DomainError<"ProductNotFound"> & { readonly productId: string };
 */

export interface DomainError<Code extends string = string> {
  readonly code: Code;
  readonly message: string;
}

export function domainError<Code extends string>(
  code: Code,
  message: string,
): DomainError<Code> {
  return Object.freeze({ code, message });
}

/**
 * Boundary guard: tells a domain error apart from an unexpected exception.
 *
 * Deliberately strict: only plain objects (prototype `Object.prototype` or `null`)
 * with a non-empty string `code` and a string `message` qualify. `Error`
 * instances and class instances are rejected even if they carry `code` and
 * `message` (Node system errors do: `{ code: "ECONNREFUSED", message }`).
 */
export function isDomainError(value: unknown): value is DomainError {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const candidate = value as {
    readonly code?: unknown;
    readonly message?: unknown;
  };
  return (
    typeof candidate.code === "string" &&
    candidate.code.length > 0 &&
    typeof candidate.message === "string"
  );
}
