import { describe, expect, it } from "vitest";
import { isChileanMobileE164, toWhatsAppDigits } from "./phone";

describe("isChileanMobileE164", () => {
  it.each(["+56912345678", "+56987654321"])("accepts %s", (phone) => {
    expect(isChileanMobileE164(phone)).toBe(true);
  });

  it.each([
    ["56912345678", "missing plus"],
    ["+56 9 1234 5678", "spaces"],
    ["912345678", "national format"],
    ["+5691234567", "too short"],
    ["+569123456789", "too long"],
    ["+56221234567", "landline"],
    ["+54911234567", "argentina"],
    ["+1 555 0100", "usa"],
    ["+569abcdefgh", "letters"],
    ["", "empty"],
  ])("rejects %s (%s)", (phone) => {
    expect(isChileanMobileE164(phone)).toBe(false);
  });
});

describe("toWhatsAppDigits", () => {
  it("strips the leading plus", () => {
    expect(toWhatsAppDigits("+56912345678")).toBe("56912345678");
  });
});
