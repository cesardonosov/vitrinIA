import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Domain and application code must stay above 90% (AGENTS.md §11).
      // Scoped to the kernel inside src/shared: other shared folders join when they exist.
      include: [
        "src/shared/kernel/**/*.ts",
        "src/modules/**/{domain,application}/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/index.ts"],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
