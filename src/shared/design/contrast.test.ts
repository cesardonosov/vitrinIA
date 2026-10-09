import { describe, expect, it } from "vitest";
import {
  AA_TEXT,
  AA_UI,
  contrastRatio,
  deriveTheme,
  hexToRgb,
  pickOnColor,
} from "./contrast.ts";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("contrastRatio", () => {
  it("black on white is 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
  it("is symmetric and 1 for identical colors", () => {
    expect(contrastRatio("#123456", "#123456")).toBeCloseTo(1, 5);
    expect(contrastRatio("#123456", "#fedcba")).toBeCloseTo(
      contrastRatio("#fedcba", "#123456"),
      10,
    );
  });
  it("#767676 on white is 4.54 (known AA limit)", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
  it("accepts 3-digit hex and rejects garbage", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(() => hexToRgb("red")).toThrow();
  });
});

describe("pickOnColor", () => {
  it("picks dark text on light colors and white on dark colors", () => {
    expect(pickOnColor("#ffff00")).toBe("#111111");
    expect(pickOnColor("#0b3d91")).toBe("#ffffff");
  });
});

describe("deriveTheme", () => {
  it("keeps a legible color unchanged", () => {
    const t = deriveTheme("#17658f");
    expect(t.adjusted).toBe(false);
    expect(t.primary).toBe("#17658f");
  });
  it("corrects a low-contrast color (pale yellow) and flags it", () => {
    const t = deriveTheme("#fff59d");
    expect(t.adjusted).toBe(true);
    expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
    expect(contrastRatio(t.primary, "#ffffff")).toBeGreaterThanOrEqual(AA_UI);
  });
  it("keeps the hue when adjusting", () => {
    const t = deriveTheme("#a0e0ff");
    const [r, g, b] = hexToRgb(t.primary);
    expect(b).toBeGreaterThan(r);
    expect(g).toBeGreaterThanOrEqual(r);
  });
  it("accepts uppercase and 3-digit input, always returns lowercase #rrggbb", () => {
    expect(deriveTheme("#FFF").primary).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("works against the dark brand background", () => {
    const t = deriveTheme("#2b1a12", { background: "#2b1a12" });
    expect(contrastRatio(t.primary, "#2b1a12")).toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });
  it("property: 1000 random colors always end legible", () => {
    const rnd = mulberry32(112);
    for (let i = 0; i < 1000; i++) {
      const hex = `#${Math.floor(rnd() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}`;
      const t = deriveTheme(hex);
      expect(contrastRatio(t.onPrimary, t.primary), hex).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
      expect(contrastRatio(t.primary, "#ffffff"), hex).toBeGreaterThanOrEqual(
        AA_UI,
      );
    }
  });
  it("property: also legible against random backgrounds", () => {
    const rnd = mulberry32(7);
    const rh = () =>
      `#${Math.floor(rnd() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}`;
    for (let i = 0; i < 500; i++) {
      const bg = rh();
      const t = deriveTheme(rh(), { background: bg });
      expect(contrastRatio(t.onPrimary, t.primary), bg).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
      expect(contrastRatio(t.primary, bg), bg).toBeGreaterThanOrEqual(AA_UI);
    }
  });
});
