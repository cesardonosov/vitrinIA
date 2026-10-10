import { describe, expect, it } from "vitest";
import { Money, Result } from "@/shared/kernel";
import { createPrice, lowestPrice } from "./price";

function clp(amount: number): Money {
  const m = Money.of(amount, "CLP");
  if (Result.isErr(m)) throw new Error("bad test money");
  return m.value;
}

describe("createPrice", () => {
  it("accepts a positive integer CLP amount", () => {
    const price = createPrice(8900, "CLP");
    expect(Result.isOk(price) && price.value.amount).toBe(8900);
  });

  it.each([
    [0, "CLP"],
    [-100, "CLP"],
    [4.5, "CLP"],
    [Number.MAX_SAFE_INTEGER + 2, "CLP"],
    [100, "USD"],
  ])("rejects %s %s", (amount, currency) => {
    const price = createPrice(amount, currency);
    expect(Result.isErr(price) && price.error.code).toBe("InvalidPrice");
  });
});

describe("lowestPrice", () => {
  it("returns undefined for no prices", () => {
    expect(lowestPrice([])).toBeUndefined();
  });

  it("returns the smallest amount", () => {
    expect(lowestPrice([clp(8900), clp(4900), clp(15500)])?.amount).toBe(4900);
  });
});
