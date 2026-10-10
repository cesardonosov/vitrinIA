import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  generateOrderCode,
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
} from "./order-code";

describe("generateOrderCode", () => {
  it("has the agreed length and only unambiguous characters", () => {
    const code = generateOrderCode((n) => randomInt(n));
    expect(code).toHaveLength(ORDER_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[ILO01]/);
  });

  it("maps indexes to the alphabet and rejects nothing it is given", () => {
    expect(generateOrderCode(() => 0)).toBe("AAAAAAA");
    expect(generateOrderCode((n) => n - 1)).toBe("9999999");
  });

  it("is not ordered and not correlated with the previous code (O18)", () => {
    const codes = Array.from({ length: 200 }, () =>
      generateOrderCode((n) => randomInt(n)),
    );
    expect(new Set(codes).size).toBe(codes.length);
    const sorted = [...codes].sort();
    // A sequential generator would come out already sorted.
    expect(codes).not.toEqual(sorted);
    const firstChars = new Set(codes.map((c) => c[0]));
    expect(firstChars.size).toBeGreaterThan(10);
  });
});
