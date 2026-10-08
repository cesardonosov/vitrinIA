/**
 * Public surface of the store-config module (ADR-0008: the only file other
 * modules may import). Everything else in the module is private.
 */

// Contract (types and constants)
export {
  AA_CONTRAST_RATIO,
  contrastRatio,
  isHexColor,
  meetsAaContrast,
} from "../domain/color";
export type {
  InvalidSlug,
  InvalidStoreConfig,
  StoreConfigError,
  StoreConfigIssue,
  UnsupportedSchemaVersion,
  UrlNotAllowed,
} from "../domain/errors";
export {
  FONT_IDS,
  FONT_STACKS,
  type FontId,
  RADIUS_IDS,
  RADIUS_VALUES,
  type RadiusId,
} from "../domain/fonts";
export {
  MIGRATIONS,
  type Migration,
  migrateToCurrent,
  OLDEST_SUPPORTED_SCHEMA_VERSION,
  type VersionedConfig,
} from "../domain/migrations/migrate-to-current";
export { isChileanMobileE164, toWhatsAppDigits } from "../domain/phone";
export { ROPA_PRESET } from "../domain/presets/ropa";
export { isReservedSlug, RESERVED_SLUGS } from "../domain/reserved-slugs";
export {
  normalizeSlug,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_PATTERN,
  type Slug,
  toSlugCandidate,
  validateSlug,
} from "../domain/slug";
export {
  DEFAULT_FEATURES,
  FEATURE_FLAGS,
  type FeatureFlag,
  type HeroSection,
  type ImageId,
  MAX_SECTIONS_PER_PAGE,
  PRODUCT_GRID_MAX_LIMIT,
  PRODUCT_GRID_SOURCES,
  type ProductGridSection,
  type ProductGridSource,
  SECTION_TYPES,
  type SectionType,
  STORE_CONFIG_SCHEMA_VERSION,
  type StoreConfig,
  type StoreConfigV1,
  type StoreContact,
  type StoreFeatures,
  type StoreIdentity,
  type StorePage,
  type StorePages,
  type StoreSection,
  type StoreTheme,
  type TextSection,
  type ThemeColors,
  type WhatsAppCtaSection,
} from "../domain/store-config";
export { isPlainText, TEXT_LIMITS } from "../domain/text";
export {
  checkUrlForField,
  URL_FIELD_ALLOWLIST,
  URL_MAX_LENGTH,
  type UrlField,
  type UrlFieldRule,
} from "../domain/url-allowlist";
// Use cases and ports
export {
  type ParseStoreConfigError,
  parseStoreConfig,
} from "./parse-store-config";
export type { StoreConfigValidator } from "./ports/store-config-validator";
