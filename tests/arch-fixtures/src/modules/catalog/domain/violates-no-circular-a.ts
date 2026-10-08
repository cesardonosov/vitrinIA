// Violates no-circular (with violates-no-circular-b.ts).
import { b } from "./violates-no-circular-b";

export const a = () => b;
