import { getEnv } from "@/infra/env";
import { createDatabase, type Database } from "./client";

let defaultHandle: ReturnType<typeof createDatabase> | undefined;

/** Process-wide pool built from DATABASE_URL (app_user). Private to src/infra/db. */
export function defaultDb(): Database {
  if (!defaultHandle) {
    // getEnv() already validated DATABASE_URL as a postgres URL; the index signature widens it.
    const connectionString = String(getEnv().DATABASE_URL);
    defaultHandle = createDatabase({ connectionString });
  }
  return defaultHandle.db;
}
