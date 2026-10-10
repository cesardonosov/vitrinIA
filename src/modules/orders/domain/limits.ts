/**
 * Order limits (threat model orders O2, O3). The Zod request schema, the use case and the
 * database CHECKs all repeat them: a value out of range fails at every layer.
 */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
export const MAX_LINES = 50;

/** Largest order total the use case accepts (CLP). Far below the CHECK in the database. */
export const MAX_ORDER_TOTAL_CLP = 500_000_000;

export const FIELD_LIMITS = Object.freeze({
  name: 80,
  phone: 20,
  email: 254,
  note: 500,
  region: 80,
  commune: 80,
  street: 120,
  addressExtra: 120,
  businessName: 120,
  businessActivity: 80,
  rut: 12,
});
