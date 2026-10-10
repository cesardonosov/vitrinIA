"use client";

import { formatClp } from "../../domain/whatsapp-message";
import { isHttpsUrl, isWhatsAppUrl } from "./guards";
import type { PlacedOrderView } from "./types";

const PROVIDER_LABEL = {
  "mercado-pago-link": "Pagar con Mercado Pago",
  "flow-link": "Pagar con Flow",
} as const;

/**
 * After the order is saved: the code, the total, the button that opens WhatsApp with the
 * message the server built, and the seller's payment methods. Everything comes from the
 * POST response; there is no page to reopen it (threat model orders O18).
 */
export function OrderConfirmation({
  placed,
  showPrices,
}: {
  readonly placed: PlacedOrderView;
  readonly showPrices: boolean;
}) {
  const canOpen = isWhatsAppUrl(placed.whatsappUrl);
  const links = placed.payment.links.filter((l) => isHttpsUrl(l.url));
  return (
    <section
      aria-labelledby="order-done"
      className="flex flex-col gap-5 rounded-lg border border-border p-4"
    >
      <div>
        <h2 id="order-done" className="text-h2 font-bold">
          Pedido listo
        </h2>
        <p className="mt-1">
          Código del pedido:{" "}
          <strong data-testid="order-code">{placed.code}</strong>
        </p>
        {showPrices ? (
          <p className="mt-1">
            Total: <strong>{formatClp(placed.totalClp)}</strong>
            {placed.shippingClp > 0
              ? ` (incluye despacho ${formatClp(placed.shippingClp)})`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p>
          Falta un paso: envía el pedido por WhatsApp para que la tienda lo
          reciba.
        </p>
        {canOpen ? (
          <button
            type="button"
            className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-body font-semibold text-on-primary hover:brightness-110"
            onClick={() => {
              window.location.assign(placed.whatsappUrl);
            }}
          >
            Enviar pedido por WhatsApp
          </button>
        ) : (
          <p
            role="alert"
            className="rounded-md bg-danger-50 p-3 text-danger-700"
          >
            No pudimos preparar el mensaje de WhatsApp. Guarda tu código y
            escríbele a la tienda.
          </p>
        )}
      </div>

      {links.length > 0 ||
      placed.payment.bankTransfer ||
      placed.payment.pickup ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-h3 font-semibold">Cómo pagar</h3>
          {links.map((link) => (
            <a
              key={link.type}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-touch w-full items-center justify-center rounded-md border border-border-strong px-5 py-3 font-semibold underline-offset-4 hover:underline"
            >
              {PROVIDER_LABEL[link.type]}
              <span className="sr-only"> (abre otra página)</span>
            </a>
          ))}
          {placed.payment.bankTransfer ? (
            <div>
              <p className="font-semibold">Transferencia bancaria</p>
              {/* Plain text from the seller; React escapes it. */}
              <p className="whitespace-pre-line break-words">
                {placed.payment.bankTransfer}
              </p>
            </div>
          ) : null}
          {placed.payment.pickup ? (
            <div>
              <p className="font-semibold">Retiro en tienda</p>
              <p className="whitespace-pre-line break-words">
                {placed.payment.pickup}
              </p>
            </div>
          ) : null}
          <p className="text-small">
            El pago es directo con la tienda. VitrinIA no cobra ni guarda medios
            de pago.
          </p>
        </div>
      ) : null}
    </section>
  );
}
