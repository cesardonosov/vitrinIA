import { describe, expect, it } from "vitest";
import { isUuidV7 } from "@/shared/kernel";
import { uuidv7 } from "./uuid-v7";

describe("uuidv7", () => {
  it("produces canonical lowercase UUID v7 accepted by the kernel", () => {
    for (let i = 0; i < 200; i++) {
      const id = uuidv7();
      expect(isUuidV7(id)).toBe(true);
      expect(id).toBe(id.toLowerCase());
    }
  });

  it("encodes the timestamp in the first 48 bits", () => {
    const at = Date.UTC(2026, 9, 8, 12, 0, 0);
    const id = uuidv7(at);
    const hex = id.replace(/-/g, "").slice(0, 12);
    expect(Number.parseInt(hex, 16)).toBe(at);
  });

  it("sorts by creation time", () => {
    const a = uuidv7(1_000_000_000_000);
    const b = uuidv7(1_000_000_000_001);
    expect(a < b).toBe(true);
  });

  it("is unique for the same millisecond", () => {
    const at = 1_800_000_000_000;
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7(at)));
    expect(ids.size).toBe(1000);
  });

  it("rejects a timestamp outside 48 bits", () => {
    expect(() => uuidv7(-1)).toThrow(RangeError);
    expect(() => uuidv7(2 ** 48)).toThrow(RangeError);
    expect(() => uuidv7(Number.NaN)).toThrow(RangeError);
  });
});
