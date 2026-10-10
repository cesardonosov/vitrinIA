import { defineConfig } from "@playwright/test";

/**
 * E2E (VIT-186): mobile first, 375 px. Needs the test Postgres migrated (`pnpm db:migrate:test`)
 * and TEST_DATABASE_URL (app_user) exported; see docs/qa/e2e-orders.md. The app runs against that
 * database with the Kanuwiñ demo store seeded by tests/e2e/global-setup.ts. Cloudflare is not
 * reachable from tests: the widget script is stubbed in the test and the server verifies against
 * tests/e2e/fake-siteverify.mjs through TURNSTILE_VERIFY_URL (refused in production).
 */
const PORT = 3100;
const VERIFY_PORT = 8788;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://kanuwin.localhost:${PORT}`,
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 } } },
    {
      name: "desktop-1280",
      use: {
        viewport: { width: 1280, height: 800 },
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/fake-siteverify.mjs",
      port: VERIFY_PORT,
      env: { FAKE_SITEVERIFY_PORT: String(VERIFY_PORT) },
      reuseExistingServer: true,
    },
    {
      command: `pnpm exec next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/`,
      timeout: 120_000,
      reuseExistingServer: true,
      env: {
        APP_ENV: "development",
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
        SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123",
        LOG_LEVEL: "warn",
        TURNSTILE_VERIFY_URL: `http://127.0.0.1:${VERIFY_PORT}/siteverify`,
      },
    },
  ],
});
