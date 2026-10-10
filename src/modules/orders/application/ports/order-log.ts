/**
 * Structured events of the orders flow. Fields are ids, counts and codes: never buyer data,
 * request bodies, URLs or messages (threat model orders O14).
 */
export type OrderLogFields = Readonly<
  Record<string, string | number | boolean>
>;

export interface OrderLog {
  info(event: string, fields: OrderLogFields): void;
  warn(event: string, fields: OrderLogFields): void;
}
