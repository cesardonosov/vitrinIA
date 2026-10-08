/**
 * Dependency rules for VitrinIA (VITRINIA.md §6.2, ADR-0003, ADR-0008).
 *
 * Every rule is documented in docs/arquitectura/ARCHITECTURE.md §3 and has a
 * fixture under tests/arch-fixtures/ that must violate it (tests/arch/rules.test.ts).
 * Paths are regular expressions relative to the current working directory, so the
 * same file governs both `src/` and the fixture tree (run from tests/arch-fixtures).
 *
 * Adding a `pathNot` exception requires a `VIT-xxx` comment and, if it weakens a
 * rule, an ADR (skill `arch-rules`).
 */

/** Shared kernel: pure TypeScript, usable from every layer. */
const KERNEL = "^src/shared/kernel/";

/** The only place allowed to import `infrastructure/` of several modules. */
const COMPOSITION_ROOT = "^src/infra/container\\.ts$";

/**
 * Next.js framework entry points that live at the root of src/ and bootstrap
 * the process (env validation, request headers). They may import platform
 * code in src/infra/ but never the database surface.
 * VIT-103: exception recorded in ADR-0008 (Decisión) and ARCHITECTURE.md §3.2.
 */
const FRAMEWORK_ENTRY_POINTS = "^src/(instrumentation|middleware|proxy)\\.ts$";

/** Public entry point of a module: the only thing another module may import. */
const MODULE_PUBLIC_API = "^src/modules/[^/]+/application/index\\.ts$";

/**
 * Database client surface (threat model tenancy C3/G6).
 * Matches both the resolved path (`node_modules/drizzle-orm/...`) and the raw
 * specifier when the package is not installed (`drizzle-orm/pg-core`).
 */
const DB_PACKAGES = "(^|/)(drizzle-orm|postgres|pg)(/|$)";
const DB_PLATFORM = "^src/infra/db/";
const DB_CLIENT = "^src/infra/db/client\\.ts$";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---------------------------------------------------------------- layers
    {
      name: "domain-is-pure",
      comment:
        "domain/ only imports its own domain/ and the shared kernel: no packages, no Node built-ins, no other layers (VITRINIA.md §6.2).",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/domain/" },
      to: { pathNot: ["^src/modules/$1/domain/", KERNEL] },
    },
    {
      name: "application-only-domain-and-kernel",
      comment:
        "application/ only imports its own application/ and domain/, the shared kernel and the public application/index.ts of other modules. External packages belong behind a port in infrastructure/.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/application/" },
      to: {
        pathNot: [
          "^src/modules/$1/(application|domain)/",
          KERNEL,
          MODULE_PUBLIC_API,
        ],
      },
    },
    {
      name: "presentation-not-to-infrastructure",
      comment:
        "presentation/ talks to use cases, never to adapters. Wiring happens in src/infra/container.ts.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/presentation/" },
      to: { path: "^src/modules/$1/infrastructure/" },
    },
    {
      name: "infrastructure-not-to-presentation",
      comment: "Adapters implement ports; they never depend on presentation/.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/infrastructure/" },
      to: { path: "^src/modules/$1/presentation/" },
    },

    // --------------------------------------------------------- cross-module
    {
      name: "no-cross-module-internals",
      comment:
        "A module may only import another module through its application/index.ts. domain/, infrastructure/ and presentation/ of other modules are private.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/[^/]+/",
        pathNot: ["^src/modules/$1/", MODULE_PUBLIC_API],
      },
    },

    // -------------------------------------------------------- shared kernel
    {
      name: "kernel-is-self-contained",
      comment:
        "src/shared/kernel imports nothing outside itself: no packages, no Node built-ins, no modules, no infra (ARCHITECTURE.md §2).",
      severity: "error",
      from: { path: KERNEL },
      to: { pathNot: KERNEL },
    },
    {
      name: "shared-not-to-app-code",
      comment:
        "src/shared/ is below every module: it never imports modules/, infra/ or app/.",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/(modules|infra|app)/" },
    },

    // ----------------------------------------------- composition root & app
    {
      name: "infrastructure-only-wired-in-container",
      comment:
        "Only src/infra/container.ts (composition root) and the adapters of the same module import a module's infrastructure/.",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: [COMPOSITION_ROOT, "^src/modules/([^/]+)/infrastructure/"],
      },
      to: { path: "^src/modules/[^/]+/infrastructure/" },
    },
    {
      name: "app-only-presentation-and-application",
      comment:
        "src/app/ (Next.js routes) imports presentation/ and application/ of modules, never domain/ or infrastructure/.",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/(domain|infrastructure)/" },
    },
    {
      name: "platform-infra-only-from-adapters",
      comment:
        "src/infra/ (db client, withStoreTx, platform adapters) is reachable only from module infrastructure/ and from src/infra/ itself; app/ and presentation/ may import the composition root, and the Next.js entry points (instrumentation, middleware/proxy) may import platform code but not the database (see drizzle-only-in-infrastructure).",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: [
          "^src/modules/[^/]+/infrastructure/",
          "^src/infra/",
          FRAMEWORK_ENTRY_POINTS,
        ],
      },
      to: { path: "^src/infra/", pathNot: COMPOSITION_ROOT },
    },

    // ----------------------------------------------- tenancy (ADR-0003, G6)
    {
      name: "drizzle-only-in-infrastructure",
      comment:
        "The Drizzle client (drizzle-orm, postgres/pg driver, src/infra/db/) is imported only from module infrastructure/ or src/infra/. Threat model tenancy C3 / G6.",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: ["^src/modules/[^/]+/infrastructure/", "^src/infra/"],
      },
      to: { path: [DB_PACKAGES, DB_PLATFORM] },
    },
    {
      name: "db-client-only-via-with-store-tx",
      comment:
        "The raw connection (src/infra/db/client.ts) is private to src/infra/db/: every store query goes through withStoreTx (ADR-0003 §4, threat model C3).",
      severity: "error",
      from: { pathNot: DB_PLATFORM },
      to: { path: DB_CLIENT },
    },

    // -------------------------------------------------------------- hygiene
    {
      name: "no-circular",
      comment: "Cycles hide the real direction of dependencies.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      comment:
        "Every import must resolve (typos, missing packages, broken aliases).",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "not-to-dev-dep",
      comment:
        "Production code under src/ must not import devDependencies (test, spec and Storybook story files are excluded from the cruise).",
      severity: "error",
      from: { path: "^src/" },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only"],
      },
    },
  ],
  options: {
    // Test files are not production dependency surface; they may import vitest.
    exclude: { path: "\\.(test|spec|stories)\\.tsx?$" },
    doNotFollow: { path: "node_modules" },
    // Follow type-only imports too: "domain imports Zod only for the types" is still a violation.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
