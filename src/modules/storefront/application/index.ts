/** Public surface of the storefront module (ADR-0008). */
export {
  isPortalHost,
  normalizeHost,
  PORTAL_HOSTS,
  STOREFRONT_SEGMENT,
} from "../domain/host";
export {
  loadStorefront,
  loadStorefrontProduct,
  type Storefront,
  type StorefrontDeps,
} from "./load-storefront";
export type { StoreHostResolver } from "./ports/store-host-resolver";
