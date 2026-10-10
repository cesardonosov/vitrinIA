/**
 * Cloudflare Turnstile PUBLIC test keys (documented by Cloudflare for development and
 * tests): the site key renders a widget that always passes, and the matching secret
 * accepts any token. They protect nothing, so they are not secrets; production and staging
 * refuse the test secret (env.ts) and read the real keys from the environment.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export interface TurnstileKeys {
  readonly siteKey: string;
  readonly secretKey: string;
}

export function resolveTurnstileKeys(env: {
  readonly TURNSTILE_SITE_KEY?: unknown;
  readonly TURNSTILE_SECRET_KEY?: unknown;
}): TurnstileKeys {
  return {
    siteKey:
      typeof env.TURNSTILE_SITE_KEY === "string"
        ? env.TURNSTILE_SITE_KEY
        : TURNSTILE_TEST_SITE_KEY,
    secretKey:
      typeof env.TURNSTILE_SECRET_KEY === "string"
        ? env.TURNSTILE_SECRET_KEY
        : TURNSTILE_TEST_SECRET_KEY,
  };
}
