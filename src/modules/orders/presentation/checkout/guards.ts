/**
 * The client navigates only to the seller's WhatsApp (threat model orders O19). The server
 * already built the URL from the Store Config; this refuses anything else anyway.
 */
export function isWhatsAppUrl(url: string): boolean {
  if (!url.startsWith("https://wa.me/")) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === "https://wa.me" && parsed.username === "";
  } catch {
    return false;
  }
}

/** Payment links are shown only as plain https (the server validated the host list). */
export function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.username === "";
  } catch {
    return false;
  }
}

/** Shipping shown BEFORE sending; the server computes the real one. */
export function shippingPreview(
  zonePrice: number | undefined,
  subtotalClp: number,
  freeShippingFromClp: number | undefined,
): number {
  if (zonePrice === undefined) return 0;
  return freeShippingFromClp !== undefined && subtotalClp >= freeShippingFromClp
    ? 0
    : zonePrice;
}

/** Spanish message for the error code of the endpoint. Never shows server detail. */
export function checkoutErrorMessage(code: string | undefined): string {
  switch (code) {
    case "ITEM_UNAVAILABLE":
      return "Alguno de los productos ya no está disponible. Revisa tu carrito y vuelve a intentar.";
    case "RATE_LIMITED":
      return "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentar.";
    case "VERIFICATION_FAILED":
      return "No pudimos verificar que eres una persona. Vuelve a intentar.";
    case "IDEMPOTENCY_CONFLICT":
      return "Tu carrito cambió desde el último intento. Vuelve a enviar el pedido.";
    case "NOT_FOUND":
      return "Esta tienda todavía no recibe pedidos en línea.";
    case "INVALID_ORDER":
      return "Revisa los datos marcados e intenta de nuevo.";
    default:
      return "No pudimos enviar el pedido. Intenta de nuevo en unos minutos.";
  }
}
