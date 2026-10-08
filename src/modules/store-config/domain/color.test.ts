import { describe, expect, it } from "vitest";
import {
  AA_CONTRAST_RATIO,
  AA_UI_CONTRAST_RATIO,
  contrastRatio,
  DEFAULT_ON_PRIMARY_COLOR,
  isHexColor,
  meetsAaContrast,
  meetsAaUiContrast,
  relativeLuminance,
} from "./color";

describe("isHexColor", () => {
  it.each(["#000000", "#ffffff", "#1d4ed8", "#abcdef"])("accepts %s", (c) => {
    expect(isHexColor(c)).toBe(true);
  });

  it.each([
    "000000",
    "#fff",
    "#1D4ED8",
    "#ffffff00",
    "#gggggg",
    "red",
    "rgb(0,0,0)",
    " #ffffff",
    "#ffffff;color:red",
    "url(javascript:alert(1))",
  ])("rejects %s", (c) => {
    expect(isHexColor(c)).toBe(false);
  });
});

describe("contrast", () => {
  it("black on white is 21:1 and white on white is 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#1d4ed8", "#fffaf5")).toBeCloseTo(
      contrastRatio("#fffaf5", "#1d4ed8"),
      10,
    );
  });

  it("luminance of pure white is 1 and of pure black is 0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("meetsAaContrast uses the 4.5 threshold", () => {
    expect(AA_CONTRAST_RATIO).toBe(4.5);
    expect(meetsAaContrast("#111827", "#ffffff")).toBe(true);
    expect(meetsAaContrast("#777777", "#ffffff")).toBe(false);
  });

  it("meetsAaUiContrast uses the 3:1 threshold for UI components (SC 1.4.11)", () => {
    expect(AA_UI_CONTRAST_RATIO).toBe(3);
    expect(meetsAaUiContrast("#777777", "#ffffff")).toBe(true); // 4.48:1
    expect(meetsAaUiContrast("#aaaaaa", "#ffffff")).toBe(false); // 2.32:1
  });

  it("DEFAULT_ON_PRIMARY_COLOR is white and a valid lowercase hex", () => {
    expect(DEFAULT_ON_PRIMARY_COLOR).toBe("#ffffff");
    expect(isHexColor(DEFAULT_ON_PRIMARY_COLOR)).toBe(true);
  });
});
