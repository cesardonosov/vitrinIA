// Allowed by drizzle-only-in-infrastructure: adapters may import drizzle-orm.
// (It still trips not-to-unresolvable here because the package is not installed in the fixtures.)
export { sql } from "drizzle-orm";
