/**
 * UUID v7 validation (VITRINIA.md §7: all IDs are UUID v7).
 *
 * Canonical form: 8-4-4-4-12 hex, version nibble `7`, RFC 9562 variant (8, 9, a, b).
 * Generation lives in infrastructure (an id generator port), not in the kernel.
 */
const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidV7(value: string): boolean {
  return UUID_V7_PATTERN.test(value);
}
