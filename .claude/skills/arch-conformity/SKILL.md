---
name: arch-conformity
description: Verifica la conformidad con Clean Architecture (dominio puro, casos de uso solo con puertos, adaptadores en infrastructure, presentación delgada, composition root, StoreId) y corre dependency-cruiser; úsala en cada revisión de PR.
---

# arch-conformity

## Cuándo usarla
- Siempre dentro de una revisión de PR (junto a `code-review`).
- Al crear un módulo nuevo o mover archivos entre capas.
- Solo lectura: reportas, no corriges.

## Entradas
Diff del PR, `.dependency-cruiser.cjs`, `docs/arquitectura/ARCHITECTURE.md`, `docs/VITRINIA.md` §6.

## Pasos
1. Corre `pnpm depcruise` (equivale a `depcruise src --config .dependency-cruiser.cjs`). Cualquier violación es BLOCKER; no aceptes `// depcruise-ignore` ni excepciones nuevas en la config sin ADR.
2. **Dominio sin imports externos**:
   `rg "^import .* from ['\"]([^.@]|@/(?!shared/kernel))" src/modules/*/domain` y `rg "from ['\"](drizzle|next|react|zod|pg)" src/modules/*/domain` deben dar 0. Solo se permite `@/shared/kernel` y rutas relativas del propio dominio. Prohibidos `Date.now()` y `Math.random()` directos: entran como puertos (`Clock`, `IdGenerator`).
3. **Aplicación** (`application/`): importa solo `domain` y sus propios puertos. `rg "infrastructure|presentation|drizzle|next/" src/modules/*/application` = 0. Cada dependencia externa es una `interface` en `ports.ts`.
4. **Infraestructura**: todo adaptador (Drizzle, `ImageStorage`, email, MCP client) vive en `infrastructure/` e implementa un puerto. Ningún `import "drizzle-orm"` fuera de ahí ni de `src/infra/`.
5. **Presentación delgada**: server actions, route handlers y tools MCP solo (a) parsean con Zod, (b) obtienen la sesión, (c) llaman un caso de uso del `container`, (d) mapean `Result` a respuesta. Si hay `if` de reglas de negocio o acceso a BD, es BLOCKER.
6. **Composition root**: el cableado ocurre solo en `src/infra/container.ts`. Busca `new Drizzle...Repository(` fuera de él (`rg`) y casos de uso instanciados en componentes o rutas.
7. **Entre módulos**: se comunican por casos de uso exportados o eventos del outbox, nunca importando `domain/` o `infrastructure/` ajenos. Revisa imports `@/modules/<otro>/...`.
8. **StoreId en cada caso de uso**: abre cada archivo nuevo en `application/`; debe recibir `Session` y comparar `session.storeId` con el `StoreId` objetivo antes de leer o escribir. Debe existir un test "otra tienda → Forbidden". No vale confiar en el middleware ni en headers.
9. **Shared kernel**: cambios en `src/shared/kernel/*` solo por Architect con ADR; si el PR los toca sin ADR, BLOCKER.
10. **Patrones prohibidos** (VITRINIA.md §6.5): colas externas, microservicios, gateways: reporta.
11. Verifica que `docs/arquitectura/modulos/<modulo>.md` refleje las capas actuales.

## Salida
```
ARCH-CONFORMITY PR #<n>
depcruise: 0 violaciones | N (listar regla + archivo:línea)
Dominio puro: ✔/✘ · Aplicación solo puertos: ✔/✘ · Infra aislada: ✔/✘
Presentación delgada: ✔/✘ · Container único: ✔/✘ · Cruce entre módulos: ✔/✘
StoreId por caso de uso: <lista caso → test de cruce ✔/✘>
Hallazgos: [BLOCKER|IMPORTANT] archivo:línea — sugerencia
Veredicto: CONFORME | NO CONFORME
```

## Checklist
- [ ] depcruise en 0.
- [ ] Greps de dominio y aplicación en 0.
- [ ] Cableado solo en `container.ts`.
- [ ] Todo caso de uso nuevo verifica `StoreId` y tiene test de cruce.
- [ ] Docs del módulo al día.

## Errores comunes
- Aceptar un `import type` de Drizzle en el dominio "porque es solo un tipo".
- Dejar lógica de precio en un componente o server action.
- Que un módulo lea tablas de otro directamente.
- Creer que el middleware ya aisló la tienda.
- Subir la severidad de una violación a "NICE TO HAVE" para no frenar el PR.
