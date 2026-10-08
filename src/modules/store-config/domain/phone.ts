/**
 * Phone numbers are stored in E.164 (VITRINIA.md §7).
 *
 * `contact.whatsapp` must be a Chilean mobile: `+569` followed by 8 digits.
 * Landlines (`+562...`, `+5641...`) are valid E.164 but have no WhatsApp, so
 * they are rejected for this field. The storefront builds `https://wa.me/<digits>`
 * from the validated value; the host is fixed in code (ADR-0004 §3).
 */

export const CHILEAN_MOBILE_E164_PATTERN = /^\+569\d{8}$/;

export function isChileanMobileE164(value: string): boolean {
  return CHILEAN_MOBILE_E164_PATTERN.test(value);
}

/** Digits only, as `wa.me` expects (`+56912345678` -> `56912345678`). */
export function toWhatsAppDigits(e164: string): string {
  return e164.replace(/^\+/, "");
}
