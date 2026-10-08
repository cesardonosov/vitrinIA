import { describe, expect, it } from "vitest";
import { isPlainText, TEXT_LIMITS } from "./text";

describe("isPlainText", () => {
  it("treats HTML as ordinary characters (React escapes on render)", () => {
    expect(isPlainText('<script>alert("x")</script>')).toBe(true);
    expect(isPlainText("Poleras & jeans <3")).toBe(true);
  });

  it("allows newlines and tabs", () => {
    expect(isPlainText("línea 1\nlínea 2\tcol")).toBe(true);
  });

  it("rejects control characters", () => {
    expect(isPlainText("a\u0000b")).toBe(false);
    expect(isPlainText("a\u001bb")).toBe(false);
    expect(isPlainText("a\u007fb")).toBe(false);
    expect(isPlainText("a\rb")).toBe(false);
  });

  it("limits are positive integers", () => {
    for (const limit of Object.values(TEXT_LIMITS)) {
      expect(Number.isInteger(limit) && limit > 0).toBe(true);
    }
  });
});
