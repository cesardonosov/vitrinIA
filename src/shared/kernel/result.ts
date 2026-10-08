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

/** Collects results in order; the first error short-circuits. */
function all<T, E>(
  results: ReadonlyArray<Result<T, E>>,
): Result<ReadonlyArray<T>, E> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    values.push(result.value);
  }
  return ok(values);
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
