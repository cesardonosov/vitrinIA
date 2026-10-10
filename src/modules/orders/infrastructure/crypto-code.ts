import { randomInt } from "node:crypto";
import { generateOrderCode } from "../domain/order-code";

/** Order code from the OS CSPRNG (`randomInt` is unbiased). */
export const newOrderCode = (): string =>
  generateOrderCode((max) => randomInt(max));
