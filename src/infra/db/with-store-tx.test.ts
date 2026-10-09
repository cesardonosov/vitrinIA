import { describe, expect, it, vi } from "vitest";
import type { StoreId } from "@/shared/kernel";
import type { Database } from "./client";
import { bindWithStoreTx, InvalidStoreContextError } from "./with-store-tx";

function fakeDb() {
  const transaction = vi.fn();
  return { db: { transaction } as unknown as Database, transaction };
}

describe("withStoreTx (unit; the database behaviour is in tests/integration)", () => {
  it.each([
    ["empty string", ""],
    ["not a uuid", "not-a-uuid"],
    ["uuid v4", "3b241101-e2bb-4255-8caf-4136c566a962"],
    ["sql injection attempt", "'; DROP TABLE stores; --"],
    ["number", 42],
    ["undefined", undefined],
    ["null", null],
  ])(
    "rejects an invalid StoreId (%s) before touching the database",
    async (_name, value) => {
      const { db, transaction } = fakeDb();
      const withStoreTx = bindWithStoreTx(db);
      const fn = vi.fn();
      await expect(withStoreTx(value as StoreId, fn)).rejects.toBeInstanceOf(
        InvalidStoreContextError,
      );
      expect(transaction).not.toHaveBeenCalled();
      expect(fn).not.toHaveBeenCalled();
    },
  );

  it("does not leak the rejected value in the error message", async () => {
    const { db } = fakeDb();
    const withStoreTx = bindWithStoreTx(db);
    const error = await withStoreTx(
      "secret-looking-value" as StoreId,
      vi.fn(),
    ).catch((e: unknown) => e);
    expect(String((error as Error).message)).not.toContain(
      "secret-looking-value",
    );
  });
});
