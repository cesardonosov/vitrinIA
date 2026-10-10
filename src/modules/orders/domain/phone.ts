/**
 * Buyer phone to E.164. Chilean numbers are accepted the way people type them
 * (`9 1234 5678`, `+56 9 1234 5678`, `56912345678`); anything else must already be a
 * full international number written with `+`. Returns `undefined` when it is neither.
 */
export function parseBuyerPhone(raw: string): string | undefined {
  const compact = raw.replace(/[\s().-]/g, "");
  const chilean = /^(?:\+?56)?(9\d{8})$/.exec(compact);
  if (chilean?.[1]) return `+56${chilean[1]}`;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : undefined;
}
