import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { storefrontDeps, turnstileSiteKey } from "@/infra/container";
import type { CheckoutOptions } from "@/modules/orders/presentation/client";
import { isPlaceholderWhatsApp } from "@/modules/store-config/application";
import { loadStorefront } from "@/modules/storefront/application";
import {
  type CartItemInfo,
  CartView,
  productHref,
  StorefrontShell,
  storeWhatsAppDigits,
} from "@/modules/storefront/presentation";
import { CartWithCheckout } from "./cart-with-checkout";

interface Params {
  readonly params: Promise<{ host: string }>;
}

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false },
};

export default async function CartPage({ params }: Params) {
  const { host } = await params;
  const storefront = await loadStorefront(
    storefrontDeps,
    (await headers()).get("host"),
    host,
  );
  if (!storefront) notFound();
  const { config, catalog } = storefront;
  // Display data only; the order is priced again on the server (VIT-186).
  const items: Record<string, CartItemInfo> = {};
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      items[variant.id] = {
        productName: product.name,
        variantLabel: variant.label,
        unitPriceClp: variant.price.amount,
        href: productHref(product.slug),
        ...(product.image ? { imageSrc: product.image.src } : {}),
      };
    }
  }
  // Online checkout only for stores that configured delivery and payment and have a real
  // WhatsApp; the rest keep the plain WhatsApp link.
  const { checkout } = config;
  const checkoutOptions: CheckoutOptions | undefined =
    checkout &&
    config.features.whatsappCheckout &&
    !isPlaceholderWhatsApp(config.contact.whatsapp)
      ? {
          zones: checkout.delivery.zones,
          ...(checkout.delivery.freeShippingFromClp !== undefined
            ? { freeShippingFromClp: checkout.delivery.freeShippingFromClp }
            : {}),
          ...(checkout.delivery.pickup
            ? { pickup: checkout.delivery.pickup }
            : {}),
          invoiceOffered: checkout.invoice,
          showPrices: config.features.showPrices,
          siteKey: turnstileSiteKey(),
        }
      : undefined;
  const cartProps = {
    items,
    showPrice: config.features.showPrices,
    whatsappDigits: config.features.whatsappCheckout
      ? storeWhatsAppDigits(config)
      : undefined,
  };
  return (
    <StorefrontShell config={config}>
      <section className="px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 font-display text-h1 font-bold">Tu carrito</h1>
          {checkoutOptions ? (
            <CartWithCheckout {...cartProps} checkout={checkoutOptions} />
          ) : (
            <CartView {...cartProps} />
          )}
        </div>
      </section>
    </StorefrontShell>
  );
}
