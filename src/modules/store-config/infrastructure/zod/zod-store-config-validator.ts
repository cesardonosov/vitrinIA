import type { z } from "zod";
import { domainError, Result } from "@/shared/kernel";
import type { StoreConfigValidator } from "../../application/ports/store-config-validator";
import type { InvalidStoreConfig, StoreConfigIssue } from "../../domain/errors";
import { storeConfigV1Schema } from "./store-config-v1.schema";

/**
 * Adapter of `StoreConfigValidator` backed by the Zod schema.
 *
 * Issues carry the JSON path and a message, never the rejected value
 * (`error.issues[].input` is dropped on purpose: it may contain attacker data
 * or personal data and would end up in logs). Unknown keys are attacker
 * controlled too: Zod's default message quotes them, so `unrecognized_keys`
 * gets a fixed message and the path of the object, never the key names.
 */
const UNKNOWN_KEYS_MESSAGE = "object has keys that are not in the schema";

function messageOf(issue: z.core.$ZodIssue): string {
  return issue.code === "unrecognized_keys"
    ? UNKNOWN_KEYS_MESSAGE
    : issue.message;
}

export const zodStoreConfigValidator: StoreConfigValidator = Object.freeze({
  validate(input: unknown) {
    const parsed = storeConfigV1Schema.safeParse(input);
    if (parsed.success) return Result.ok(parsed.data);
    const issues: StoreConfigIssue[] = parsed.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: messageOf(issue),
    }));
    const error: InvalidStoreConfig = Object.freeze({
      ...domainError(
        "InvalidStoreConfig",
        `store config has ${issues.length} invalid field(s)`,
      ),
      issues: Object.freeze(issues),
    });
    return Result.err(error);
  },
});
