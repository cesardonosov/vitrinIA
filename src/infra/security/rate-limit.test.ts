import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  it("blocks after the limit and recovers in the next window", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.allow("a", 0)).toBe(true);
    expect(rl.allow("a", 1)).toBe(true);
    expect(rl.allow("a", 2)).toBe(false);
    expect(rl.allow("b", 2)).toBe(true);
    expect(rl.allow("a", 1000)).toBe(true);
  });

  it("fails closed when the key table is full", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 1 });
    expect(rl.allow("a", 0)).toBe(true);
    expect(rl.allow("b", 1)).toBe(false);
    expect(rl.allow("b", 1001)).toBe(true);
  });
});
