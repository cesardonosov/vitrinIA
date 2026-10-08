# VitrinIA

Vitrinas online gratis para vendedores de Instagram/WhatsApp en Chile. Definiciones en `docs/VITRINIA.md`; reglas para agentes en `AGENTS.md`.

## Requisitos

- Node 22.22.0 (fijado en `.nvmrc`; `engine-strict` rechaza otras versiones).
- pnpm 10.28.0 (fijado en `packageManager`; actívalo con `corepack enable`).

## Cómo levantar

```bash
nvm use              # toma la versión de .nvmrc
pnpm install
pnpm dev             # desarrollo en http://localhost:3000
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm build` | Compila la app para producción |
| `pnpm start` | Sirve el build de producción |
| `pnpm typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`) |
| `pnpm lint` | Biome; `any` explícito es error |

## Estructura

`src/app/(portal)`, `src/app/(vitrina)`, `src/modules`, `src/shared`, `src/infra` y `src/middleware.ts` (por ahora solo pasa la petición). Detalle en `docs/VITRINIA.md` §6.4.
