import { createDbCatalogReader } from "@/modules/catalog/infrastructure/db-catalog-reader";
import {
  KANUWIN_DELIVERY,
  KANUWIN_DEMO_STORE_ID,
  KANUWIN_HOW_TO_ORDER,
  KANUWIN_WHATSAPP,
} from "@/modules/catalog/infrastructure/seed/kanuwin";
import type { PlaceOrderDeps } from "@/modules/orders/application";
import { newOrderCode } from "@/modules/orders/infrastructure/crypto-code";
import { createDbOrderRepository } from "@/modules/orders/infrastructure/db-order-repository";
import { createMemoryOrderRateLimiter } from "@/modules/orders/infrastructure/memory-order-rate-limiter";
import { createTurnstileVerifier } from "@/modules/orders/infrastructure/turnstile-verifier";
import {
  AVES_PRESET,
  parseStoreConfig,
  type StoreConfig,
} from "@/modules/store-config/application";
import { createStaticStoreConfigReader } from "@/modules/store-config/infrastructure/static-store-config-reader";
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
 * Demo store Kanuwiñ (VIT-182): preset `aves` with the store's name, public
 * order number and how-to-order text. Validated here so a bad edit fails at
 * boot, not on a buyer's phone. Moves to the database with VIT-191.
 */
export function kanuwinDemoConfig(): StoreConfig {
  const sections = AVES_PRESET.pages.home.sections.map((section) =>
    section.type === "text" && section.props.body.includes("REEMPLAZAR:")
      ? { ...section, props: { ...section.props, body: KANUWIN_HOW_TO_ORDER } }
      : section,
  );
  const parsed = parseStoreConfig(
    {
      ...AVES_PRESET,
      identity: { ...AVES_PRESET.identity, name: "Kanuwiñ" },
      contact: { whatsapp: KANUWIN_WHATSAPP },
      // Provisional demo terms (see seed/README.md). Payment links are not set until the
      // seller loads real ones from the portal; the transfer text only tells how to pay.
      checkout: {
        paymentMethods: [
          {
            type: "bank-transfer",
            details:
              "Los datos de la transferencia te los enviamos por WhatsApp al confirmar tu pedido.",
          },
        ],
        delivery: {
          zones: KANUWIN_DELIVERY.zones,
          freeShippingFromClp: KANUWIN_DELIVERY.freeShippingFromClp,
        },
        invoice: false,
      },
      pages: { home: { sections } },
    },
    zodStoreConfigValidator,
  );
  if (!parsed.ok) throw new Error("Kanuwiñ demo Store Config is invalid");
  return parsed.value;
}

/** Catalog from Postgres (VIT-183) for every store, Kanuwiñ included (seed: infra/seed/demo-catalog.sql). */
const catalogReader = createDbCatalogReader(withStoreTx);
const configs = createStaticStoreConfigReader(
  new Map([[KANUWIN_DEMO_STORE_ID, kanuwinDemoConfig()]]),
);

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
