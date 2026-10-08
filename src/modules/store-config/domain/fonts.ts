/**
 * Closed list of fonts a store may pick (ADR-0004 §1 and §3).
 *
 * `theme.font` is an id from this list; the storefront maps the id to a CSS
 * `font-family` stack through `FONT_STACKS` and exposes it as `--font-body`.
 * The stack string never comes from the Store Config, so no vendor value ever
 * reaches a stylesheet.
 *
 * Only system stacks ship today (no font files in the bundle; LCP budget).
 * Adding a packaged font is a Designer task: add the id here, self-host the file
 * in the storefront and bump nothing in the Store Config (ids are additive).
 */

export const FONT_IDS = ["system-sans", "system-serif", "system-mono"] as const;

export type FontId = (typeof FONT_IDS)[number];

export const FONT_STACKS: Readonly<Record<FontId, string>> = Object.freeze({
  "system-sans":
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "system-serif": 'Georgia, Cambria, "Times New Roman", Times, serif',
  "system-mono":
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
});

export function isFontId(value: string): value is FontId {
  return (FONT_IDS as ReadonlyArray<string>).includes(value);
}

export const RADIUS_IDS = ["none", "sm", "md", "lg"] as const;

export type RadiusId = (typeof RADIUS_IDS)[number];

/** CSS value per radius id, used for `--radius`. Also never read from config. */
export const RADIUS_VALUES: Readonly<Record<RadiusId, string>> = Object.freeze({
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
});
