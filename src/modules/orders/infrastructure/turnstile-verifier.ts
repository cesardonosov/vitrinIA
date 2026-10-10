import type { HumanVerifier } from "../application";

export const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export interface TurnstileOptions {
  /** Read lazily so a missing key fails the request, not the boot. */
  readonly secretKey: () => string;
  readonly verifyUrl?: () => string | undefined;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  /** Receives a fixed reason code only: never the token, the response or the address. */
  readonly onError?: (reason: string) => void;
}

/**
 * Server-side Turnstile verification (siteverify). Fails closed: a missing or oversized
 * token, a network error, a timeout, a non-200 answer or anything but `success: true` is
 * `false`. The client address is not forwarded (it is already truncated for the limiter).
 */
export function createTurnstileVerifier(
  options: TurnstileOptions,
): HumanVerifier {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async verify(token) {
      if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return false;
      try {
        const response = await fetchImpl(
          options.verifyUrl?.() ?? TURNSTILE_VERIFY_URL,
          {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: options.secretKey(),
              response: token,
            }),
            signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
            cache: "no-store",
          },
        );
        if (!response.ok) {
          options.onError?.(`http_${response.status}`);
          return false;
        }
        const body: unknown = await response.json();
        return (
          typeof body === "object" &&
          body !== null &&
          (body as { success?: unknown }).success === true
        );
      } catch {
        options.onError?.("unreachable");
        return false;
      }
    },
  };
}
