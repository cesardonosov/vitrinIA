/**
 * Short order code the buyer quotes to the seller (threat model orders O18, O21).
 * Random, never sequential, so nobody can deduce a store's sales volume from it.
 * No I, L, O, 0 or 1: they are mistaken for each other when read aloud or typed.
 */
export const ORDER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ORDER_CODE_LENGTH = 7;

/**
 * `randomIndex(n)` must return an unbiased integer in `[0, n)` from a cryptographic source
 * (the infrastructure adapter wraps `crypto.randomInt`).
 */
export function generateOrderCode(
  randomIndex: (exclusiveMax: number) => number,
): string {
  let code = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i++) {
    code += ORDER_CODE_ALPHABET.charAt(randomIndex(ORDER_CODE_ALPHABET.length));
  }
  return code;
}
