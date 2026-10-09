// Violates application-only-domain-and-kernel: Node built-ins belong behind a port.
export { randomUUID } from "node:crypto";
