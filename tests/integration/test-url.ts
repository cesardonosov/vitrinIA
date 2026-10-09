/**
 * Safety guard shared by every integration entry point (vitest helpers and the
 * plain-Node mutation check). No vitest or app imports: it must run under
 * `node file.ts`. Integration tests only ever talk to the isolated test
 * Postgres (docker-compose.test.yml): they read TEST_* variables, never
 * DATABASE_URL, and refuse non-loopback hosts or a URL equal to the
 * development DATABASE_URL.
 */
const LOOPBACK_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "postgres-test",
];

export function requireTestUrl(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(
      `${name} is not set. Start the test database with "pnpm test:db:up" and export TEST_DATABASE_URL (app_user) and TEST_MIGRATOR_DATABASE_URL (migrator); see docs/qa/tenant-isolation.md.`,
    );
  }
  const host = new URL(raw).hostname;
  if (!LOOPBACK_HOSTS.includes(host)) {
    throw new Error(
      `${name} must point to the local test database, got host ${host}`,
    );
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === raw) {
    throw new Error(`${name} must not equal DATABASE_URL (development)`);
  }
  return raw;
}
