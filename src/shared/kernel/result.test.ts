import { describe, expect, it } from "vitest";
import { Result } from "./result";

/** Compile-time type equality (strict, union-safe). */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

describe("Result", () => {
  it("wraps a success value", () => {
    const result = Result.ok(42);

    expect(result.ok).toBe(true);
    expect(Result.isOk(result)).toBe(true);
    expect(Result.isErr(result)).toBe(false);
    if (result.ok) expect(result.value).toBe(42);
  });

  it("wraps a failure without throwing", () => {
    const result = Result.err("boom");

    expect(result.ok).toBe(false);
    expect(Result.isErr(result)).toBe(true);
    expect(Result.isOk(result)).toBe(false);
    if (!result.ok) expect(result.error).toBe("boom");
  });

  it("maps the success value and leaves errors untouched", () => {
    expect(Result.map(Result.ok(2), (n) => n * 2)).toEqual(Result.ok(4));
    expect(Result.map(Result.err<number, string>("e"), (n) => n * 2)).toEqual(
      Result.err("e"),
    );
  });

  it("maps the error and leaves success untouched", () => {
    expect(Result.mapErr(Result.err("e"), (e) => `${e}!`)).toEqual(
      Result.err("e!"),
    );
    expect(Result.mapErr(Result.ok<number, string>(1), (e) => `${e}!`)).toEqual(
      Result.ok(1),
    );
  });

  it("chains computations that may fail", () => {
    const parsePositive = (n: number): Result<number, "negative"> =>
      n >= 0 ? Result.ok(n) : Result.err("negative");

    expect(Result.andThen(Result.ok(3), parsePositive)).toEqual(Result.ok(3));
    expect(Result.andThen(Result.ok(-3), parsePositive)).toEqual(
      Result.err("negative"),
    );
    expect(
      Result.andThen(Result.err<number, "negative">("negative"), parsePositive),
    ).toEqual(Result.err("negative"));
  });

  it("unwraps with a fallback", () => {
    expect(Result.unwrapOr(Result.ok(1), 0)).toBe(1);
    expect(Result.unwrapOr(Result.err<number, string>("e"), 0)).toBe(0);
  });

  it("folds both branches with match", () => {
    const fold = (r: Result<number, string>) =>
      Result.match(r, {
        ok: (n) => `ok:${n}`,
        err: (e) => `err:${e}`,
      });

    expect(fold(Result.ok(1))).toBe("ok:1");
    expect(fold(Result.err("x"))).toBe("err:x");
  });

  it("collects a list of results into a result of a list, stopping at the first error", () => {
    expect(Result.all([Result.ok(1), Result.ok(2)])).toEqual(Result.ok([1, 2]));
    expect(
      Result.all([Result.ok(1), Result.err("first"), Result.err("second")]),
    ).toEqual(Result.err("first"));
    expect(Result.all([])).toEqual(Result.ok([]));
  });

  it("keeps per-position types for tuples and a list type for arrays", () => {
    const tuple = Result.all([
      Result.ok<number, "ea">(1),
      Result.ok<string, "eb">("two"),
    ]);
    const tupleTyped: Equal<
      typeof tuple,
      Result<readonly [number, string], "ea" | "eb">
    > = true;
    expect(tupleTyped).toBe(true);
    expect(tuple).toEqual(Result.ok([1, "two"]));

    const list: Result<number, string>[] = [Result.ok(1), Result.ok(2)];
    const listTyped: Equal<
      ReturnType<typeof Result.all<typeof list>>,
      Result<readonly number[], string>
    > = true;
    expect(listTyped).toBe(true);
  });

  it("produces frozen values so callers cannot mutate them", () => {
    expect(Object.isFrozen(Result.ok(1))).toBe(true);
    expect(Object.isFrozen(Result.err("e"))).toBe(true);
  });
});
