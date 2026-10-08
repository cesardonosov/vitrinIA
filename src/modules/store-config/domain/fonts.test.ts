import { describe, expect, it } from "vitest";
import {
  FONT_IDS,
  FONT_STACKS,
  isFontId,
  RADIUS_IDS,
  RADIUS_VALUES,
} from "./fonts";

describe("fonts and radius", () => {
  it("every font id has a CSS stack and nothing else does", () => {
    expect(Object.keys(FONT_STACKS).sort()).toEqual([...FONT_IDS].sort());
    for (const id of FONT_IDS)
      expect(FONT_STACKS[id].length).toBeGreaterThan(0);
  });

  it("stacks contain no CSS terminators or url()", () => {
    for (const stack of Object.values(FONT_STACKS)) {
      expect(stack).not.toMatch(/[;{}]|url\(/);
    }
  });

  it("isFontId narrows", () => {
    expect(isFontId("system-sans")).toBe(true);
    expect(isFontId("Comic Sans")).toBe(false);
  });

  it("every radius id has a CSS value", () => {
    expect(Object.keys(RADIUS_VALUES).sort()).toEqual([...RADIUS_IDS].sort());
  });
});
