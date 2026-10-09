import { describe, expect, it } from "vitest";
import { deepFreeze } from "./deep-freeze";

describe("deepFreeze", () => {
  it("freezes nested objects and arrays and returns the same reference", () => {
    const input = { a: { b: [{ c: 1 }] } };
    const frozen = deepFreeze(input);
    expect(frozen).toBe(input);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
    expect(Object.isFrozen(frozen.a.b[0])).toBe(true);
  });

  it("tolerates primitives, null and already-frozen values", () => {
    expect(deepFreeze(1)).toBe(1);
    expect(deepFreeze(null)).toBeNull();
    const frozen = Object.freeze({ x: { y: 1 } });
    // Already frozen at the top: not revisited (guards against cycles too).
    expect(deepFreeze(frozen)).toBe(frozen);
  });
});
