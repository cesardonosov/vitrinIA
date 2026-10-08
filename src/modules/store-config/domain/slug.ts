import {
  domainError,
  Result,
  type Result as ResultType,
} from "@/shared/kernel";
import type { InvalidSlug } from "./errors";
import { isReservedSlug } from "./reserved-slugs";

/**
 * Store slug: the label of `<slug>.vitrinia.cl` (ADR-0004 §8).
 *
 * Canonical form: lowercase `[a-z0-9]` with single inner hyphens, 3-40 chars,
 * no leading/trailing hyphen, no `xn--` (punycode would let a store spoof a
 * look-alike host), not in the reserved list.
 *
 * Two operations:
 * - `normalizeSlug(input)`: what the onboarding form and the MCP call on free
 *   text. "Mi Tienda Ñandú" -> "mi-tienda-nandu". Returns an error when the
 *   result is still invalid (too short, reserved...).
 * - `validateSlug(input)`: what stored data must already satisfy. It does NOT
 *   normalise: a config holding "MiTienda" is rejected (with the canonical
 *   candidate in the error) so reading and writing agree on identity.
 */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

declare const slugBrand: unique symbol;
export type Slug = string & { readonly [slugBrand]: "Slug" };

function invalid(
  reason: InvalidSlug["reason"],
  message: string,
  normalized?: string,
): InvalidSlug {
  return Object.freeze({
    ...domainError("InvalidSlug", message),
    reason,
    ...(normalized === undefined ? {} : { normalized }),
  });
}

/**
 * Lowercase, strip diacritics (ñ -> n), map separators to `-`, drop the rest.
 *
 * NFKC first: compatibility characters (fullwidth `ａｐｐ`, ligatures `ﬁ`,
 * enclosed `Ⓐ`, superscripts) fold to their ASCII equivalents, so look-alikes
 * of reserved words hit the reserved list instead of slipping through as
 * "nothing survives". Then NFD + strip combining marks removes accents.
 */
export function toSlugCandidate(input: string): string {
  return input
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateSlug(input: string): ResultType<Slug, InvalidSlug> {
  if (input.length === 0) {
    return Result.err(invalid("empty", "slug is required"));
  }
  if (input.toLowerCase().startsWith("xn--")) {
    return Result.err(invalid("punycode", "slug must not be punycode (xn--)"));
  }
  if (!SLUG_PATTERN.test(input)) {
    const candidate = toSlugCandidate(input);
    return Result.err(
      invalid(
        "invalid-characters",
        "slug must be lowercase letters, digits and single inner hyphens",
        candidate.length > 0 ? candidate : undefined,
      ),
    );
  }
  if (input.length < SLUG_MIN_LENGTH) {
    return Result.err(
      invalid(
        "too-short",
        `slug must have at least ${SLUG_MIN_LENGTH} characters`,
      ),
    );
  }
  if (input.length > SLUG_MAX_LENGTH) {
    return Result.err(
      invalid(
        "too-long",
        `slug must have at most ${SLUG_MAX_LENGTH} characters`,
      ),
    );
  }
  if (isReservedSlug(input)) {
    return Result.err(invalid("reserved", "slug is reserved"));
  }
  return Result.ok(input as Slug);
}

export function normalizeSlug(input: string): ResultType<Slug, InvalidSlug> {
  return validateSlug(toSlugCandidate(input));
}
