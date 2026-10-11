import { describe, expect, it } from "vitest";
import { lookupItem } from "./item-lookup";

describe("lookupItem", () => {
  const items = { "variant-1": { name: "a" } };

  it("finds an own variant id", () => {
    expect(lookupItem(items, "variant-1")).toEqual({ name: "a" });
  });

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "does not resolve inherited property %s",
    (id) => {
      expect(lookupItem(items, id)).toBeUndefined();
    },
  );

  it("returns undefined for unknown ids", () => {
    expect(lookupItem(items, "nope")).toBeUndefined();
  });
});
