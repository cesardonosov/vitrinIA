import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Proves that every rule in .dependency-cruiser.cjs catches a violation
 * (issue VIT-103, risk "rules too lax"). The fixture tree under
 * tests/arch-fixtures/ mirrors src/ and is cruised with the same config.
 */

const ROOT = resolve(__dirname, "../..");
const FIXTURES = resolve(ROOT, "tests/arch-fixtures");
const CONFIG = resolve(ROOT, ".dependency-cruiser.cjs");
const DEPCRUISE = resolve(ROOT, "node_modules/.bin/depcruise");

type Violation = {
  readonly from: string;
  readonly to: string;
  readonly rule: { readonly name: string; readonly severity: string };
};

type CruiseJson = {
  readonly summary: {
    readonly error: number;
    readonly violations: readonly Violation[];
  };
};

/** Fixture file → rule names it must trigger. Keep in sync with ARCHITECTURE.md §3. */
const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  // Layers
  "src/modules/catalog/domain/violates-domain-is-pure-drizzle.ts": [
    "domain-is-pure",
    "drizzle-only-in-infrastructure",
  ],
  "src/modules/catalog/domain/violates-domain-is-pure-type-only.ts": [
    "domain-is-pure",
  ],
  "src/modules/catalog/domain/violates-domain-is-pure-application.ts": [
    "domain-is-pure",
  ],
  "src/modules/catalog/application/violates-application-node-builtin.ts": [
    "application-only-domain-and-kernel",
  ],
  "src/modules/catalog/application/violates-application-infrastructure.ts": [
    "application-only-domain-and-kernel",
  ],
  "src/modules/catalog/presentation/violates-presentation-infrastructure.ts": [
    "presentation-not-to-infrastructure",
  ],
  "src/modules/catalog/infrastructure/violates-infrastructure-presentation.ts":
    ["infrastructure-not-to-presentation"],
  // Cross-module
  "src/modules/orders/infrastructure/violates-cross-module-infrastructure.ts": [
    "no-cross-module-internals",
  ],
  "src/modules/orders/application/violates-cross-module-domain.ts": [
    "no-cross-module-internals",
  ],
  "src/modules/orders/application/violates-cross-module-use-case.ts": [
    "no-cross-module-internals",
  ],
  // Shared kernel
  "src/shared/kernel/violates-kernel-node-builtin.ts": [
    "kernel-is-self-contained",
  ],
  "src/shared/kernel/violates-kernel-module.ts": [
    "kernel-is-self-contained",
    "shared-not-to-app-code",
  ],
  "src/shared/utils/violates-shared-to-infra.ts": ["shared-not-to-app-code"],
  // Composition root and app
  "src/app/(portal)/violates-app-domain.ts": [
    "app-only-presentation-and-application",
  ],
  "src/app/(portal)/violates-app-infrastructure.ts": [
    "app-only-presentation-and-application",
    "infrastructure-only-wired-in-container",
  ],
  "src/modules/catalog/presentation/violates-platform-infra-from-presentation.ts":
    ["platform-infra-only-from-adapters"],
  // Tenancy (ADR-0003, threat model G6)
  "src/modules/catalog/application/violates-drizzle-in-application.ts": [
    "drizzle-only-in-infrastructure",
  ],
  "src/app/(portal)/violates-drizzle-in-app.ts": [
    "drizzle-only-in-infrastructure",
  ],
  "src/modules/catalog/infrastructure/violates-db-client-direct.ts": [
    "db-client-only-via-with-store-tx",
  ],
  // Hygiene
  "src/modules/catalog/domain/violates-no-circular-a.ts": ["no-circular"],
  "src/modules/catalog/infrastructure/violates-not-to-unresolvable.ts": [
    "not-to-unresolvable",
  ],
  "src/modules/catalog/infrastructure/violates-not-to-dev-dep.ts": [
    "not-to-dev-dep",
  ],
};

/** Files that are valid by design: they must not trigger any rule. */
const POSITIVE_CONTROLS: readonly string[] = [
  "src/shared/kernel/index.ts",
  "src/modules/catalog/domain/product.ts",
  "src/modules/catalog/application/product-repository.ts",
  "src/modules/catalog/application/get-product.ts",
  "src/modules/catalog/application/index.ts",
  "src/modules/catalog/infrastructure/drizzle-product-repository.ts",
  "src/modules/catalog/presentation/list-products-action.ts",
  "src/modules/orders/application/index.ts",
  "src/infra/db/client.ts",
  "src/infra/db/with-store-tx.ts",
  "src/infra/container.ts",
  "src/app/(portal)/page.ts",
  "src/infra/env.ts",
  "src/instrumentation.ts",
];

/** Allowed by the tenancy rule even though the package is missing in fixtures. */
const DRIZZLE_IN_INFRASTRUCTURE =
  "src/modules/catalog/infrastructure/allowed-drizzle-in-infrastructure.ts";

function run(cwd: string, outputType: "json" | "err", target: string) {
  const result = spawnSync(
    DEPCRUISE,
    ["--config", CONFIG, "--output-type", outputType, target],
    { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  return result;
}

/** JSON report (the json reporter always exits 0; use exitCode() for the status). */
function cruise(cwd: string, target: string): CruiseJson {
  return JSON.parse(run(cwd, "json", target).stdout) as CruiseJson;
}

/** Exit status of the `err` reporter, which is what `pnpm arch` uses. */
function exitCode(cwd: string, target: string): number {
  return run(cwd, "err", target).status ?? -1;
}

function rulesFiredBy(violations: readonly Violation[], file: string) {
  return new Set(
    violations.filter((v) => v.from === file).map((v) => v.rule.name),
  );
}

describe("dependency-cruiser rules", () => {
  const fixtures = cruise(FIXTURES, "src");
  const violations = fixtures.summary.violations;

  it("fails on the fixture tree (pnpm arch:fixtures exits non-zero)", () => {
    expect(fixtures.summary.error).toBeGreaterThan(0);
    expect(exitCode(FIXTURES, "src")).not.toBe(0);
  });

  it("every rule in the config is covered by at least one fixture", () => {
    const config = createRequire(import.meta.url)(CONFIG) as {
      forbidden: readonly { name: string }[];
    };
    const configured = config.forbidden.map((rule) => rule.name).sort();
    const covered = [...new Set(Object.values(EXPECTED).flat())].sort();
    expect(covered).toEqual(configured);
  });

  for (const [file, rules] of Object.entries(EXPECTED)) {
    it(`${file} triggers ${rules.join(", ")}`, () => {
      const fired = rulesFiredBy(violations, file);
      for (const rule of rules) expect([...fired]).toContain(rule);
      for (const rule of fired) {
        expect(
          violations.find((v) => v.from === file && v.rule.name === rule)?.rule
            .severity,
        ).toBe("error");
      }
    });
  }

  for (const file of POSITIVE_CONTROLS) {
    it(`${file} is clean`, () => {
      expect([...rulesFiredBy(violations, file)]).toEqual([]);
    });
  }

  it("infrastructure may import drizzle-orm (the tenancy rule does not fire)", () => {
    expect([...rulesFiredBy(violations, DRIZZLE_IN_INFRASTRUCTURE)]).not.toContain(
      "drizzle-only-in-infrastructure",
    );
  });

  it("the real src/ tree has zero violations (pnpm arch)", () => {
    expect(cruise(ROOT, "src").summary.violations).toEqual([]);
    expect(exitCode(ROOT, "src")).toBe(0);
  });
});
