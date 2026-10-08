/**
 * Vendor texts are plain text (ADR-0004 §3, VITRINIA.md §8.2).
 *
 * The schema has no HTML, markdown or CSS field. A `<script>` in a title is
 * just characters: React escapes it on render. What we do reject is control
 * characters (except newline and tab), which have no legitimate use in a
 * title and break logs and JSON diffs.
 */

// Control characters C0 (except \t \n) and DEL. Carriage return is normalised
// away by browsers' textareas anyway, so it is rejected too.
// biome-ignore lint/suspicious/noControlCharactersInRegex: that is the point of the check
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F]/;

export function isPlainText(value: string): boolean {
  return !CONTROL_CHARACTERS.test(value);
}

/** Maximum lengths per text field (characters). One place, so limits are reviewable. */
export const TEXT_LIMITS = Object.freeze({
  storeName: 80,
  tagline: 160,
  sectionTitle: 80,
  sectionSubtitle: 160,
  sectionBody: 2000,
  buttonLabel: 40,
});
