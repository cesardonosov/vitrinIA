"use client";

import { cartCount, cartSubtotal, setQuantity } from "../../domain/cart";
import { useCart } from "./use-cart";

/** Display data per variant, built on the server from the catalog. */
export interface CartItemInfo {
  readonly productName: string;
  readonly variantLabel: string;
  readonly unitPriceClp: number;
  readonly href: string;
  readonly imageSrc?: string;
}

export interface CartViewProps {
  readonly items: Readonly<Record<string, CartItemInfo>>;
  readonly showPrice: boolean;
  /** wa.me digits; absent while the store has no real number. */
  readonly whatsappDigits?: string;
}

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function orderMessage(
  lines: ReadonlyArray<{ info: CartItemInfo; quantity: number }>,
  total: number,
  showPrice: boolean,
): string {
  const body = lines
    .map(
      ({ info, quantity }) =>
        `- ${quantity} x ${info.productName} (${info.variantLabel})${showPrice ? `: ${clp.format(info.unitPriceClp * quantity)}` : ""}`,
    )
    .join("\n");
  return `Hola, quiero hacer este pedido:\n${body}${showPrice ? `\nSubtotal: ${clp.format(total)}` : ""}`;
}

export function CartView({ items, showPrice, whatsappDigits }: CartViewProps) {
  const [cart, update] = useCart();
  const lines = cart.flatMap((line) => {
    const info = items[line.variantId];
    return info ? [{ ...line, info }] : [];
  });
  const subtotal = cartSubtotal(cart, (id) => items[id]?.unitPriceClp);

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-h3 font-semibold">Tu carrito está vacío</p>
        <a
          href="/"
          className="mt-4 inline-flex min-h-touch items-center justify-center rounded-md bg-primary px-5 py-3 font-semibold text-on-primary"
        >
          Ver productos
        </a>
      </div>
    );
  }

  const href = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(orderMessage(lines, subtotal, showPrice))}`
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {lines.map(({ variantId, quantity, info }) => (
          <li key={variantId} className="flex gap-3 p-3">
            {info.imageSrc ? (
              // Small thumbnail; the optimised image is on the product page.
              <img
                src={info.imageSrc}
                alt=""
                width={56}
                height={72}
                className="h-18 w-14 shrink-0 rounded-md bg-surface object-contain"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <a
                  href={info.href}
                  className="font-semibold break-words underline-offset-4 hover:underline"
                >
                  {info.productName}
                </a>
                <p className="text-small">{info.variantLabel}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <fieldset className="flex items-center rounded-md border border-border">
                  <legend className="sr-only">{`Cantidad de ${info.productName}`}</legend>
                  <button
                    type="button"
                    className="min-h-touch min-w-touch text-h3"
                    aria-label="Quitar uno"
                    onClick={() =>
                      update((c) => setQuantity(c, variantId, quantity - 1))
                    }
                  >
                    −
                  </button>
                  <span
                    className="min-w-8 text-center font-semibold"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="min-h-touch min-w-touch text-h3"
                    aria-label="Agregar uno"
                    onClick={() =>
                      update((c) => setQuantity(c, variantId, quantity + 1))
                    }
                  >
                    +
                  </button>
                </fieldset>
                {showPrice ? (
                  <span className="font-bold">
                    {clp.format(info.unitPriceClp * quantity)}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="self-start text-small underline underline-offset-4"
                onClick={() => update((c) => setQuantity(c, variantId, 0))}
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showPrice ? (
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-body">
            Subtotal ({cartCount(lines)}{" "}
            {cartCount(lines) === 1 ? "producto" : "productos"})
          </span>
          <span className="text-h2 font-bold">{clp.format(subtotal)}</span>
        </div>
      ) : null}
      <p className="text-small">
        El despacho y la forma de pago se coordinan con la tienda.
      </p>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-body font-semibold text-on-primary hover:brightness-110"
        >
          Enviar pedido por WhatsApp
          <span className="sr-only"> (abre WhatsApp)</span>
        </a>
      ) : (
        <p className="rounded-md border border-border p-3 text-center">
          Esta tienda todavía no recibe pedidos en línea.
        </p>
      )}
    </div>
  );
}
