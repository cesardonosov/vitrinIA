// Positive control: withStoreTx is the only consumer of the raw client (ADR-0003 §4).
import { client } from "./client";

export const withStoreTx = async <T>(fn: (tx: typeof client) => Promise<T>) =>
  fn(client);
