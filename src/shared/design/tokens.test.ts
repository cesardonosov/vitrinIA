import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.ts";
import { buildTokensCss } from "./css.ts";
import { color, colorDark, tokenPairs } from "./tokens.ts";

const HEX_LOWER = /^#[0-9a-f]{6}$/;

describe("brand tokens", () => {
  it("every color is a lowercase #rrggbb (ADR-0004 canonical form)", () => {
    for (const [k, v] of [
      ...Object.entries(color),
      ...Object.entries(colorDark),
    ]) {
      expect(v, k).toMatch(HEX_LOWER);
    }
  });

  for (const pair of tokenPairs) {
    it(`AA ${pair.min}:1 - ${pair.id} (${pair.theme})`, () => {
      const resolve = (t: keyof typeof color) =>
        (pair.theme === "dark" ? colorDark[t] : undefined) ?? color[t];
      const ratio = contrastRatio(resolve(pair.fg), resolve(pair.bg));
      expect(ratio).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it("tokens.css is in sync with tokens.ts (run `pnpm tokens:build`)", () => {
    const file = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
    expect(file).toBe(buildTokensCss());
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("no hand-written design values", () => {
  it("src has no hex colors or arbitrary px values outside the design folder", () => {
    const re =
      /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\b(?:rgb|hsl)a?\(|\[[0-9.]+(?:px|rem|em)\]/;
    const root = join(process.cwd(), "src");
    const offenders = walk(root)
      .filter((f) => /\.(tsx?|css)$/.test(f))
      .filter((f) => !f.includes(join("src", "shared", "design")))
      .filter((f) => !/\.(test|stories)\.tsx?$/.test(f))
      .filter((f) => re.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
