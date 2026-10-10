import type { DomainError } from "@/shared/kernel";
import { domainError, Result } from "@/shared/kernel";

export type InvalidRut = DomainError<"InvalidRut">;

/**
 * Chilean RUT with the modulo 11 check digit (ADR-0005 §5). Returns the canonical form
 * `12345678-5` (no dots, upper-case K), or an error that never echoes the input.
 */
export function parseRut(raw: string): Result<string, InvalidRut> {
  const cleaned = raw.replace(/[.\s]/g, "").toUpperCase();
  const match = /^(\d{7,8})-?([\dK])$/.exec(cleaned);
  const body = match?.[1];
  const check = match?.[2];
  if (!body || !check) return invalid();
  if (/^0+$/.test(body)) return invalid();
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === check ? Result.ok(`${body}-${check}`) : invalid();
}

function invalid(): Result<string, InvalidRut> {
  return Result.err(domainError("InvalidRut", "RUT is not valid"));
}
