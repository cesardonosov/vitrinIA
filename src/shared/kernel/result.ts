/**
 * Result<T, E>: explicit success/failure without exceptions.
 *
 * Business failures are values, never thrown. Use cases return `Result` and
 * callers decide what to do with the error (VITRINIA.md §6.2, dod-check #4).
 */

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

function ok<T, E = never>(value: T): Result<T, E> {
  return Object.freeze({ ok: true, value }) as Ok<T>;
}

function err<T = never, E = unknown>(error: E): Result<T, E> {
  return Object.freeze({ ok: false, error }) as Err<E>;
}

function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

function andThen<T, U, E, F>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return result.ok ? fn(result.value) : result;
}

function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

function match<T, E, R>(
  result: Result<T, E>,
  handlers: { readonly ok: (value: T) => R; readonly err: (error: E) => R },
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

// Distribute over the `Ok | Err` union so the non-matching member contributes `never`.
type OkOf<R> = R extends Ok<infer T> ? T : never;
type ErrOf<R> = R extends Err<infer E> ? E : never;

/** Success values of a tuple or array of results, position by position. */
export type OkValues<Rs extends ReadonlyArray<Result<unknown, unknown>>> = {
  readonly [K in keyof Rs]: OkOf<Rs[K]>;
};

/**
 * Collects results in order; the first error short-circuits.
 *
 * With a tuple literal the value types are kept per position
 * (`Result<readonly [A, B], EA | EB>`); with a homogeneous array it is
 * `Result<ReadonlyArray<T>, E>`.
 */
function all<const Rs extends ReadonlyArray<Result<unknown, unknown>>>(
  results: Rs,
): Result<OkValues<Rs>, ErrOf<Rs[number]>> {
  const values: unknown[] = [];
  for (const result of results) {
    if (!result.ok) return result as Err<ErrOf<Rs[number]>>;
    values.push(result.value);
  }
  return ok(values as unknown as OkValues<Rs>);
}

export const Result = Object.freeze({
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrapOr,
  match,
  all,
});
