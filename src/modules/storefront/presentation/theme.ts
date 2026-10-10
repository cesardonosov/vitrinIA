import type { CSSProperties } from "react";
import {
  DEFAULT_ON_PRIMARY_COLOR,
  FONT_STACKS,
  RADIUS_VALUES,
  type StoreTheme,
} from "@/modules/store-config/application";

/**
 * Maps a validated store theme onto the design tokens, scoped to the
 * storefront wrapper (ADR-0004 §3). Values come only from closed sets
 * (fonts, radii) or from hex colours the validator already checked, never
 * from free CSS.
 *
 * Each variable holds exactly one validated value; nothing is concatenated
 * into CSS (ADR-0004 §3). Derived tokens (`surface`, `border`, `radius-lg`)
 * are computed by the static `.storefront-theme` rule in globals.css.
 *
 * Text is only ever painted with `text` on `background` or `onPrimary` on
 * `primary`: the two pairs the validator guarantees at AA. Derived colours
 * (`surface`, `border`) sit behind images or draw lines, never under text.
 */
export function storeThemeStyle(theme: StoreTheme): CSSProperties {
  const { colors } = theme;
  const radius = RADIUS_VALUES[theme.radius];
  const vars: Record<string, string> = {
    "--color-bg": colors.background,
    "--color-text": colors.text,
    "--color-primary": colors.primary,
    "--color-on-primary": colors.onPrimary ?? DEFAULT_ON_PRIMARY_COLOR,
    "--color-accent": colors.accent ?? colors.primary,
    "--color-link": colors.text,
    "--font-body": FONT_STACKS[theme.font],
    "--font-display": FONT_STACKS[theme.font],
    "--radius-md": radius,
  };
  return vars as CSSProperties;
}
