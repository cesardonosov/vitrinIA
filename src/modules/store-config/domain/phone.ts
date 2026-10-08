/**
 * Phone numbers are stored in E.164 (VITRINIA.md §7).
 *
 * `contact.whatsapp` must be a Chilean mobile: `+569` followed by 8 digits.
 * Landlines (`+562...`, `+5641...`) are valid E.164 but have no WhatsApp, so
 * they are rejected for this field. The storefront builds `https://wa.me/<digits>`
 * from the validated value; the host is fixed in code (ADR-0004 §3).
 */

export const CHILEAN_MOBILE_E164_PATTERN = /^\+569\d{8}$/;

/**
 * Fictitious number used by presets and fixtures, by convention. It matches
 * the pattern only so a preset is a valid Store Config; it is not meant to
 * reach anyone and nothing in production may persist it as a real contact.
 * The onboarding form always replaces it, and `isPlaceholderWhatsApp` lets a
 * seed or use case assert that before writing.
 */
export const PLACEHOLDER_WHATSAPP = "+56900000000";

export function isPlaceholderWhatsApp(value: string): boolean {
  return value === PLACEHOLDER_WHATSAPP;
}

export function isChileanMobileE164(value: string): boolean {
  return CHILEAN_MOBILE_E164_PATTERN.test(value);
}

/** Digits only, as `wa.me` expects (`+56912345678` -> `56912345678`). */
export function toWhatsAppDigits(e164: string): string {
  return e164.replace(/^\+/, "");
}
