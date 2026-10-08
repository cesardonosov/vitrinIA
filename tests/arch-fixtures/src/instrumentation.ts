// Positive control: a Next.js entry point may import platform code in src/infra/.
import { env } from "@/infra/env";

export function register(): void {
  void env;
}
