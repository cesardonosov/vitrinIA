import { describe, expect, it } from "vitest";
import { isChileanMobileE164, PLACEHOLDER_WHATSAPP } from "../phone";
import { ROPA_PRESET } from "./ropa";

function collectObjects(value: unknown, out: object[] = []): object[] {
  if (typeof value === "object" && value !== null) {
    out.push(value);
    for (const child of Object.values(value)) collectObjects(child, out);
  }
  return out;
}

describe("ROPA_PRESET", () => {
  it("is deeply frozen (no test or caller can mutate shared state)", () => {
    const objects = collectObjects(ROPA_PRESET);
    expect(objects.length).toBeGreaterThan(10);
    for (const object of objects) {
      expect(Object.isFrozen(object)).toBe(true);
    }
    expect(() => {
      (ROPA_PRESET.pages.home.sections as unknown[]).push({});
    }).toThrow();
  });

  it("uses the documented fictitious WhatsApp placeholder, not a real number", () => {
    expect(ROPA_PRESET.contact.whatsapp).toBe(PLACEHOLDER_WHATSAPP);
    // Shape-valid so the preset parses; the onboarding form always replaces it.
    expect(isChileanMobileE164(PLACEHOLDER_WHATSAPP)).toBe(true);
    expect(PLACEHOLDER_WHATSAPP).toBe("+56900000000");
  });
});
