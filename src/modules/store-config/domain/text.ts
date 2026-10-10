/**
 * Vendor texts are plain text (ADR-0004 §3, VITRINIA.md §8.2).
 *
 * The schema has no HTML, markdown or CSS field. A `<script>` in a title is
 * just characters: React escapes it on render. What we do reject is anything
 * that is invisible, reorders or hides text, or is not a valid string:
 *
 * - Control characters (`\p{Cc}`: C0, DEL and C1 such as NEL U+0085), except
 *   tab and newline. They have no legitimate use in a title and break logs
 *   and JSON diffs.
 * - Format characters (`\p{Cf}`): bidi overrides (RLO U+202E spoofs what the
 *   reader sees), zero-width spaces and joiners, BOM, soft hyphen, tag
 *   characters. See `ALLOW_ZERO_WIDTH_JOINER` for the one planned exception.
 * - Unicode line/paragraph separators (`\p{Zl}`, `\p{Zp}`): newlines are `\n`.
 * - Noncharacters (U+FDD0..U+FDEF, U+nFFFE, U+nFFFF): never valid text.
 * - Strings that are not well-formed UTF-16 (lone surrogates): they cannot be
 *   encoded as UTF-8 and would be silently rewritten by Postgres or the DB
 *   driver, so stored bytes would not match validated bytes.
 *
 * Security asked for this list (PR #55 review). Relaxing any item goes
 * through `security-review`.
 */

/**
 * U+200D ZERO WIDTH JOINER is `\p{Cf}` but is required by some emoji
 * sequences (family, professions, skin tones). It stays rejected until the
 * Designer asks for it; flipping this constant to `true` is the only change
 * needed, and `text.test.ts` pins the current value.
 */
export const ALLOW_ZERO_WIDTH_JOINER = false as boolean;

const ZERO_WIDTH_JOINER = "‍";

// `[^\P{Cc}\t\n]` = any control character that is not tab or newline.
const FORBIDDEN_CHARACTERS =
  /[^\P{Cc}\t\n]|\p{Cf}|\p{Zl}|\p{Zp}|\p{Noncharacter_Code_Point}/u;

/** Characters that take no visible space: format, separators and ASCII whitespace. */
const INVISIBLE_CHARACTERS = /[\p{Cf}\p{Z}\s]/gu;

export interface PlainTextOptions {
  readonly allowZeroWidthJoiner: boolean;
}

/** Same rule with the ZWJ switch as a parameter, so both paths are tested. */
export function isPlainTextWith(
  value: string,
  options: PlainTextOptions,
): boolean {
  if (!value.isWellFormed()) return false;
  const subject = options.allowZeroWidthJoiner
    ? value.replaceAll(ZERO_WIDTH_JOINER, "")
    : value;
  return !FORBIDDEN_CHARACTERS.test(subject);
}

export function isPlainText(value: string): boolean {
  return isPlainTextWith(value, {
    allowZeroWidthJoiner: ALLOW_ZERO_WIDTH_JOINER,
  });
}

/**
 * True when nothing visible remains after removing format characters
 * (`\p{Cf}`), separators (`\p{Z}`) and ASCII whitespace. `"​"` (only a
 * zero-width space) is blank even though `trim()` would keep it.
 */
export function isBlankText(value: string): boolean {
  return value.replace(INVISIBLE_CHARACTERS, "").length === 0;
}

/** Maximum lengths per text field (characters). One place, so limits are reviewable. */
export const TEXT_LIMITS = Object.freeze({
  storeName: 80,
  tagline: 160,
  sectionTitle: 80,
  sectionSubtitle: 160,
  sectionBody: 2000,
  buttonLabel: 40,
  paymentDetails: 300,
  deliveryZoneName: 60,
  deliveryLeadTime: 60,
  pickupDetails: 200,
});
