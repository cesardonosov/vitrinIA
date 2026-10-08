import { statSync } from "node:fs";

try {
  const age = Date.now() - statSync("/tmp/worker-heartbeat").mtimeMs;
  process.exit(age < 30_000 ? 0 : 1);
} catch {
  process.exit(1);
}
