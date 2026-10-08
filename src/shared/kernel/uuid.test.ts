import { describe, expect, it } from "vitest";
import { isUuidV7 } from "./uuid";

describe("isUuidV7", () => {
  it("accepts canonical UUID v7 strings in either case", () => {
    expect(isUuidV7("018f6f3a-9b2c-7def-8abc-0123456789ab")).toBe(true);
    expect(isUuidV7("018F6F3A-9B2C-7DEF-BABC-0123456789AB")).toBe(true);
  });

  it("rejects other versions, bad variants and malformed strings", () => {
    expect(isUuidV7("018f6f3a-9b2c-4def-8abc-0123456789ab")).toBe(false);
    expect(isUuidV7("018f6f3a-9b2c-7def-7abc-0123456789ab")).toBe(false);
    expect(isUuidV7("018f6f3a-9b2c-7def-8abc-0123456789a")).toBe(false);
    expect(isUuidV7("")).toBe(false);
  });
});
