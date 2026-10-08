import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit runs as `migrator` (table owner), ONLY from the `migrate` compose
 * service or `pnpm db:migrate:test`. DATABASE_URL here must be the migrator URL;
 * with the app_user URL it fails (no DDL privileges), by design (threat model C1/C15).
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set: drizzle-kit needs the migrator URL (use `pnpm db:migrate:test` with TEST_MIGRATOR_DATABASE_URL, or the compose `migrate` service).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/*/infrastructure/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: true,
});
