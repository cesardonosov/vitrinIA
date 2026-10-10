import { describe, expect, it } from "vitest";
import { parseBuyerPhone } from "./phone";

describe("parseBuyerPhone", () => {
  it("normalises Chilean mobiles as people type them", () => {
    for (const raw of [
      "+56912345678",
      "+56 9 1234 5678",
      "56912345678",
      "9 1234 5678",
      "(9) 1234-5678",
      "912345678",
    ]) {
      expect(parseBuyerPhone(raw), raw).toBe("+56912345678");
    }
  });

  it("accepts other international numbers written with +", () => {
    expect(parseBuyerPhone("+54 9 11 2345 6789")).toBe("+5491123456789");
  });

  it("rejects everything else", () => {
    for (const raw of [
      "",
      "12345",
      "abc",
      "+0123456789",
      "12345678901234567890",
    ]) {
      expect(parseBuyerPhone(raw), raw).toBeUndefined();
    }
  });
});
