// PLACEHOLDER worker. It does NOT process jobs and does NOT touch the database.
// The real worker (pg-boss + outbox) arrives in a later issue.
// It only proves that the container starts with the right configuration:
//   - it refuses to start if DATABASE_URL does not use the `app_user` role;
//   - it writes a heartbeat file that the Docker healthcheck inspects.
import { writeFileSync } from "node:fs";

const HEARTBEAT = "/tmp/worker-heartbeat";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
let username;
try {
  username = decodeURIComponent(new URL(url).username);
} catch {
  // Never echo the error or the value: the URL carries the password.
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}
if (username !== "app_user") {
  console.error("DATABASE_URL must use the app_user role (ADR-0003)");
  process.exit(1);
}

const beat = () => writeFileSync(HEARTBEAT, String(Date.now()));
beat();
setInterval(beat, 10_000);
console.log("worker placeholder started: it does not process jobs");

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => process.exit(0));
}
