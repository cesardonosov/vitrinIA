import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests run against the isolated test Postgres (docker-compose.test.yml),
// never the development database. One file at a time: they share one database.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
