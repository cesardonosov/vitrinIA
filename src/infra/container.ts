import {
  KANUWIN_CATALOG,
  KANUWIN_DEMO_STORE_ID,
  KANUWIN_HOW_TO_ORDER,
  KANUWIN_WHATSAPP,
} from "@/modules/catalog/infrastructure/seed/kanuwin";
import { createSeedCatalogReader } from "@/modules/catalog/infrastructure/seed/seed-catalog";
import {
  AVES_PRESET,
  parseStoreConfig,
  type StoreConfig,
} from "@/modules/store-config/application";
import { createStaticStoreConfigReader } from "@/modules/store-config/infrastructure/static-store-config-reader";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import type { StorefrontDeps } from "@/modules/storefront/application";
import { dbStoreHostResolver } from "@/modules/storefront/infrastructure/db-store-host-resolver";
import { createCspReportHandler } from "./security/csp-report-handler";
import { createRateLimiter } from "./security/rate-limit";

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
      pages: { home: { sections } },
    },
    zodStoreConfigValidator,
  );
  if (!parsed.ok) throw new Error("Kanuwiñ demo Store Config is invalid");
  return parsed.value;
}

export const storefrontDeps: StorefrontDeps = {
  hosts: dbStoreHostResolver,
  configs: createStaticStoreConfigReader(
    new Map([[KANUWIN_DEMO_STORE_ID, kanuwinDemoConfig()]]),
  ),
  catalog: createSeedCatalogReader(
    new Map([[KANUWIN_DEMO_STORE_ID, KANUWIN_CATALOG]]),
  ),
};
