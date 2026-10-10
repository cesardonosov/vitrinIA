import { describe, expect, it } from "vitest";
import { Result } from "@/shared/kernel";
import { parseRut } from "./rut";

describe("parseRut", () => {
  it("accepts valid RUTs in any common format and canonicalises them", () => {
    for (const raw of [
      "12.345.678-5",
      "12345678-5",
      "123456785",
      " 12.345.678-5 ",
    ]) {
      expect(Result.unwrapOr(parseRut(raw), "")).toBe("12345678-5");
    }
    expect(Result.unwrapOr(parseRut("76.123.456-0"), "")).toBe("76123456-0");
  });

  it("handles the check digits K and 0", () => {
    expect(Result.unwrapOr(parseRut("7.000.013-k"), "")).toBe("7000013-K");
    expect(Result.unwrapOr(parseRut("10.000.004-0"), "")).toBe("10000004-0");
  });

  it("rejects a wrong check digit, bad shape and empty values", () => {
    for (const raw of [
      "12.345.678-4",
      "12345678-K",
      "1-9",
      "abc",
      "",
      "00000000-0",
      "123456789012-3",
      "12.345.678-55",
    ]) {
      const r = parseRut(raw);
      expect(Result.isErr(r), raw).toBe(true);
    }
  });

  it("never echoes the input in the error", () => {
    const r = parseRut("99.999.999-9");
    expect(Result.isErr(r) && JSON.stringify(r.error)).not.toContain("99");
  });
});
