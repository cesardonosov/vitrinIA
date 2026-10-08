import {
  breakpoint,
  color,
  colorDark,
  font,
  fontSize,
  radius,
  shadow,
  space,
} from "./tokens.ts";

const HEADER = `/* GENERATED from src/shared/design/tokens.ts by \`pnpm tokens:build\`. Do not edit by hand. */\n`;

const decl = (name: string, value: string | number) => `  ${name}: ${value};`;

/**
 * Builds the Tailwind v4 theme stylesheet from the tokens.
 * Default Tailwind palette, fonts, radii, shadows and breakpoints are reset
 * (`initial`) so only tokens can be used as utilities.
 */
export function buildTokensCss(): string {
  const theme: string[] = [
    decl("--color-*", "initial"),
    decl("--font-*", "initial"),
    decl("--text-*", "initial"),
    decl("--radius-*", "initial"),
    decl("--shadow-*", "initial"),
    decl("--breakpoint-*", "initial"),
    decl("--spacing", `${space.base}rem`),
    decl("--spacing-touch", `${space.touch}rem`),
  ];
  for (const [k, v] of Object.entries(color))
    theme.push(decl(`--color-${k}`, v));
  for (const [k, v] of Object.entries(font)) theme.push(decl(`--font-${k}`, v));
  for (const [k, v] of Object.entries(fontSize)) {
    theme.push(decl(`--text-${k}`, `${v.size}rem`));
    theme.push(decl(`--text-${k}--line-height`, `${v.line}rem`));
  }
  for (const [k, v] of Object.entries(radius))
    theme.push(decl(`--radius-${k}`, v));
  for (const [k, v] of Object.entries(shadow))
    theme.push(decl(`--shadow-${k}`, v));
  for (const [k, v] of Object.entries(breakpoint))
    theme.push(decl(`--breakpoint-${k}`, v));

  const desktop: string[] = [];
  for (const [k, v] of Object.entries(fontSize)) {
    if (v.sizeLg !== undefined && v.lineLg !== undefined) {
      desktop.push(decl(`--text-${k}`, `${v.sizeLg}rem`).replace("  ", "    "));
      desktop.push(
        decl(`--text-${k}--line-height`, `${v.lineLg}rem`).replace(
          "  ",
          "    ",
        ),
      );
    }
  }

  const dark = Object.entries(colorDark).map(([k, v]) =>
    decl(`--color-${k}`, v as string),
  );

  return [
    HEADER,
    `@theme {\n${theme.join("\n")}\n}\n`,
    `@media (min-width: ${breakpoint.lg}) {\n  :root {\n${desktop.join("\n")}\n  }\n}\n`,
    `[data-theme="dark"] {\n${dark.join("\n")}\n}\n`,
    `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));\n`,
  ].join("\n");
}
