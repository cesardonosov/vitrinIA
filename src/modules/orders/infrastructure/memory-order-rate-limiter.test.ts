import { describe, expect, it } from "vitest";
import { StoreId } from "@/shared/kernel";
import { createMemoryOrderRateLimiter } from "./memory-order-rate-limiter";

const store = (n: number) => {
  const r = StoreId.parse(`0199d0a0-0000-7000-8000-00000000000${n}`);
  if (!r.ok) throw new Error("id");
  return r.value;
};

describe("createMemoryOrderRateLimiter (O12)", () => {
  it("allows 5 per client and store in the window, then refuses the 6th", () => {
    let t = 0;
    const limiter = createMemoryOrderRateLimiter({ now: () => t });
    for (let i = 0; i < 5; i++)
      expect(limiter.check(store(1), "1.2.3.0")).toBe("allowed");
    expect(limiter.check(store(1), "1.2.3.0")).toBe("client_limit");
    // Another client, and another store, are not affected.
    expect(limiter.check(store(1), "9.9.9.0")).toBe("allowed");
    expect(limiter.check(store(2), "1.2.3.0")).toBe("allowed");
    t = 10 * 60 * 1000;
    expect(limiter.check(store(1), "1.2.3.0")).toBe("allowed");
  });

  it("caps a store per day regardless of the address", () => {
    const limiter = createMemoryOrderRateLimiter({ storeDailyQuota: 3 });
    expect(limiter.check(store(1), "a")).toBe("allowed");
    expect(limiter.check(store(1), "b")).toBe("allowed");
    expect(limiter.check(store(1), "c")).toBe("allowed");
    expect(limiter.check(store(1), "d")).toBe("store_quota");
    expect(limiter.check(store(2), "d")).toBe("allowed");
  });

  it("a client refused by its own limit does not spend the store quota", () => {
    const limiter = createMemoryOrderRateLimiter({
      clientLimit: 1,
      storeDailyQuota: 2,
    });
    expect(limiter.check(store(1), "a")).toBe("allowed");
    expect(limiter.check(store(1), "a")).toBe("client_limit");
    expect(limiter.check(store(1), "a")).toBe("client_limit");
    expect(limiter.check(store(1), "b")).toBe("allowed");
  });
});
