import {
  type Catalog,
  type CatalogReader,
  getStorefrontCatalog,
  getStorefrontProduct,
  type Product,
} from "@/modules/catalog/application";
import type {
  StoreConfig,
  StoreConfigReader,
} from "@/modules/store-config/application";
import { Result, type StoreId } from "@/shared/kernel";
import { normalizeHost } from "../domain/host";
import type { StoreHostResolver } from "./ports/store-host-resolver";

export interface StorefrontDeps {
  readonly hosts: StoreHostResolver;
  readonly configs: StoreConfigReader;
  readonly catalog: CatalogReader;
}

export interface Storefront {
  readonly storeId: StoreId;
  readonly config: StoreConfig;
  readonly catalog: Catalog;
}

/**
 * Resolves the storefront from the request's own Host header, on the server
 * (ADR-0003 §2). `routedHost` is the segment the proxy rewrote into: it must
 * equal the Host, so reaching /s/<other-store> directly never shows another
 * store. Every failure is `undefined` and becomes a uniform 404.
 */
export async function loadStorefront(
  deps: StorefrontDeps,
  requestHost: string | null | undefined,
  routedHost: string,
): Promise<Storefront | undefined> {
  const host = normalizeHost(requestHost);
  if (!host || host !== routedHost) return undefined;
  const storeId = await deps.hosts.resolve(host);
  if (!storeId) return undefined;
  const config = await deps.configs.getConfig(storeId);
  if (!config) return undefined;
  const catalog = await getStorefrontCatalog({ reader: deps.catalog }, storeId);
  return { storeId, config, catalog };
}

export async function loadStorefrontProduct(
  deps: StorefrontDeps,
  requestHost: string | null | undefined,
  routedHost: string,
  slug: string,
): Promise<(Storefront & { readonly product: Product }) | undefined> {
  const storefront = await loadStorefront(deps, requestHost, routedHost);
  if (!storefront) return undefined;
  const product = await getStorefrontProduct(
    { reader: deps.catalog },
    storefront.storeId,
    slug,
  );
  return Result.isOk(product)
    ? { ...storefront, product: product.value }
    : undefined;
}
