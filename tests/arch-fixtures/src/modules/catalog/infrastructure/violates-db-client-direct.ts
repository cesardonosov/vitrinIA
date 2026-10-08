// Violates db-client-only-via-with-store-tx: adapters go through withStoreTx, never the raw client.
export { client } from "@/infra/db/client";
