/**
 * Guard for `pnpm db:seed:demo` (VIT-182). The demo seed is local only: it fails closed unless the
 * environment is explicitly development or test AND, when a database URL is visible, it points to
 * a local host. Plain Node (no app imports) so it runs under `node scripts/seed-demo-guard.ts`.
 */
const ALLOWED_ENVS = ["development", "test"];
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]", "postgres"];

export type GuardResult = { ok: true } | { ok: false; reason: string };

export function checkDemoSeedAllowed(
  env: Record<string, string | undefined>,
): GuardResult {
  const appEnv = env.APP_ENV?.trim().toLowerCase();
  if (!appEnv || !ALLOWED_ENVS.includes(appEnv)) {
    return {
      ok: false,
      reason: `APP_ENV must be one of ${ALLOWED_ENVS.join(", ")} (got ${appEnv ? `"${appEnv}"` : "nothing"}).`,
    };
  }
  const raw = env.DATABASE_URL;
  if (raw) {
    let host: string;
    try {
      host = new URL(raw).hostname.toLowerCase();
    } catch {
      return { ok: false, reason: "DATABASE_URL is not a valid URL." };
    }
    if (!LOCAL_HOSTS.includes(host)) {
      return {
        ok: false,
        reason: `DATABASE_URL host "${host}" is not local.`,
      };
    }
  }
  return { ok: true };
}

if (import.meta.main) {
  const result = checkDemoSeedAllowed(process.env);
  if (!result.ok) {
    console.error(`db:seed:demo refused: ${result.reason} Local only.`);
    process.exit(1);
  }
}
