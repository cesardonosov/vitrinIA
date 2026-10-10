import { Result, StoreId } from "@/shared/kernel";
import type { Catalog } from "../../application";
import seed from "./kanuwin.json" with { type: "json" };
import { parseSeedCatalog, type SeedImage } from "./seed-catalog";

/**
 * Fixed id of the Kanuwiñ demo store. The local seed (VIT-182) creates the
 * store with this id so the seed catalog and the database agree.
 */
const parsed = StoreId.parse("0199d0a0-0000-7000-8000-00000000c0de");
if (Result.isErr(parsed)) throw new Error("Invalid Kanuwiñ demo store id");
export const KANUWIN_DEMO_STORE_ID: StoreId = parsed.value;

/** WebP copies in public/demo/kanuwin/, metadata stripped (VIT-182). */
const IMAGES: Readonly<Record<string, SeedImage>> = {
  "mezcla-pequenas-psitacidas.png": {
    src: "/demo/kanuwin/mezcla-pequenas-psitacidas.webp",
    width: 533,
    height: 800,
  },
  "mezcla-passeriformes.png": {
    src: "/demo/kanuwin/mezcla-passeriformes.webp",
    width: 534,
    height: 800,
  },
  "mezcla-loros-grandes.png": {
    src: "/demo/kanuwin/mezcla-loros-grandes.webp",
    width: 532,
    height: 800,
  },
  "mezcla-insectivoros-etiqueta-provisional.png": {
    src: "/demo/kanuwin/mezcla-insectivoros-etiqueta-provisional.webp",
    width: 416,
    height: 501,
  },
  "snack-de-gusanos-provisional.png": {
    src: "/demo/kanuwin/snack-de-gusanos-provisional.webp",
    width: 800,
    height: 800,
  },
};

export const KANUWIN_CATALOG: Catalog = parseSeedCatalog(seed, IMAGES);

/** Store-specific copy that replaces the preset's placeholder sentence. */
export const KANUWIN_HOW_TO_ORDER: string = seed.howToOrderText;

export const KANUWIN_WHATSAPP: string = seed.contact.whatsapp;

/** Demo delivery terms (provisional, invented for the demo at Cesar's request, 2026-10-09). */
export const KANUWIN_DELIVERY = {
  zones: seed.contact.deliveryTerms.zones.map((z) => ({
    name: z.name,
    priceClp: z.priceClp,
    leadTime: z.leadTime,
  })),
  freeShippingFromClp: seed.contact.deliveryTerms.freeShippingFromClp,
} as const;
