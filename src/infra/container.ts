import { createDbCatalogReader } from "@/modules/catalog/infrastructure/db-catalog-reader";
import { buildKanuwinDemoConfig } from "@/modules/catalog/infrastructure/seed/kanuwin-config";
import type { PlaceOrderDeps } from "@/modules/orders/application";
import { newOrderCode } from "@/modules/orders/infrastructure/crypto-code";
import { createDbOrderRepository } from "@/modules/orders/infrastructure/db-order-repository";
import { createMemoryOrderRateLimiter } from "@/modules/orders/infrastructure/memory-order-rate-limiter";
import { createTurnstileVerifier } from "@/modules/orders/infrastructure/turnstile-verifier";
import type { StoreConfig } from "@/modules/store-config/application";
import { createDbStoreConfigReader } from "@/modules/store-config/infrastructure/db-store-config-reader";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import type { StorefrontDeps } from "@/modules/storefront/application";
import { dbStoreHostResolver } from "@/modules/storefront/infrastructure/db-store-host-resolver";
import { withStoreTx } from "./db/with-store-tx";
import { getEnv } from "./env";
import { logger } from "./logger";
import { createCspReportHandler } from "./security/csp-report-handler";
import { createRateLimiter } from "./security/rate-limit";
import { resolveTurnstileKeys } from "./security/turnstile-keys";

/** Composition root: wires platform adapters for src/app/ (ADR-0008). */
export const cspReportHandler = createCspReportHandler({
  perKey: createRateLimiter({ limit: 30, windowMs: 60_000 }),
  global: createRateLimiter({ limit: 300, windowMs: 60_000 }),
});

/**
 * Store Config of the Kanuwiñ demo store. The storefront reads it from Postgres
 * (VIT-191); this is the source `pnpm db:seed:demo` and the tests load into the database.
 */
export function kanuwinDemoConfig(): StoreConfig {
  return buildKanuwinDemoConfig(zodStoreConfigValidator);
}

/** Catalog from Postgres (VIT-183) for every store, Kanuwiñ included (seed: infra/seed/demo-catalog.sql). */
const catalogReader = createDbCatalogReader(withStoreTx);
/** Store Config from Postgres (VIT-191) for every store, validated on every read. */
const configs = createDbStoreConfigReader({
  withStoreTx,
  validator: zodStoreConfigValidator,
  onInvalid: (storeId, error) =>
    logger.error({
      event: "store_config.invalid",
      storeId,
      reason: error.code,
    }),
});

export const storefrontDeps: StorefrontDeps = {
  hosts: dbStoreHostResolver,
  configs,
  catalog: catalogReader,
};

/** Checkout (VIT-186). The verifier and its keys are read per request, never at import. */
export const ordersDeps: PlaceOrderDeps = {
  hosts: dbStoreHostResolver,
  configs,
  catalog: catalogReader,
  orders: createDbOrderRepository({ withStoreTx, newCode: newOrderCode }),
  verifier: createTurnstileVerifier({
    secretKey: () => resolveTurnstileKeys(getEnv()).secretKey,
    verifyUrl: () => {
      const url = getEnv().TURNSTILE_VERIFY_URL;
      return typeof url === "string" ? url : undefined;
    },
    onError: (reason) =>
      logger.warn({ event: "turnstile.verify_failed", reason }),
  }),
  limiter: createMemoryOrderRateLimiter(),
  log: {
    info: (event, fields) => logger.info({ event, ...fields }),
    warn: (event, fields) => logger.warn({ event, ...fields }),
  },
};

/** Public site key the checkout widget renders with. */
export function turnstileSiteKey(): string {
  return resolveTurnstileKeys(getEnv()).siteKey;
}
