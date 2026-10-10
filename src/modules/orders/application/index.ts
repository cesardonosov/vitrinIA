/** Public surface of the orders module (ADR-0008: the only file other modules may import). */

export type {
  HumanVerificationFailed,
  IdempotencyConflict,
  InvalidOrder,
  ItemUnavailable,
  OrderIssue,
  PlaceOrderError,
  RateLimited,
  StoreNotFound,
} from "../domain/errors";
export {
  FIELD_LIMITS,
  MAX_LINES,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "../domain/limits";
export type { OrderDraft, SavedOrder } from "../domain/order";
export type { OrderRequest } from "../domain/place-order-rules";
export { CHILE_REGIONS } from "../domain/regions";
export { formatClp } from "../domain/whatsapp-message";
export type { PaymentInstructions } from "./payment-instructions";
export {
  type PlacedOrder,
  type PlaceOrderDeps,
  type PlaceOrderInput,
  placeOrder,
} from "./place-order";
export type { HumanVerifier } from "./ports/human-verifier";
export type { OrderLog, OrderLogFields } from "./ports/order-log";
export type {
  OrderRateLimiter,
  RateLimitDecision,
} from "./ports/order-rate-limiter";
export type { OrderRepository, PlacedRecord } from "./ports/order-repository";
