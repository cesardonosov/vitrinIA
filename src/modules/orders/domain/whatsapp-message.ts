import type { SavedOrder } from "./order";
import { cleanLine } from "./text";

/** `$1.990`: es-CL thousands separator, no decimals (CLP has none). */
export function formatClp(amount: number): string {
  const digits = Math.abs(Math.trunc(amount)).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${amount < 0 ? "-" : ""}$${grouped}`;
}

export interface MessageOptions {
  readonly storeName: string;
  /** The store hides prices: the message lists items and quantities only. */
  readonly showPrices: boolean;
}

/**
 * The text the buyer sends to the seller, built from the SAVED order (VIT-102), never from
 * the request. One-line fields were cleaned when the contact was validated, and are cleaned
 * again here as a second fence (threat model orders O21): a name cannot add a line such as
 * "Total: $0". The free note goes last, in its own labelled block.
 */
export function buildOrderMessage(
  order: SavedOrder,
  options: MessageOptions,
): string {
  const price = (amount: number) =>
    options.showPrices ? `: ${formatClp(amount)}` : "";
  const lines: string[] = [
    `Hola, quiero hacer este pedido en ${cleanLine(options.storeName)}.`,
    `Código del pedido: ${order.code}`,
    "Verifica el pedido con este código.",
    "",
    "Productos:",
    ...order.lines.map(
      (l) =>
        `- ${l.quantity} x ${cleanLine(l.productName)} (${cleanLine(l.variantLabel)})${price(l.lineTotal.amount)}`,
    ),
  ];

  if (options.showPrices) {
    lines.push("", `Subtotal: ${formatClp(order.subtotal.amount)}`);
  } else {
    lines.push("");
  }
  const { delivery } = order;
  if (delivery.type === "pickup") {
    lines.push("Entrega: retiro en tienda");
  } else {
    lines.push(
      options.showPrices
        ? `Despacho (${cleanLine(delivery.zone)}): ${formatClp(order.shipping.amount)}`
        : `Despacho: ${cleanLine(delivery.zone)}`,
    );
  }
  if (options.showPrices) lines.push(`Total: ${formatClp(order.total.amount)}`);

  const { contact } = order;
  lines.push(
    "",
    `Nombre: ${cleanLine(contact.name)}`,
    `Teléfono: ${contact.phone}`,
  );
  if (contact.email) lines.push(`Correo: ${cleanLine(contact.email)}`);
  if (contact.address) {
    const a = contact.address;
    const extra = a.extra ? `, ${cleanLine(a.extra)}` : "";
    lines.push(
      `Dirección: ${cleanLine(a.street)}${extra}, ${cleanLine(a.commune)}, ${cleanLine(a.region)}`,
    );
  }
  if (contact.invoice) {
    lines.push(
      "Factura: sí",
      `RUT: ${contact.invoice.rut}`,
      `Razón social: ${cleanLine(contact.invoice.businessName)}`,
      `Giro: ${cleanLine(contact.invoice.businessActivity)}`,
    );
  }
  if (contact.note) {
    lines.push("", "Nota del comprador:", contact.note);
  }
  return lines.join("\n");
}

/** `https://wa.me/<digits>?text=<encoded>`: the number is the seller's, the host is fixed. */
export function buildWhatsAppUrl(sellerE164: string, message: string): string {
  const digits = sellerE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
