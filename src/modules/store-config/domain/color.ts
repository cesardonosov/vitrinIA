/**
 * Theme colours (ADR-0004 §1 and §3).
 *
 * A colour is a 6-digit lowercase hex string `#rrggbb` (lowercase so the JSON
 * Schema `pattern` and Zod agree). Nothing else is accepted: no
 * names, no `rgb()`, no alpha. Values that pass this check are safe to emit as
 * CSS variable values; the storefront stylesheet is static and only reads them.
 */

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/** WCAG 2.x minimum contrast for normal text (AA). */
export const AA_CONTRAST_RATIO = 4.5;

function channel(hex: string, offset: number): number {
  const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x. Requires a valid `#rrggbb`. */
export function relativeLuminance(hex: string): number {
  return (
    0.2126 * channel(hex, 1) +
    0.7152 * channel(hex, 3) +
    0.0722 * channel(hex, 5)
  );
}

/** Contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export function meetsAaContrast(
  foreground: string,
  background: string,
): boolean {
  return contrastRatio(foreground, background) >= AA_CONTRAST_RATIO;
}
