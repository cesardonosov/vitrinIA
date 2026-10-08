import type { FontId, RadiusId } from "./fonts";

/**
 * Store Config v1: a store is data, not code (ADR-0004, VITRINIA.md §6.1.3).
 *
 * These are the domain types. The runtime validator (Zod, `.strict()` on every
 * object) lives in `infrastructure/zod/` behind the `StoreConfigValidator`
 * port, because domain/ and application/ import no packages (ADR-0008). Every
 * rule the validator enforces is a pure function of this folder (colour, font,
 * phone, slug, url-allowlist, text) so the contract has one source of truth.
 *
 * Changing the shape in an incompatible way: bump `STORE_CONFIG_SCHEMA_VERSION`,
 * add `migrations/vN-to-vN+1.ts`, add a fixture under
 * `tests/fixtures/store-config/vN/` and regenerate the JSON Schema.
 */

export const STORE_CONFIG_SCHEMA_VERSION = 1 as const;

export type StoreConfigSchemaVersion = typeof STORE_CONFIG_SCHEMA_VERSION;

/** Reference to an uploaded image (ImageStorage, UUID v7). Never a URL. */
export type ImageId = string;

export interface StoreIdentity {
  /** Display name shown in the storefront. `stores.name` mirrors it on write. */
  readonly name: string;
  readonly tagline?: string;
  readonly logoImageId?: ImageId;
}

/**
 * Closed set of colour tokens. Each becomes `--color-<key>` in the storefront.
 *
 * Contrast pairs enforced by the validator (ADR-0004 §3, WCAG 2.x):
 * `text`/`background` >= 4.5:1, `primary`/`background` >= 3:1,
 * `onPrimary`/`primary` >= 4.5:1 (using `DEFAULT_ON_PRIMARY_COLOR` when
 * `onPrimary` is absent).
 */
export interface ThemeColors {
  readonly primary: string;
  readonly background: string;
  readonly text: string;
  /** Text over `primary` (buttons, badges). Absent = `DEFAULT_ON_PRIMARY_COLOR`. */
  readonly onPrimary?: string;
  readonly accent?: string;
}

export interface StoreTheme {
  readonly colors: ThemeColors;
  readonly font: FontId;
  readonly radius: RadiusId;
}

export interface StoreContact {
  /** Chilean mobile in E.164 (`+569XXXXXXXX`). The storefront builds the wa.me link. */
  readonly whatsapp: string;
  /**
   * Vendor's payment link. Validated against `URL_FIELD_ALLOWLIST["contact.paymentLink"]`,
   * whose host list is empty until Cesar decides E1: today any value is rejected.
   */
  readonly paymentLink?: string;
}

// ------------------------------------------------------------------ sections
//
// `type` is the key of the storefront component registry; `props` is the
// strict props object of that type. A section type unknown to this list cannot
// be written; the storefront registry must cover exactly SECTION_TYPES (tested
// there when the module exists, Sprint 2).

export const SECTION_TYPES = [
  "hero",
  "product-grid",
  "text",
  "whatsapp-cta",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface HeroSection {
  readonly type: "hero";
  readonly props: {
    readonly title: string;
    readonly subtitle?: string;
    readonly imageId?: ImageId;
  };
}

export const PRODUCT_GRID_SOURCES = ["featured", "latest", "all"] as const;
export type ProductGridSource = (typeof PRODUCT_GRID_SOURCES)[number];

export interface ProductGridSection {
  readonly type: "product-grid";
  readonly props: {
    readonly title?: string;
    readonly source: ProductGridSource;
    /** 1..48 products. */
    readonly limit: number;
  };
}

export interface TextSection {
  readonly type: "text";
  readonly props: {
    readonly title?: string;
    /** Plain text; newlines become paragraphs. No markdown, no HTML. */
    readonly body: string;
  };
}

export interface WhatsAppCtaSection {
  readonly type: "whatsapp-cta";
  readonly props: {
    readonly label: string;
    /** Prefilled message, plain text. */
    readonly message?: string;
  };
}

export type StoreSection =
  | HeroSection
  | ProductGridSection
  | TextSection
  | WhatsAppCtaSection;

export const MAX_SECTIONS_PER_PAGE = 7;
export const PRODUCT_GRID_MAX_LIMIT = 48;

export interface StorePage {
  readonly sections: ReadonlyArray<StoreSection>;
}

/** Only `home` in v1. Other pages (about, contact) are additive. */
export interface StorePages {
  readonly home: StorePage;
}

// ------------------------------------------------------------------ features
//
// Product switches. NOT security controls (ADR-0004 §9): no access, isolation,
// validation or CSP decision reads a flag, and a flag off never relaxes a check.

export const FEATURE_FLAGS = [
  "showPrices",
  "showStock",
  "whatsappCheckout",
  "paymentLinkCheckout",
  "search",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type StoreFeatures = Readonly<Record<FeatureFlag, boolean>>;

export interface StoreConfigV1 {
  readonly schemaVersion: StoreConfigSchemaVersion;
  readonly identity: StoreIdentity;
  readonly theme: StoreTheme;
  readonly contact: StoreContact;
  readonly pages: StorePages;
  readonly features: StoreFeatures;
}

/** The current version. Alias so callers do not pin `V1` everywhere. */
export type StoreConfig = StoreConfigV1;

export const DEFAULT_FEATURES: StoreFeatures = Object.freeze({
  showPrices: true,
  showStock: false,
  whatsappCheckout: true,
  paymentLinkCheckout: false,
  search: true,
});
