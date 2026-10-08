import { describe, expect, it } from "vitest";
import {
  ALLOW_ZERO_WIDTH_JOINER,
  isBlankText,
  isPlainText,
  TEXT_LIMITS,
} from "./text";

describe("isPlainText", () => {
  it("treats HTML as ordinary characters (React escapes on render)", () => {
    expect(isPlainText('<script>alert("x")</script>')).toBe(true);
    expect(isPlainText("Poleras & jeans <3")).toBe(true);
  });

  it("allows newlines, tabs, accents, ñ, emoji and CJK", () => {
    expect(isPlainText("línea 1\nlínea 2\tcol")).toBe(true);
    expect(isPlainText("Ñandú café 🧥 日本")).toBe(true);
  });

  it.each([
    ["NUL", "a\u0000b"],
    ["ESC", "a\u001bb"],
    ["DEL", "a\u007fb"],
    ["CR", "a\rb"],
    ["NEL (C1 control)", "a\u0085b"],
    ["C1 control U+009F", "a\u009fb"],
  ])("rejects control characters: %s", (_label, value) => {
    expect(isPlainText(value)).toBe(false);
  });

  it.each([
    ["RLO (bidi override)", "a‮b"],
    ["ZWSP", "a​b"],
    ["BOM", "﻿Hola"],
    ["word joiner", "a⁠b"],
    ["soft hyphen", "a­b"],
    ["tag character", "a\u{e0041}b"],
  ])("rejects format characters (Cf): %s", (_label, value) => {
    expect(isPlainText(value)).toBe(false);
  });

  it("rejects the zero-width joiner while ALLOW_ZERO_WIDTH_JOINER is false", () => {
    expect(ALLOW_ZERO_WIDTH_JOINER).toBe(false);
    expect(isPlainText("👩‍💻")).toBe(false);
  });

  it.each([
    ["line separator (Zl)", "a b"],
    ["paragraph separator (Zp)", "a b"],
  ])("rejects unicode line and paragraph separators: %s", (_label, value) => {
    expect(isPlainText(value)).toBe(false);
  });

  it.each([
    ["U+FFFE", "a￾b"],
    ["U+FFFF", "a￿b"],
    ["U+FDD0", "a﷐b"],
    ["U+1FFFE", "a\u{1fffe}b"],
    ["U+10FFFF", "a\u{10ffff}b"],
  ])("rejects noncharacters: %s", (_label, value) => {
    expect(isPlainText(value)).toBe(false);
  });

  it("rejects strings that are not well-formed UTF-16 (lone surrogates)", () => {
    expect(isPlainText("a\ud800b")).toBe(false);
    expect(isPlainText("a\udc00b")).toBe(false);
    expect(isPlainText("🧥")).toBe(true); // a real pair (🧥)
  });

  it("limits are positive integers", () => {
    for (const limit of Object.values(TEXT_LIMITS)) {
      expect(Number.isInteger(limit) && limit > 0).toBe(true);
    }
  });
});

describe("isBlankText", () => {
  it("is false for visible text", () => {
    expect(isBlankText("a")).toBe(false);
    expect(isBlankText("  a  ")).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["spaces", "   "],
    ["tabs and newlines", "\t\n\t"],
    ["only ZWSP", "​"],
    ["only BOM", "﻿"],
    ["ZWSP and spaces", " ​ ​ "],
    ["no-break space and ideographic space (Zs)", " 　"],
    ["line separator (Zl)", " "],
    ["RLO only", "‮‮"],
  ])("is true when nothing visible remains: %s", (_label, value) => {
    expect(isBlankText(value)).toBe(true);
  });
});
