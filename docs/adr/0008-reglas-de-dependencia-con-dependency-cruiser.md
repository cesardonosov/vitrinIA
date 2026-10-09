# ADR-0008: Reglas de dependencia verificadas con dependency-cruiser

- Estado: Aceptado
- Fecha: 2026-10-08
- Decide: Architect (aprobación de Cesar requerida: no — implementa VITRINIA.md §6.2 sin cambiarlo; la regla G6 la pidió Security en el threat model de tenancy)
- Issue: VIT-103
- Zona sensible: no (la regla `drizzle-only-in-infrastructure` apoya un control de tenancy, pero no toca auth, RLS ni datos)

## Contexto

- VITRINIA.md §6.2 fija la regla de dependencia `presentation → application → domain` y dice que "se verifica por dependency-cruiser en CI". Hasta este ADR no había configuración, por lo que la regla era una convención.
- ADR-0001 adopta un monolito modular con Clean Architecture completa en todos los módulos; ADR-0003 §4 prohíbe acceder a tablas de tienda fuera de `withStoreTx` y pide una regla de dependency-cruiser para ello.
- El threat model de tenancy (VIT-108) exige en el control C3 y la brecha G6 que "el cliente Drizzle solo se importe desde `infrastructure/`" y que la regla tenga fixture positivo y negativo.
- El riesgo declarado en VIT-103 es tener reglas tan laxas que no atrapen nada.
- TypeScript está fijado a `6.0.3` (VIT-101) y dependency-cruiser 18 soporta `>=2 <7`, lo que permite analizar imports con el compilador real, incluidos los `import type`.
- Hay un solo módulo real por ahora (`src/shared/kernel`); los demás nacen en el Sprint 1 y 2. Las rutas `src/infra/container.ts`, `src/infra/db/client.ts` y `src/infra/db/with-store-tx.ts` todavía no existen.

## Decisión

Usaremos **dependency-cruiser con reglas de severidad `error` para todas las capas, módulos, shared kernel, composition root y acceso a base de datos**, ejecutadas con `pnpm arch`, y **cada regla se demuestra con un fixture que debe fallar** (`tests/arch-fixtures/`, verificado por `tests/arch/rules.test.ts` en `pnpm test`).

Puntos concretos:

1. Catorce reglas, documentadas una por una en `docs/arquitectura/ARCHITECTURE.md` §3.2: cuatro de capas, una entre módulos (`no-cross-module-internals`: solo `application/index.ts` es público), dos del shared kernel, tres de composition root y `src/app/`, dos de tenancy (`drizzle-only-in-infrastructure`, `db-client-only-via-with-store-tx`) y tres de higiene (`no-circular`, `not-to-unresolvable`, `not-to-dev-dep`).
2. Los imports solo de tipos cuentan (`tsPreCompilationDeps: true`): `domain/` no puede importar Zod "solo por los tipos".
3. Los archivos `*.test.ts`, `*.spec.ts` y `*.stories.tsx` se excluyen del análisis; todo lo demás bajo `src/` se analiza.
4. El mismo archivo de configuración gobierna `src/` y los fixtures (rutas relativas al directorio de ejecución), para que no exista una configuración de prueba que diverja de la real.
5. La suite exige igualdad entre el conjunto de reglas del config y el conjunto de reglas cubiertas por fixtures: una regla sin fixture hace fallar `pnpm test`.
6. Rutas reservadas para VIT-107: `src/infra/db/client.ts` (conexión cruda, privada de `src/infra/db/`) y `src/infra/db/with-store-tx.ts` (única puerta a tablas de tienda). `src/infra/container.ts` es el composition root y el único archivo que importa `infrastructure/` de varios módulos.
7. Excepción VIT-103: los puntos de entrada de Next.js en la raíz de `src/` (`instrumentation.ts`, `middleware.ts`, `proxy.ts`) pueden importar código de plataforma de `src/infra/` (validación de env, headers), nunca la base de datos, que sigue bloqueada por `drizzle-only-in-infrastructure`.
8. Relajar una regla (`pathNot` nuevo) exige comentario `VIT-xxx` y, si debilita la arquitectura, un ADR. No se baja a `warn`.

## Alternativas consideradas

1. **dependency-cruiser con fixtures y suite de igualdad (elegida)**
   - Pros: ya es la herramienta nombrada en §6.2; usa el compilador de TypeScript; un solo archivo de reglas; reporta el nombre de la regla; sin servicio externo ni costo.
   - Contras: una dependencia de desarrollo más; las reglas son regex sobre rutas, así que la estructura de carpetas pasa a ser contrato.
2. **ESLint `no-restricted-imports` / `eslint-plugin-boundaries`**
   - Pros: integrado al linter.
   - Contras: el proyecto usa Biome, no ESLint; agregar ESLint solo para esto duplica herramientas; `no-restricted-imports` no entiende "el mismo módulo" (`$1`) ni ciclos.
3. **Convención escrita + revisión humana**
   - Pros: nada que instalar.
   - Contras: es exactamente lo que VIT-103 quiere eliminar; el Reviewer revisaría imports en vez de lógica.
4. **Reglas con `severity: "warn"` hasta tener módulos reales**
   - Pros: no bloquea a nadie durante el Sprint 1.
   - Contras: un `warn` se ignora y luego cuesta subirlo a `error`; el repo actual pasa en limpio, así que no hay motivo para empezar laxos.
5. **Fixtures dentro de `src/` con `// depcruise-ignore`**
   - Pros: un solo árbol.
   - Contras: contamina el build de Next y la cobertura; obliga a excepciones en el config real, que es lo que se quiere evitar.

## Consecuencias

- Positivas: la arquitectura de §6.2 y el control C3/G6 del threat model son verificables desde el primer módulo; el Reviewer revisa lógica, no imports; CI (VIT-105) solo necesita llamar a `pnpm arch`.
- Negativas / deuda:
  - La estructura de carpetas (`domain/`, `application/index.ts`, `src/infra/db/...`) es ahora contrato; renombrarla implica tocar el config, los fixtures y la doc.
  - `application/` no puede usar `node:*` ni paquetes: todo efecto va detrás de un puerto. Es intencional, pero el Builder lo notará en el primer caso de uso que necesite un UUID o un reloj.
  - La regla de Drizzle actúa por rutas; la parte "las tablas de tienda solo se consultan dentro de `withStoreTx`" (dentro de un mismo archivo de infraestructura) la cubre Semgrep en VIT-105 AC5, no esta herramienta.
  - `not-to-dev-dep` y `not-to-unresolvable` pueden fallar por errores de instalación, no de arquitectura; el mensaje lo deja claro.
- Reversibilidad: **alta**. Quitar la herramienta es borrar un archivo de config y un script; las reglas son datos.
- Seguridad: apoya el control C3 del threat model de tenancy (brecha G6 cerrada en la capa de imports). No sustituye RLS ni los tests de cruce.
- OPEX: USD 0.
