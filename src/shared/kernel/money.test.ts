import { describe, expect, it } from "vitest";
import { Money } from "./money";
import { Result } from "./result";

const clp = (amount: number): Money => {
  const result = Money.of(amount, "CLP");
  if (!result.ok) throw new Error(`fixture: ${result.error.message}`);
  return result.value;
};

/** Small deterministic PRNG so the property tests are reproducible without extra dependencies. */
const lcg = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
};

describe("Money.of", () => {
  it("creates an immutable CLP amount from an integer", () => {
    const result = Money.of(1990, "CLP");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount).toBe(1990);
    expect(result.value.currency).toBe("CLP");
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("accepts zero and negative integers (sign is a ledger concern, not a Money one)", () => {
    expect(Money.of(0, "CLP").ok).toBe(true);
    expect(Money.of(-500, "CLP").ok).toBe(true);
  });

  it("rejects non-integer amounts with InvalidMoney", () => {
    for (const amount of [
      19.9,
      0.1 + 0.2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const result = Money.of(amount, "CLP");
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("InvalidMoney");
      expect(result.error.reason).toBe("NotAnInteger");
    }
  });

  it("rejects integers outside the safe range", () => {
    const result = Money.of(Number.MAX_SAFE_INTEGER + 2, "CLP");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("InvalidMoney");
    expect(result.error.reason).toBe("OutOfRange");
  });

  it("rejects unknown currencies coming from untyped boundaries", () => {
    for (const currency of ["USD", "clp", "", "CLP "]) {
      const result = Money.of(100, currency);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.code).toBe("InvalidMoney");
      expect(result.error.reason).toBe("UnknownCurrency");
    }
  });
});

describe("negative zero", () => {
  it("normalises -0 to 0 on construction and arithmetic", () => {
    const fromOf = Money.of(-0, "CLP");
    expect(fromOf.ok).toBe(true);
    if (fromOf.ok) expect(fromOf.value.amount).toBe(0);

    const diff = clp(5).subtract(clp(5));
    expect(diff.ok).toBe(true);
    if (diff.ok) expect(diff.value.amount).toBe(0);

    const product = clp(-5).multiply(0);
    expect(product.ok).toBe(true);
    if (product.ok) {
      expect(product.value.amount).toBe(0);
      expect(product.value.toString()).toBe("0 CLP");
    }
  });
});

describe("Money.zero", () => {
  it("is the additive identity", () => {
    const zero = Money.zero("CLP");

    expect(zero.amount).toBe(0);
    expect(zero.isZero()).toBe(true);
    expect(clp(1990).add(zero)).toEqual(Result.ok(clp(1990)));
  });
});

describe("Money.add", () => {
  it("adds two CLP amounts as an exact integer", () => {
    const result = clp(1990).add(clp(2010));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.amount).toBe(4000);
    expect(Number.isInteger(result.value.amount)).toBe(true);
    expect(result.value.currency).toBe("CLP");
  });

  it("never produces floating decimals for any pair of integers (property)", () => {
    const next = lcg(102);
    for (let i = 0; i < 2000; i += 1) {
      const a = (next() % 1_000_000_000) - 500_000_000;
      const b = (next() % 1_000_000_000) - 500_000_000;
      const result = clp(a).add(clp(b));
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(Number.isSafeInteger(result.value.amount)).toBe(true);
      expect(result.value.amount).toBe(a + b);
    }
  });

  it("is commutative and associative (property)", () => {
    const next = lcg(7);
    for (let i = 0; i < 500; i += 1) {
      const [a, b, c] = [
        clp(next() % 100_000),
        clp(next() % 100_000),
        clp(next() % 100_000),
      ];
      const ab = Result.andThen(a.add(b), (s) => s.add(c));
      const bc = Result.andThen(b.add(c), (s) => a.add(s));
      expect(a.add(b)).toEqual(b.add(a));
      expect(ab).toEqual(bc);
    }
  });

  it("returns Result.err(CurrencyMismatch) for different currencies instead of throwing", () => {
    const foreign = Object.freeze({
      amount: 10,
      currency: "USD",
    }) as unknown as Money;

    const result = clp(1990).add(foreign);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CurrencyMismatch");
    expect(result.error).toMatchObject({ expected: "CLP", actual: "USD" });
  });

  it("returns InvalidMoney when the sum leaves the safe integer range", () => {
    const result = clp(Number.MAX_SAFE_INTEGER).add(clp(1));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("InvalidMoney");
    if (result.error.code !== "InvalidMoney") return;
    expect(result.error.reason).toBe("OutOfRange");
  });

  it("does not mutate its operands", () => {
    const a = clp(100);
    const b = clp(50);
    a.add(b);

    expect(a.amount).toBe(100);
    expect(b.amount).toBe(50);
  });
});

describe("Money.subtract", () => {
  it("subtracts exactly and may go negative", () => {
    expect(clp(1000).subtract(clp(1500))).toEqual(Result.ok(clp(-500)));
  });

  it("fails on currency mismatch", () => {
    const foreign = Object.freeze({
      amount: 10,
      currency: "USD",
    }) as unknown as Money;

    const result = clp(1990).subtract(foreign);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CurrencyMismatch");
  });
});

describe("Money.multiply", () => {
  it("multiplies by an integer quantity", () => {
    expect(clp(1990).multiply(3)).toEqual(Result.ok(clp(5970)));
    expect(clp(1990).multiply(0)).toEqual(Result.ok(clp(0)));
  });

  it("rejects non-integer factors so no rounding ever happens silently", () => {
    const result = clp(1990).multiply(1.5);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("InvalidMoney");
    expect(result.error.reason).toBe("NotAnInteger");
  });

  it("rejects products outside the safe integer range", () => {
    const result = clp(Number.MAX_SAFE_INTEGER).multiply(2);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.reason).toBe("OutOfRange");
  });
});

describe("Money comparisons", () => {
  it("equals compares amount and currency", () => {
    expect(clp(100).equals(clp(100))).toBe(true);
    expect(clp(100).equals(clp(101))).toBe(false);
    const foreign = Object.freeze({
      amount: 100,
      currency: "USD",
    }) as unknown as Money;
    expect(clp(100).equals(foreign)).toBe(false);
  });

  it("reports sign predicates", () => {
    expect(clp(0).isZero()).toBe(true);
    expect(clp(1).isZero()).toBe(false);
    expect(clp(-1).isNegative()).toBe(true);
    expect(clp(1).isNegative()).toBe(false);
    expect(clp(0).isNegative()).toBe(false);
  });
});

describe("Money serialisation", () => {
  it("serialises to a plain { amount, currency } object", () => {
    expect(JSON.parse(JSON.stringify(clp(1990)))).toEqual({
      amount: 1990,
      currency: "CLP",
    });
    expect(clp(1990).toJSON()).toEqual({ amount: 1990, currency: "CLP" });
  });

  it("round-trips through Money.of", () => {
    const original = clp(1990);
    const { amount, currency } = original.toJSON();

    expect(Money.of(amount, currency)).toEqual(Result.ok(original));
  });

  it("has a debug-friendly string form", () => {
    expect(String(clp(1990))).toBe("1990 CLP");
  });
});

describe("Money.isCurrency", () => {
  it("narrows strings to supported currencies", () => {
    expect(Money.isCurrency("CLP")).toBe(true);
    expect(Money.isCurrency("USD")).toBe(false);
  });
});
