import type { Catalog, CatalogReader } from "@/modules/catalog/application";
import {
  parseStoreConfig,
  ROPA_PRESET,
  type StoreConfig,
  type StoreConfigReader,
} from "@/modules/store-config/application";
import { zodStoreConfigValidator } from "@/modules/store-config/infrastructure/zod/zod-store-config-validator";
import { Result, StoreId } from "@/shared/kernel";
import { idempotencyConflict } from "../domain/errors";
import type { OrderDraft, SavedOrder } from "../domain/order";
import { clp, V1, V2 } from "../domain/test-fixtures.spec";
import type { PlaceOrderDeps } from "./place-order";
import type { OrderLogFields } from "./ports/order-log";
import type { OrderRepository } from "./ports/order-repository";

/** Store Config v1 with a checkout block (mirrors tests/fixtures/store-config/v1/checkout.json;
 * src/ cannot import tests/, the Docker build ignores it). The theme comes from a preset. */
const checkoutFixture = {
  ...ROPA_PRESET,
  contact: { whatsapp: "+56912345678" },
  features: {
    showPrices: true,
    showStock: false,
    whatsappCheckout: true,
    paymentLinkCheckout: true,
    search: true,
  },
  checkout: {
    paymentMethods: [
      {
        type: "mercado-pago-link",
        url: "https://link.mercadopago.cl/tiendademo",
      },
      { type: "flow-link", url: "https://www.flow.cl/btn.php?token=abc123" },
      {
        type: "bank-transfer",
        details:
          "Banco Estado, cuenta RUT 12345678, Tienda Demo SpA, RUT 76.123.456-7, pagos@tiendademo.cl",
      },
    ],
    delivery: {
      zones: [
        {
          name: "Región Metropolitana",
          priceClp: 3990,
          leadTime: "24 a 48 horas hábiles",
        },
        {
          name: "Resto de Chile (courier)",
          priceClp: 5990,
          leadTime: "2 a 5 días hábiles",
        },
      ],
      freeShippingFromClp: 40000,
      pickup: { details: "Retiro en Ñuñoa, de lunes a viernes de 10 a 18 h" },
    },
    invoice: true,
  },
};

/** Test doubles for the orders application tests. Not exported by the module. */
function storeId(raw: string): StoreId {
  const parsed = StoreId.parse(raw);
  if (Result.isErr(parsed)) throw new Error("bad test id");
  return parsed.value;
}

export const STORE_A = storeId("0199d0a0-0000-7000-8000-00000000000a");
export const STORE_B = storeId("0199d0a0-0000-7000-8000-00000000000b");
export const HOST_A = "tienda-a.vitrinia.cl";

export function config(
  mutate?: (raw: Record<string, unknown>) => void,
): StoreConfig {
  const raw = structuredClone(checkoutFixture) as Record<string, unknown>;
  mutate?.(raw);
  const parsed = parseStoreConfig(raw, zodStoreConfigValidator);
  if (Result.isErr(parsed)) throw new Error(JSON.stringify(parsed.error));
  return parsed.value;
}

export const CATALOG_A: Catalog = {
  categories: [{ id: "c", name: "C", position: 0 }],
  products: [
    {
      id: "p1",
      slug: "mezcla",
      name: "Mezcla loros",
      categoryId: "c",
      position: 0,
      featured: false,
      shortDescription: "",
      highlights: [],
      nutrition: [],
      variants: [{ id: V1, label: "1,2 kg", price: clp(12990) }],
    },
    {
      id: "p2",
      slug: "snack",
      name: "Snack",
      categoryId: "c",
      position: 1,
      featured: false,
      shortDescription: "",
      highlights: [],
      nutrition: [],
      variants: [{ id: V2, label: "200 g", price: clp(4990) }],
    },
  ],
};

export interface Harness {
  deps: PlaceOrderDeps;
  logs: Array<{ level: string; event: string; fields: OrderLogFields }>;
  saved: Array<{ storeId: StoreId; key: string; draft: OrderDraft }>;
  calls: { verify: number; limiter: number };
}

/** In-memory repository with the idempotency semantics the real adapter must keep. */
export function memoryRepository(saved: Harness["saved"]): OrderRepository {
  const byKey = new Map<string, { fingerprint: string; order: SavedOrder }>();
  return {
    async place(store, key, draft) {
      const id = `${store}:${key}`;
      const existing = byKey.get(id);
      if (existing) {
        return existing.fingerprint === draft.fingerprint
          ? Result.ok({ order: existing.order, replayed: true })
          : Result.err(idempotencyConflict());
      }
      saved.push({ storeId: store, key, draft });
      const { fingerprint, ...rest } = draft;
      const order: SavedOrder = {
        ...rest,
        id: `0199d0a0-0000-7000-8000-${String(saved.length).padStart(12, "0")}`,
        code: "K7M2QXA",
      };
      byKey.set(id, { fingerprint, order });
      return Result.ok({ order, replayed: false });
    },
  };
}

export function harness(
  overrides: Partial<PlaceOrderDeps> & {
    configA?: StoreConfig | undefined;
  } = {},
): Harness {
  const logs: Harness["logs"] = [];
  const saved: Harness["saved"] = [];
  const calls = { verify: 0, limiter: 0 };
  const configA = "configA" in overrides ? overrides.configA : config();
  const configs: StoreConfigReader = {
    async getConfig(id) {
      return id === STORE_A ? configA : undefined;
    },
  };
  const catalog: CatalogReader = {
    async getCatalog(id) {
      return id === STORE_A ? CATALOG_A : { categories: [], products: [] };
    },
  };
  const deps: PlaceOrderDeps = {
    hosts: { resolve: async (h) => (h === HOST_A ? STORE_A : undefined) },
    configs,
    catalog,
    orders: memoryRepository(saved),
    verifier: {
      verify: async () => {
        calls.verify++;
        return true;
      },
    },
    limiter: {
      check: () => {
        calls.limiter++;
        return "allowed";
      },
    },
    log: {
      info: (event, fields) => logs.push({ level: "info", event, fields }),
      warn: (event, fields) => logs.push({ level: "warn", event, fields }),
    },
    ...overrides,
  };
  return { deps, logs, saved, calls };
}
