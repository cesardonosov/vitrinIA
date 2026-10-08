import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Must-fail fixtures for biome/no-hardcoded-design-values.grit.
const BAD: Record<string, string> = {
  "string-hex": 'export const a = "#ff0000";\n',
  "jsx-class":
    'export const B = () => <div className="bg-[#fff] p-[13px]" />;\n',
  "template-hex": "export const c = `color: #abc`;\n",
  "rgb-call": 'export const d = "rgb(1, 2, 3)";\n',
};
const GOOD =
  'export const ok = () => <div className="bg-primary p-4 min-h-touch" />;\n';

function lint(name: string, source: string, subdir = "") {
  const root = process.cwd();
  const dir = mkdtempSync(join(root, ".lintfx-"));
  try {
    const folder = join(dir, subdir);
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `${name}.tsx`);
    writeFileSync(file, source);
    return spawnSync("pnpm", ["exec", "biome", "lint", file], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("biome no-hardcoded-design-values plugin", () => {
  for (const [name, src] of Object.entries(BAD)) {
    it(`flags ${name}`, () => {
      const r = lint(name, src);
      expect(r.status, r.stdout + r.stderr).not.toBe(0);
      expect(r.stdout + r.stderr).toContain("Hand-written color or size value");
    });
  }
  it("flags hard-coded values in infrastructure outside the Store Config schema", () => {
    const r = lint(
      "adapter",
      BAD["string-hex"] ?? "",
      "src/modules/mail/infrastructure",
    );
    expect(r.status, r.stdout + r.stderr).not.toBe(0);
  });
  it("allows seller colors in the Store Config domain", () => {
    const r = lint(
      "preset",
      BAD["string-hex"] ?? "",
      "src/modules/store-config/domain",
    );
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
  it("accepts token utilities", () => {
    const r = lint("good", GOOD);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
});
