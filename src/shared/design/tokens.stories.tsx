import type { Meta, StoryObj } from "@storybook/nextjs";
import { contrastRatio, deriveTheme } from "./contrast.ts";
import {
  breakpoint,
  color,
  colorDark,
  fontSize,
  radius,
  shadow,
  space,
  tokenPairs,
} from "./tokens.ts";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-h2 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({
  name,
  value,
  on,
}: {
  name: string;
  value: string;
  on: string;
}) {
  const ratio = contrastRatio(on, value);
  return (
    <li className="flex items-center gap-3 rounded-md border border-border bg-surface p-2">
      <span
        className="size-11 shrink-0 rounded-sm border border-border-strong"
        style={{ backgroundColor: value }}
        role="img"
        aria-label={`Color ${name}`}
      />
      <span className="min-w-0 text-small">
        <span className="block font-semibold">{name}</span>
        <span className="text-text-secondary">
          {value} · {ratio.toFixed(2)}:1
        </span>
      </span>
    </li>
  );
}

function Overview() {
  const sellerSamples = ["#fff59d", "#a0e0ff", "#ffffff", "#e91e63", "#111111"];
  return (
    <main className="mx-auto max-w-5xl bg-bg p-4 text-text lg:p-8">
      <h1 className="font-display text-h1 mb-6">Design tokens</h1>

      <Section title="Colores (claro)">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(color).map(([name, value]) => (
            <Swatch
              key={name}
              name={name}
              value={value}
              on={
                contrastRatio("#ffffff", value) >
                contrastRatio("#000000", value)
                  ? "#ffffff"
                  : "#000000"
              }
            />
          ))}
        </ul>
      </Section>

      <Section title="Colores (modo oscuro, solo los que cambian)">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(colorDark).map(([name, value]) => (
            <Swatch
              key={name}
              name={name}
              value={value}
              on={color["on-primary"]}
            />
          ))}
        </ul>
      </Section>

      <Section title="Pares de contraste (AA)">
        <ul className="space-y-1 text-small">
          {tokenPairs.map((p) => {
            const r = (t: keyof typeof color) =>
              (p.theme === "dark" ? colorDark[t] : undefined) ?? color[t];
            const ratio = contrastRatio(r(p.fg), r(p.bg));
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-sm px-3 py-2"
                style={{ backgroundColor: r(p.bg), color: r(p.fg) }}
              >
                <span>{p.id}</span>
                <span className="font-semibold">
                  {ratio.toFixed(2)}:1 {ratio >= p.min ? "OK" : "FALLA"} (min{" "}
                  {p.min})
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Color del vendedor (deriveTheme)">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sellerSamples.map((c) => {
            const t = deriveTheme(c);
            return (
              <li
                key={c}
                className="rounded-md border border-border bg-surface p-3 text-small"
              >
                <p className="mb-2">
                  Elegido {c}{" "}
                  {t.adjusted ? `→ corregido ${t.primary}` : "(sin cambios)"}
                </p>
                <span
                  className="inline-flex min-h-touch items-center rounded-md px-4 font-semibold"
                  style={{ backgroundColor: t.primary, color: t.onPrimary }}
                >
                  Pedir por WhatsApp ·{" "}
                  {contrastRatio(t.onPrimary, t.primary).toFixed(2)}:1
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Tipografía (cambia en desktop desde lg)">
        <ul className="space-y-2">
          {Object.keys(fontSize).map((k) => (
            <li
              key={k}
              className={
                k === "h1"
                  ? "text-h1 font-display"
                  : k === "h2"
                    ? "text-h2 font-display"
                    : k === "h3"
                      ? "text-h3 font-display"
                      : k === "small"
                        ? "text-small"
                        : "text-body"
              }
            >
              {k}: Tu Instagram, ahora con carrito. ñ á é ¿¡
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Espaciado, radios, sombras, breakpoints">
        <p className="mb-3 text-small">
          Base {space.base * 16}px · área táctil mínima {space.touch * 16}px ·
          breakpoints{" "}
          {Object.entries(breakpoint)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}
        </p>
        <ul className="flex flex-wrap gap-3">
          {Object.keys(radius).map((k) => (
            <li
              key={k}
              className="grid size-20 place-items-center border border-border-strong bg-surface-tint text-small"
              style={{ borderRadius: `var(--radius-${k})` }}
            >
              {k}
            </li>
          ))}
          {Object.keys(shadow).map((k) => (
            <li
              key={k}
              className="grid size-20 place-items-center rounded-md bg-surface text-small"
              style={{ boxShadow: `var(--shadow-${k})` }}
            >
              {k}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Botón y foco">
        <button
          type="button"
          className="min-h-touch rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover"
        >
          Crea tu tienda gratis
        </button>{" "}
        <a className="text-link underline hover:text-link-hover" href="#tokens">
          Un enlace
        </a>
      </Section>
    </main>
  );
}

const meta = {
  title: "Tokens/Overview",
  component: Overview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile375: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};
