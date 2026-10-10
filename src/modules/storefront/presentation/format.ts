import type { Money } from "@/shared/kernel";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** "$8.900". CLP is the only currency today (shared kernel `CURRENCIES`). */
export function formatMoney(money: Money): string {
  return clp.format(money.amount);
}

/** Splits plain seller text into paragraphs. Never parses markup. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** wa.me link with the prefilled message, from a validated E.164 number. */
export function whatsappHref(whatsappDigits: string, message?: string): string {
  const base = `https://wa.me/${whatsappDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function productHref(slug: string): string {
  return `/p/${encodeURIComponent(slug)}`;
}
