import { describe, expect, it } from "vitest";
import { StoreId } from "@/shared/kernel";
import type { StoreHostResolver } from "../application";
import {
  createCachedHostResolver,
  MAX_HOST_CACHE_TTL_MS,
} from "./cached-store-host-resolver";

function storeId(n: number): StoreId {
  const parsed = StoreId.parse(
    `0199d0a0-0000-7000-8000-${n.toString(16).padStart(12, "0")}`,
  );
  if (!parsed.ok) throw new Error("bad test id");
  return parsed.value;
}
const A = storeId(1);
const B = storeId(2);

/** Inner resolver backed by a mutable table; counts the lookups it receives. */
function fakeInner(table: Map<string, StoreId>) {
  const calls: string[] = [];
  const inner: StoreHostResolver = {
    async resolve(host) {
      calls.push(host);
      return table.get(host);
    },
  };
  return { inner, calls };
}

function clock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createCachedHostResolver", () => {
  it("answers from memory within the TTL and asks again after it", async () => {
    const table = new Map([["a.vitrinia.cl", A]]);
    const { inner, calls } = fakeInner(table);
    const c = clock();
    const cache = createCachedHostResolver(inner, {
      ttlMs: 30_000,
      now: c.now,
    });

    expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
    expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
    expect(calls).toHaveLength(1);

    c.advance(29_999);
    expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
    expect(calls).toHaveLength(1);

    c.advance(1);
    expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
    expect(calls).toHaveLength(2);
  });

  it("refuses a TTL above 60 s and nonsensical limits", () => {
    const { inner } = fakeInner(new Map());
    expect(MAX_HOST_CACHE_TTL_MS).toBe(60_000);
    expect(() => createCachedHostResolver(inner, { ttlMs: 60_001 })).toThrow(
      RangeError,
    );
    expect(() => createCachedHostResolver(inner, { ttlMs: 0 })).toThrow(
      RangeError,
    );
    expect(() =>
      createCachedHostResolver(inner, { ttlMs: 10_000, negativeTtlMs: 10_001 }),
    ).toThrow(RangeError);
    expect(() => createCachedHostResolver(inner, { maxEntries: 0 })).toThrow(
      RangeError,
    );
    expect(() =>
      createCachedHostResolver(inner, { ttlMs: 60_000 }),
    ).not.toThrow();
  });

  describe("C12: a host never inherits another store's answer", () => {
    it("a reassigned host keeps resolving to the old store until it is invalidated, then to the new one", async () => {
      const table = new Map([["tienda.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const c = clock();
      const cache = createCachedHostResolver(inner, { now: c.now });

      expect(await cache.resolve("tienda.vitrinia.cl")).toBe(A);
      table.set("tienda.vitrinia.cl", B); // reassigned in the database
      expect(await cache.resolve("tienda.vitrinia.cl")).toBe(A); // stale, bounded by the TTL

      cache.invalidateHost("tienda.vitrinia.cl");
      expect(await cache.resolve("tienda.vitrinia.cl")).toBe(B);
    });

    it("without an invalidation the new owner shows up once the TTL passes", async () => {
      const table = new Map([["tienda.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const c = clock();
      const cache = createCachedHostResolver(inner, { now: c.now });
      await cache.resolve("tienda.vitrinia.cl");
      table.set("tienda.vitrinia.cl", B);
      c.advance(MAX_HOST_CACHE_TTL_MS);
      expect(await cache.resolve("tienda.vitrinia.cl")).toBe(B);
    });

    it("a released host stops resolving after invalidation, and a new host is never served the old one", async () => {
      const table = new Map([["vieja.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      await cache.resolve("vieja.vitrinia.cl");

      table.delete("vieja.vitrinia.cl");
      cache.invalidateHost("vieja.vitrinia.cl");
      expect(await cache.resolve("vieja.vitrinia.cl")).toBeUndefined();

      // A brand-new host that nobody resolved before is a miss, never A.
      expect(await cache.resolve("nueva.vitrinia.cl")).toBeUndefined();
      table.set("nueva.vitrinia.cl", B);
      cache.invalidateHost("nueva.vitrinia.cl");
      expect(await cache.resolve("nueva.vitrinia.cl")).toBe(B);
    });

    it("a rename invalidates both hosts: the old stops resolving, the new starts", async () => {
      const table = new Map([["antes.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      await cache.resolve("antes.vitrinia.cl");
      expect(await cache.resolve("despues.vitrinia.cl")).toBeUndefined();

      table.delete("antes.vitrinia.cl");
      table.set("despues.vitrinia.cl", A);
      cache.invalidateHost("antes.vitrinia.cl");
      cache.invalidateHost("despues.vitrinia.cl");

      expect(await cache.resolve("antes.vitrinia.cl")).toBeUndefined();
      expect(await cache.resolve("despues.vitrinia.cl")).toBe(A);
    });

    it("different hosts never share an entry, and near-miss hosts are not matched", async () => {
      const table = new Map([
        ["a.vitrinia.cl", A],
        ["b.vitrinia.cl", B],
      ]);
      const { inner } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
      expect(await cache.resolve("b.vitrinia.cl")).toBe(B);
      expect(await cache.resolve("c.a.vitrinia.cl")).toBeUndefined();
      expect(await cache.resolve("vitrinia.cl")).toBeUndefined();
      expect(await cache.resolve("xa.vitrinia.cl")).toBeUndefined();
    });

    it("hosts that are not canonical bypass the cache: spellings never share an entry", async () => {
      const table = new Map([["a.vitrinia.cl", A]]);
      const { inner, calls } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      await cache.resolve("a.vitrinia.cl");
      expect(await cache.resolve("A.VITRINIA.CL")).toBeUndefined(); // the inner decides, not the cache
      expect(await cache.resolve("a.vitrinia.cl:3000")).toBeUndefined();
      expect(calls).toEqual([
        "a.vitrinia.cl",
        "A.VITRINIA.CL",
        "a.vitrinia.cl:3000",
      ]);
      expect(cache.size()).toEqual({ resolved: 1, unresolved: 0 });
    });

    it("a lookup that was in flight during an invalidation does not store its stale answer", async () => {
      let release: (id: StoreId | undefined) => void = () => {};
      const slow: StoreHostResolver = {
        resolve: () =>
          new Promise<StoreId | undefined>((resolve) => {
            release = resolve;
          }),
      };
      const cache = createCachedHostResolver(slow);
      const pending = cache.resolve("carrera.vitrinia.cl");
      cache.invalidateHost("carrera.vitrinia.cl"); // the domain changed while the query ran
      release(A); // the query still saw the old mapping
      expect(await pending).toBe(A); // that one request may see it...
      expect(cache.size()).toEqual({ resolved: 0, unresolved: 0 }); // ...nobody else does
    });
  });

  describe("invalidation", () => {
    it("invalidateStore forgets every host of that store and only those", async () => {
      const table = new Map([
        ["a1.vitrinia.cl", A],
        ["a2.vitrinia.cl", A],
        ["b1.vitrinia.cl", B],
      ]);
      const { inner, calls } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      for (const host of table.keys()) await cache.resolve(host);
      expect(calls).toHaveLength(3);

      cache.invalidateStore(A);
      await cache.resolve("b1.vitrinia.cl");
      expect(calls).toHaveLength(3); // B stays cached
      await cache.resolve("a1.vitrinia.cl");
      await cache.resolve("a2.vitrinia.cl");
      expect(calls).toHaveLength(5);
    });

    it("clear forgets everything; invalidating an unknown or malformed host is harmless", async () => {
      const table = new Map([["a.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      await cache.resolve("a.vitrinia.cl");
      await cache.resolve("x.vitrinia.cl");
      expect(cache.size()).toEqual({ resolved: 1, unresolved: 1 });
      cache.invalidateHost("¡no es un host!");
      cache.invalidateHost("nunca-visto.vitrinia.cl");
      expect(cache.size()).toEqual({ resolved: 1, unresolved: 1 });
      cache.clear();
      expect(cache.size()).toEqual({ resolved: 0, unresolved: 0 });
    });

    it("invalidateHost accepts the same spellings resolve normalises (case, port)", async () => {
      const table = new Map([["a.vitrinia.cl", A]]);
      const { inner } = fakeInner(table);
      const cache = createCachedHostResolver(inner);
      await cache.resolve("a.vitrinia.cl");
      cache.invalidateHost("A.vitrinia.cl:443");
      expect(cache.size().resolved).toBe(0);
    });
  });

  describe("unresolved hosts", () => {
    it("are remembered only briefly, so a verified domain shows up quickly even without invalidation", async () => {
      const table = new Map<string, StoreId>();
      const { inner, calls } = fakeInner(table);
      const c = clock();
      const cache = createCachedHostResolver(inner, {
        negativeTtlMs: 5_000,
        now: c.now,
      });
      expect(await cache.resolve("nueva.vitrinia.cl")).toBeUndefined();
      expect(await cache.resolve("nueva.vitrinia.cl")).toBeUndefined();
      expect(calls).toHaveLength(1);

      table.set("nueva.vitrinia.cl", A);
      c.advance(5_000);
      expect(await cache.resolve("nueva.vitrinia.cl")).toBe(A);
    });

    it("are bounded and cannot evict resolved stores (host-spraying)", async () => {
      const table = new Map([["real.vitrinia.cl", A]]);
      const { inner, calls } = fakeInner(table);
      const cache = createCachedHostResolver(inner, {
        maxNegativeEntries: 50,
        maxEntries: 10,
      });
      await cache.resolve("real.vitrinia.cl");
      for (let i = 0; i < 5_000; i++) {
        await cache.resolve(`ruido-${i}.vitrinia.cl`);
      }
      expect(cache.size().unresolved).toBeLessThanOrEqual(50);
      expect(cache.size().resolved).toBe(1);
      const before = calls.length;
      expect(await cache.resolve("real.vitrinia.cl")).toBe(A);
      expect(calls).toHaveLength(before); // still served from memory
    });
  });

  it("resolved hosts are bounded too: the oldest entry is evicted", async () => {
    const table = new Map<string, StoreId>();
    for (let i = 0; i < 30; i++)
      table.set(`t${i}.vitrinia.cl`, storeId(100 + i));
    const { inner } = fakeInner(table);
    const cache = createCachedHostResolver(inner, { maxEntries: 8 });
    for (const host of table.keys()) await cache.resolve(host);
    expect(cache.size().resolved).toBe(8);
  });

  it("does not cache a failure of the inner resolver", async () => {
    let fail = true;
    const flaky: StoreHostResolver = {
      async resolve() {
        if (fail) throw new Error("db down");
        return A;
      },
    };
    const cache = createCachedHostResolver(flaky);
    await expect(cache.resolve("a.vitrinia.cl")).rejects.toThrow("db down");
    fail = false;
    expect(await cache.resolve("a.vitrinia.cl")).toBe(A);
  });
});
