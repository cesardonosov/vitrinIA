import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { storefrontDeps } from "@/infra/container";
import { loadStorefrontProduct } from "@/modules/storefront/application";
import {
  ProductDetail,
  StorefrontShell,
  storeWhatsAppDigits,
} from "@/modules/storefront/presentation";

interface Params {
  readonly params: Promise<{ host: string; slug: string }>;
}

async function load({ params }: Params) {
  const { host, slug } = await params;
  return loadStorefrontProduct(
    storefrontDeps,
    (await headers()).get("host"),
    host,
    decodeURIComponent(slug),
  );
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const found = await load(props);
  if (!found) return {};
  return {
    title: `${found.product.name} · ${found.config.identity.name}`,
    description: found.product.shortDescription,
  };
}

export default async function StorefrontProductPage(props: Params) {
  const found = await load(props);
  if (!found) notFound();
  const { config, catalog, product } = found;
  return (
    <StorefrontShell config={config}>
      <ProductDetail
        product={product}
        categoryName={
          catalog.categories.find((c) => c.id === product.categoryId)?.name
        }
        showPrice={config.features.showPrices}
        whatsappDigits={
          config.features.whatsappCheckout
            ? storeWhatsAppDigits(config)
            : undefined
        }
      />
    </StorefrontShell>
  );
}
