/**
 * Proves the request comes from a person (Cloudflare Turnstile in production). Fails closed:
 * a verifier that cannot decide answers `false`.
 */
export interface HumanVerifier {
  verify(token: string, clientKey: string): Promise<boolean>;
}
