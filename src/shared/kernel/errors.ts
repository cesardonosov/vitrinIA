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

export function isDomainError(value: unknown): value is DomainError {
  if (typeof value !== "object" || value === null || value instanceof Error)
    return false;
  const candidate = value as {
    readonly code?: unknown;
    readonly message?: unknown;
  };
  return (
    typeof candidate.code === "string" && typeof candidate.message === "string"
  );
}
