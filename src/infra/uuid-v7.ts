import { randomBytes } from "node:crypto";

/**
 * UUID v7 generator (RFC 9562): 48-bit unix-ms timestamp + 74 random bits.
 * Node 22 has no native v7 and Postgres 16 only has gen_random_uuid() (v4), so
 * the application generates every id (VITRINIA.md §7). Lives in infra, not in the
 * shared kernel, which only validates ids (src/shared/kernel/uuid.ts).
 */
export function uuidv7(nowMs: number = Date.now()): string {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs >= 2 ** 48) {
    throw new RangeError("uuidv7 timestamp must be an integer within 48 bits");
  }
  const bytes = randomBytes(16);
  // 48-bit big-endian timestamp.
  bytes[0] = Math.floor(nowMs / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(nowMs / 2 ** 32) & 0xff;
  bytes[2] = (nowMs >>> 24) & 0xff;
  bytes[3] = (nowMs >>> 16) & 0xff;
  bytes[4] = (nowMs >>> 8) & 0xff;
  bytes[5] = nowMs & 0xff;
  // Version 7 and RFC variant (10xx).
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
