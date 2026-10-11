/**
 * Own-property lookup for cart item info keyed by variant id. A plain `items[id]` would
 * resolve ids such as `__proto__` or `constructor` to inherited properties.
 */
export function lookupItem<T>(
  items: Readonly<Record<string, T>>,
  id: string,
): T | undefined {
  return Object.hasOwn(items, id) ? items[id] : undefined;
}
