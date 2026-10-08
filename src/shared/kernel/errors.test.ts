import { describe, expect, it } from "vitest";
import { type DomainError, domainError, isDomainError } from "./errors";

describe("domainError", () => {
  it("builds a frozen error with a literal code and a message", () => {
    const error = domainError("ProductNotFound", "Product does not exist");

    expect(error.code).toBe("ProductNotFound");
    expect(error.message).toBe("Product does not exist");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("keeps the code as a literal type usable as a discriminant", () => {
    type NotFound = DomainError<"NotFound">;
    type Conflict = DomainError<"Conflict">;
    const label = (e: NotFound | Conflict): string => {
      switch (e.code) {
        case "NotFound":
          return "missing";
        case "Conflict":
          return "clash";
      }
    };

    expect(label(domainError("NotFound", "x"))).toBe("missing");
    expect(label(domainError("Conflict", "y"))).toBe("clash");
  });

  it("is a plain object, never a thrown Error", () => {
    const error = domainError("Anything", "plain data");

    expect(error).not.toBeInstanceOf(Error);
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      code: "Anything",
      message: "plain data",
    });
  });
});

describe("isDomainError", () => {
  it("recognises domain errors and rejects anything else", () => {
    expect(isDomainError(domainError("X", "x"))).toBe(true);
    expect(isDomainError({ code: "X", message: "x" })).toBe(true);
    expect(isDomainError({ code: 1, message: "x" })).toBe(false);
    expect(isDomainError({ code: "X" })).toBe(false);
    expect(isDomainError(new Error("x"))).toBe(false);
    expect(isDomainError({ code: "", message: "x" })).toBe(false);
    expect(
      isDomainError(Object.assign(new Error("x"), { code: "ECONNREFUSED" })),
    ).toBe(false);
    class Custom {
      readonly code = "X";
      readonly message = "x";
    }
    expect(isDomainError(new Custom())).toBe(false);
    expect(
      isDomainError(
        Object.assign(Object.create(null), { code: "X", message: "x" }),
      ),
    ).toBe(true);
    expect(isDomainError({ ...domainError("X", "x"), extra: 1 })).toBe(true);
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError("X")).toBe(false);
  });
});
