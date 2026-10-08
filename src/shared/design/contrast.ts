/** Pure WCAG 2.x contrast helpers. No dependencies. Hex colors are `#rrggbb` (3-digit accepted on input). */

export type Rgb = readonly [number, number, number];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export function hexToRgb(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Invalid hex color: ${hex}`);
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA minimums. */
export const AA_TEXT = 4.5;
export const AA_UI = 3;

export const ON_LIGHT = "#ffffff";
export const ON_DARK = "#111111";

/** Returns the text color (white or near-black) with the higher contrast on `bg`. */
export function pickOnColor(bg: string): typeof ON_LIGHT | typeof ON_DARK {
  return contrastRatio(ON_LIGHT, bg) >= contrastRatio(ON_DARK, bg)
    ? ON_LIGHT
    : ON_DARK;
}

// --- HSL helpers (for lightness adjustment) ---

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = (
    [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const
  )[sector] as [number, number, number];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function withLightness(hex: string, l: number): string {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, s, l]));
}

export interface SellerTheme {
  /** Seller color, corrected if needed (lowercase `#rrggbb`). */
  primary: string;
  /** Text/icon color on top of `primary` (>= 4.5:1). */
  onPrimary: string;
  /** True when the seller color had to be adjusted. */
  adjusted: boolean;
}

export interface DeriveThemeOptions {
  /** Page background the primary sits on (borders, focus ring, links). Default white. */
  background?: string;
}

/**
 * Turns any seller-chosen color into a legible theme: `onPrimary` over `primary`
 * is always >= 4.5:1 and `primary` over `background` is always >= 3:1 (UI/focus).
 * Never rejects: if the color fails it is darkened (or lightened) until it passes.
 */
export function deriveTheme(
  sellerColor: string,
  options: DeriveThemeOptions = {},
): SellerTheme {
  const background = options.background ?? "#ffffff";
  const original = rgbToHex(hexToRgb(sellerColor));
  const ok = (primary: string) =>
    contrastRatio(pickOnColor(primary), primary) >= AA_TEXT &&
    contrastRatio(primary, background) >= AA_UI;

  if (ok(original)) {
    return {
      primary: original,
      onPrimary: pickOnColor(original),
      adjusted: false,
    };
  }

  const [, , l0] = rgbToHsl(hexToRgb(original));
  // Search lightness in both directions, nearest to the original first.
  const candidates: string[] = [];
  for (let step = 1; step <= 100; step++) {
    const delta = step / 100;
    for (const l of [l0 - delta, l0 + delta]) {
      if (l >= 0 && l <= 1) candidates.push(withLightness(original, l));
    }
  }
  const found = candidates.find(ok);
  // Black or white satisfies both rules against any background; reached only at extreme lightness.
  const primary = found ?? ["#000000", "#ffffff"].find(ok) ?? "#000000";
  return { primary, onPrimary: pickOnColor(primary), adjusted: true };
}
