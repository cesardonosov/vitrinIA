import { describe, expect, it } from "vitest";
import { StoreId } from "./store-id";

const VALID_V7 = "018f6f3a-9b2c-7def-8abc-0123456789ab";

describe("StoreId.parse", () => {
  it("accepts a UUID v7 and normalises it to lowercase", () => {
    const result = StoreId.parse(VALID_V7.toUpperCase());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(VALID_V7);
  });

  it("returns Result.err(InvalidStoreId) for anything that is not a UUID v7", () => {
    const invalid = [
      "",
      "not-a-uuid",
      "018f6f3a-9b2c-4def-8abc-0123456789ab", // v4
      "018f6f3a-9b2c-7def-cabc-0123456789ab", // bad variant nibble
      "018f6f3a9b2c7def8abc0123456789ab", // no dashes
      ` ${VALID_V7}`,
      `${VALID_V7}\n`,
      "018f6f3a-9b2c-7def-8abc-0123456789ag",
    ];

    for (const input of invalid) {
      const result = StoreId.parse(input);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("InvalidStoreId");
      expect(result.error.message).not.toContain(input.trim() || "<empty>");
    }
  });

  it("rejects non-string inputs coming from untyped boundaries", () => {
    for (const input of [undefined, null, 42, {}, [VALID_V7]]) {
      const result = StoreId.parse(input);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("InvalidStoreId");
    }
  });
});

describe("StoreId.equals", () => {
  it("compares by normalised value", () => {
    const a = StoreId.parse(VALID_V7);
    const b = StoreId.parse(VALID_V7.toUpperCase());
    const c = StoreId.parse("018f6f3a-9b2c-7def-8abc-0123456789ac");
    if (!a.ok || !b.ok || !c.ok) throw new Error("fixture");

    expect(StoreId.equals(a.value, b.value)).toBe(true);
    expect(StoreId.equals(a.value, c.value)).toBe(false);
  });
});
