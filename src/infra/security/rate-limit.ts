export type RateLimiter = {
  allow(key: string, now?: number): boolean;
};

/** Fixed-window in-memory limiter. Per process; good enough for a report endpoint. */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs, maxKeys = 10_000 } = options;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    allow(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        if (!current && windows.size >= maxKeys) {
          for (const [k, w] of windows) {
            if (now - w.start >= windowMs) windows.delete(k);
          }
          if (windows.size >= maxKeys) return false;
        }
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}
