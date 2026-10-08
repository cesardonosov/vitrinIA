/**
 * Recursively freezes plain objects and arrays. Used by presets so that a
 * caller (or a test) cannot mutate shared config state through a nested
 * reference; `Object.freeze` alone is shallow.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
