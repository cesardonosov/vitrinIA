// Violates no-circular (with violates-no-circular-a.ts).
import { a } from "./violates-no-circular-a";

export const b = () => a;
