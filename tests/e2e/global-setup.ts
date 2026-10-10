import { execFileSync } from "node:child_process";
import { requireTestUrl } from "../integration/test-url";

/** Seeds the Kanuwiñ demo store and catalog, plus the cross-store fixtures, into the TEST database (idempotent). */
export default function globalSetup(): void {
  const url = requireTestUrl("TEST_DATABASE_URL");
  for (const file of [
    "infra/seed/demo.sql",
    "infra/seed/demo-catalog.sql",
    "tests/e2e/second-store.sql",
  ]) {
    execFileSync("psql", [url, "-q", "-v", "ON_ERROR_STOP=1", "-f", file], {
      stdio: "inherit",
    });
  }
}
