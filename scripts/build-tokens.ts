import { writeFileSync } from "node:fs";
import { buildTokensCss } from "../src/shared/design/css.ts";

const target = new URL("../src/shared/design/tokens.css", import.meta.url);
writeFileSync(target, buildTokensCss());
console.log("tokens.css written");
