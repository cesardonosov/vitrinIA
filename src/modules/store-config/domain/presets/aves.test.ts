import { describe, expect, it } from "vitest";
import {
  AA_CONTRAST_RATIO,
  AA_UI_CONTRAST_RATIO,
  contrastRatio,
  DEFAULT_ON_PRIMARY_COLOR,
} from "../color";
import { isChileanMobileE164, PLACEHOLDER_WHATSAPP } from "../phone";
import { MAX_SECTIONS_PER_PAGE } from "../store-config";
import { AVES_PRESET } from "./aves";

function collectObjects(value: unknown, out: object[] = []): object[] {
  if (typeof value === "object" && value !== null) {
    out.push(value);
    for (const child of Object.values(value)) collectObjects(child, out);
  }
  return out;
}

describe("AVES_PRESET", () => {
  it("is deeply frozen (no test or caller can mutate shared state)", () => {
    const objects = collectObjects(AVES_PRESET);
    expect(objects.length).toBeGreaterThan(10);
    for (const object of objects) {
      expect(Object.isFrozen(object)).toBe(true);
    }
    expect(() => {
      (AVES_PRESET.pages.home.sections as unknown[]).push({});
    }).toThrow();
  });

  it("uses the documented fictitious WhatsApp placeholder, not a real number", () => {
    expect(AVES_PRESET.contact.whatsapp).toBe(PLACEHOLDER_WHATSAPP);
    expect(isChileanMobileE164(PLACEHOLDER_WHATSAPP)).toBe(true);
  });

  it("passes the three contrast pairs of ADR-0004 section 3", () => {
    const { text, background, primary, onPrimary } = AVES_PRESET.theme.colors;
    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(
      AA_CONTRAST_RATIO,
    );
    expect(contrastRatio(primary, background)).toBeGreaterThanOrEqual(
      AA_UI_CONTRAST_RATIO,
    );
    expect(
      contrastRatio(onPrimary ?? DEFAULT_ON_PRIMARY_COLOR, primary),
    ).toBeGreaterThanOrEqual(AA_CONTRAST_RATIO);
  });

  it("keeps the accent readable as text over the background", () => {
    const { accent, background } = AVES_PRESET.theme.colors;
    expect(contrastRatio(accent ?? "", background)).toBeGreaterThanOrEqual(
      AA_CONTRAST_RATIO,
    );
  });

  it("stays within the section limit and ends with the WhatsApp CTA", () => {
    const sections = AVES_PRESET.pages.home.sections;
    expect(sections.length).toBeLessThanOrEqual(MAX_SECTIONS_PER_PAGE);
    expect(sections.at(-1)?.type).toBe("whatsapp-cta");
  });

  it("marks the unknown delivery terms as a placeholder to replace", () => {
    const texts = JSON.stringify(AVES_PRESET.pages.home.sections);
    expect(texts).toContain("REEMPLAZAR");
  });

  it("contains no HTML or code in any text", () => {
    expect(JSON.stringify(AVES_PRESET)).not.toMatch(/[<>]|javascript:|\{\{/i);
  });
});
