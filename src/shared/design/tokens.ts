/**
 * Design tokens: the single source of truth for color, type, spacing, radius,
 * shadow and breakpoints. Brand: "Instantanea" (provisional, see docs/design/brand.md).
 * To change brand, edit values here only. CSS (`tokens.css`) and Tailwind derive from this file.
 * No React or other dependencies.
 */

/** Light theme (default). Keys are kebab-case ids used as CSS variable names. */
export const color = {
  primary: "#2b1a12",
  "primary-hover": "#44342c",
  "on-primary": "#f3f8fb",
  accent: "#8ccbea",
  "on-accent": "#2b1a12",
  link: "#17658f",
  "link-hover": "#0f5278",
  bg: "#f3f8fb",
  surface: "#ffffff",
  "surface-warm": "#fbf6ec",
  "surface-tint": "#e3f2fa",
  text: "#2b1a12",
  "text-secondary": "#5a4a42",
  "text-tertiary": "#7a6b63",
  border: "#d3dce2",
  "border-strong": "#7c8b95",
  "neutral-50": "#f3f8fb",
  "neutral-100": "#e6edf1",
  "neutral-200": "#d3dce2",
  "neutral-300": "#b5c0c7",
  "neutral-400": "#7c8b95",
  "neutral-500": "#7a6b63",
  "neutral-600": "#5a4a42",
  "neutral-700": "#44342c",
  "neutral-800": "#35231b",
  "neutral-900": "#2b1a12",
  "success-50": "#e7f5ec",
  "success-700": "#17663c",
  "warning-50": "#fff3d6",
  "warning-700": "#7a4f00",
  danger: "#b42318",
  "danger-50": "#fdecea",
  "danger-700": "#b42318",
  "info-50": "#e8f1fb",
  "info-700": "#1d5fa8",
  "on-danger": "#ffffff",
} as const;

export type ColorToken = keyof typeof color;

/** Dark theme: only the tokens that change. Applied under `[data-theme="dark"]`. */
export const colorDark: Partial<Record<ColorToken, string>> = {
  primary: "#f3f8fb",
  "primary-hover": "#e6edf1",
  "on-primary": "#2b1a12",
  accent: "#8ccbea",
  "on-accent": "#2b1a12",
  link: "#8ccbea",
  "link-hover": "#b7def2",
  bg: "#2b1a12",
  surface: "#3a261c",
  "surface-warm": "#3a261c",
  "surface-tint": "#35231b",
  text: "#f3f8fb",
  "text-secondary": "#b9a99f",
  "text-tertiary": "#b9a99f",
  border: "#5a4a42",
  "border-strong": "#a8978d",
};

export const font = {
  /** Portal/marketing only (ADR-0004: storefronts use system fonts). Loaded via next/font. */
  display:
    'var(--font-gabarito), ui-rounded, "Segoe UI", system-ui, sans-serif',
  body: 'var(--font-albert-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  /** Storefront stacks (the closed list of ADR-0004 `theme.font`). */
  "system-sans":
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "system-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  "system-mono":
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

interface TypeStep {
  /** rem on mobile (default). */
  size: number;
  line: number;
  /** rem from the `lg` breakpoint up, when different. */
  sizeLg?: number;
  lineLg?: number;
}

/** Mobile first: body never below 1rem (16px). */
export const fontSize: Record<string, TypeStep> = {
  h1: { size: 2, line: 2.5, sizeLg: 2.75, lineLg: 3.25 },
  h2: { size: 1.5, line: 2, sizeLg: 1.875, lineLg: 2.375 },
  h3: { size: 1.25, line: 1.625 },
  body: { size: 1, line: 1.5 },
  small: { size: 0.875, line: 1.25 },
};

/** Spacing scale in rem (4px base). Tailwind uses `--spacing` as the unit. */
export const space = {
  base: 0.25,
  /** Minimum touch target: 44px. */
  touch: 2.75,
} as const;

export const radius = {
  none: "0",
  sm: "0.375rem",
  md: "0.75rem",
  lg: "1.25rem",
  full: "9999px",
} as const;

export const shadow = {
  sm: "0 1px 2px rgb(43 26 18 / 0.08)",
  md: "0 4px 12px rgb(43 26 18 / 0.1)",
  lg: "0 12px 32px rgb(43 26 18 / 0.14)",
} as const;

export const breakpoint = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
} as const;

export interface TokenPair {
  id: string;
  fg: ColorToken;
  bg: ColorToken;
  /** AA threshold: 4.5 normal text, 3 large text / UI components. */
  min: 4.5 | 3;
  theme: "light" | "dark";
}

/** Every declared foreground/background pair; the test suite fails if any drops below its minimum. */
export const tokenPairs: readonly TokenPair[] = [
  { id: "text on bg", fg: "text", bg: "bg", min: 4.5, theme: "light" },
  {
    id: "text on surface",
    fg: "text",
    bg: "surface",
    min: 4.5,
    theme: "light",
  },
  {
    id: "text on surface-warm",
    fg: "text",
    bg: "surface-warm",
    min: 4.5,
    theme: "light",
  },
  {
    id: "text-secondary on bg",
    fg: "text-secondary",
    bg: "bg",
    min: 4.5,
    theme: "light",
  },
  {
    id: "text-secondary on surface-tint",
    fg: "text-secondary",
    bg: "surface-tint",
    min: 4.5,
    theme: "light",
  },
  {
    id: "text-tertiary on bg",
    fg: "text-tertiary",
    bg: "bg",
    min: 4.5,
    theme: "light",
  },
  {
    id: "text-tertiary on surface",
    fg: "text-tertiary",
    bg: "surface",
    min: 4.5,
    theme: "light",
  },
  {
    id: "on-primary on primary",
    fg: "on-primary",
    bg: "primary",
    min: 4.5,
    theme: "light",
  },
  {
    id: "on-primary on primary-hover",
    fg: "on-primary",
    bg: "primary-hover",
    min: 4.5,
    theme: "light",
  },
  {
    id: "on-accent on accent",
    fg: "on-accent",
    bg: "accent",
    min: 4.5,
    theme: "light",
  },
  { id: "link on bg", fg: "link", bg: "bg", min: 4.5, theme: "light" },
  {
    id: "link on surface",
    fg: "link",
    bg: "surface",
    min: 4.5,
    theme: "light",
  },
  {
    id: "link on surface-tint",
    fg: "link",
    bg: "surface-tint",
    min: 4.5,
    theme: "light",
  },
  {
    id: "link-hover on bg",
    fg: "link-hover",
    bg: "bg",
    min: 4.5,
    theme: "light",
  },
  {
    id: "border-strong on surface",
    fg: "border-strong",
    bg: "surface",
    min: 3,
    theme: "light",
  },
  {
    id: "border-strong on bg",
    fg: "border-strong",
    bg: "bg",
    min: 3,
    theme: "light",
  },
  {
    id: "link (focus ring) on bg",
    fg: "link",
    bg: "bg",
    min: 3,
    theme: "light",
  },
  {
    id: "success",
    fg: "success-700",
    bg: "success-50",
    min: 4.5,
    theme: "light",
  },
  {
    id: "warning",
    fg: "warning-700",
    bg: "warning-50",
    min: 4.5,
    theme: "light",
  },
  { id: "danger", fg: "danger-700", bg: "danger-50", min: 4.5, theme: "light" },
  {
    id: "on-danger on danger",
    fg: "on-danger",
    bg: "danger",
    min: 4.5,
    theme: "light",
  },
  { id: "info", fg: "info-700", bg: "info-50", min: 4.5, theme: "light" },
  { id: "dark: text on bg", fg: "text", bg: "bg", min: 4.5, theme: "dark" },
  {
    id: "dark: text on surface",
    fg: "text",
    bg: "surface",
    min: 4.5,
    theme: "dark",
  },
  {
    id: "dark: text-secondary on bg",
    fg: "text-secondary",
    bg: "bg",
    min: 4.5,
    theme: "dark",
  },
  {
    id: "dark: text-secondary on surface",
    fg: "text-secondary",
    bg: "surface",
    min: 4.5,
    theme: "dark",
  },
  {
    id: "dark: on-primary on primary",
    fg: "on-primary",
    bg: "primary",
    min: 4.5,
    theme: "dark",
  },
  { id: "dark: link on bg", fg: "link", bg: "bg", min: 4.5, theme: "dark" },
  {
    id: "dark: link on surface",
    fg: "link",
    bg: "surface",
    min: 4.5,
    theme: "dark",
  },
  {
    id: "dark: border-strong on bg",
    fg: "border-strong",
    bg: "bg",
    min: 3,
    theme: "dark",
  },
  {
    id: "dark: border-strong on surface",
    fg: "border-strong",
    bg: "surface",
    min: 3,
    theme: "dark",
  },
  {
    id: "dark: on-accent on accent",
    fg: "on-accent",
    bg: "accent",
    min: 4.5,
    theme: "dark",
  },
];

export const tokens = {
  color,
  colorDark,
  font,
  fontWeight,
  fontSize,
  space,
  radius,
  shadow,
  breakpoint,
} as const;
