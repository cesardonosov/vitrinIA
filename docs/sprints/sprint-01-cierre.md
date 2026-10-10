# Sprint 1 — Fundaciones y marca · cierre

> **BORRADOR.** #38, #39 y #75 ya están en `main` (OK de Cesar, 2026-10-10). Se finaliza cuando Cesar corra `pnpm dev:up` y se cierre VIT-114. Cifras verificadas con `gh api` el 2026-10-10.

Fechas: 2026-10-08 a 2026-10-14 (plan en [`sprint-01.md`](sprint-01.md)). Borrador escrito el 2026-10-10.

## Resultado

Objetivo: **parcial** (15/16; falta la verificación humana de la demo) — los gates de CI y la base segura están en `main`; la demo "levanta con un comando" no está verificada de punta a punta.

Issues: **15 cerrados de 16** (todos salvo VIT-114). Cerrados el 2026-10-10: VIT-102 (#38, `4cdf4a1`), VIT-108 (#39, `d79c4e0`) y VIT-113 (cerrado tal como está). Pendiente:

- VIT-113 (#13) se cerró con el preset `aves` y el catálogo de Kanuwiñ (#70). Movido al Sprint 2 con motivo: la story y las capturas a 375 px necesitan los componentes de vitrina; se crea un issue nuevo.
- VIT-114 (#14): #75 (`c3f150d`) está en `main` con "Refs #14", así que el issue sigue abierto. Criterio 2 pasa; criterio 1 espera el `pnpm dev:up` de Cesar; criterio 3 parcial (bugs listados, issues por crear).

Seguimientos de review que viven en el milestone y no cuentan en las 16: #43, #44, #54, #60–#64, #68 (todos abiertos) y VIT-174 (#74, ADR-0003: las particiones no heredan RLS, Architect). Ninguno bloquea la demo; el Orchestrator los reparte al planificar el Sprint 2.

Mergeado hoy 2026-10-09: #69, #70, #71, #72 (ADR-0009, deny de secretos) y #73 (dominio `vitrinia.cl`).

## DoD por issue

Leyenda: OK = cumplido con evidencia; PEND = falta algo concreto. Todos los PRs mezclados pasaron Reviewer y CI; los de zona sensible pasaron Security.

| Issue | DoD | Pendiente |
|---|---|---|
| VIT-101 Next.js + pnpm + TS strict | OK. #32, 12 checks de CI en verde | — |
| VIT-102 Shared kernel | OK. #38 mergeado (`4cdf4a1`), aprobado, CI 12/12 verde | — |
| VIT-103 Reglas de capas | OK. Contenido ya en `main`; #45 cerrado por redundante. `pnpm arch`: 0 violaciones en 54 módulos (QA, paso 5) | — |
| VIT-104 docker-compose | OK en Postgres + Mailpit (QA pasos 15–16: `healthy`, `app_user` sin BYPASSRLS). `app`/`worker`: no verificado aquí | Cubierto por VIT-114 criterio 1 |
| VIT-105 Pipeline de CI | OK. #53; 12 checks en `success` en `7e79040` (QA, criterio 2) | `main` sin protección de rama (D6, acción de Cesar) |
| VIT-106 dotenvx + env Zod | OK. #34; ADR-0009 y deny de secretos en `main` (#72) | Security debe correr la matriz de ADR-0009 §5 en sesión fresca |
| VIT-107 Esquema con RLS | OK. #46; 75/75 tests de integración (QA paso 11); aprobado por Security | VIT-174 (#74): corregir ADR-0003 decisión 3 |
| VIT-108 Threat model + SECURITY.md | OK. #39 mergeado (`d79c4e0`), aprobado por Reviewer y Security, CI 12/12 verde | — |
| VIT-109 Arnés de cruce | OK. #56; 23/23 y mutation check "all 8 checks ok" (QA pasos 12–13) | — |
| VIT-110 Store Config v1 | OK. #66; ADR-0004 v3 confirmado por Cesar el 2026-10-09 | — |
| VIT-111 Marca | OK. Instantánea como marca provisoria (Cesar, 2026-10-08) | Marca definitiva fuera del sprint |
| VIT-112 Tokens + Storybook | OK. #65 | `build-storybook` y axe en CI (seguimiento P3) |
| VIT-113 Preset 1 | OK (cerrado tal como está). `aves` + catálogo Kanuwiñ en `main` (#70) | Story y capturas a 375 px pasan al Sprint 2; 2 fotos reales |
| VIT-114 Verificar la demo | PARCIAL. Criterio 2 pasa (CI verde y reproducido en local, `docs/qa/sprint-01-demo.md`, mergeado en #75, `c3f150d`); criterio 3 parcial | Criterio 1: `pnpm dev:up` de Cesar |
| VIT-115 Headers y CSP | OK. #42, modo report-only | Enforce en Sprint 2 |
| VIT-116 Deny de secretos | OK. ADR-0009 aprobado y aplicado (#72) | Matriz §5 de Security (ver VIT-106) |

Ningún issue se da por cerrado sin review y CI; VIT-114 se cierra solo con la corrida de Cesar.

## Guion de demo

Máx. 8 pasos, en viewport móvil donde aplique. Datos de prueba solamente (catálogo semilla de Kanuwiñ, ya publicado por Cesar; sin datos de compradores). Pasos 2 y 5–7 los ejecutó QA en un contenedor; el paso 4 es el que **nadie ha corrido todavía**.

1. Mostrar `main` en GitHub: 12 checks en verde y la lista de PRs mezclados. Esperado: todos `success`. Plan B: captura de `check-runs` de `7e79040`.
2. Clonar y `pnpm install --frozen-lockfile`. Esperado: termina sin errores (aviso "Ignored build scripts" es intencional). Plan B: caché de pnpm.
3. `cp .env.example .env.local` y completar los 4 secretos (paso humano, ADR-0009; no se muestran en pantalla). Esperado: archivo listo.
4. `pnpm dev:up`. Esperado: Postgres, Mailpit, app y worker `healthy` en menos de 10 min; `http://localhost:3000` responde. Plan B: `docker compose up -d --wait postgres mailpit` y `pnpm dev` para la app. **Pendiente de la corrida de Cesar.**
5. `pnpm test:integration` y `pnpm test:tenant-isolation`. Esperado: 75/75 y 23/23. Plan B: mostrar el job `integration` del CI.
6. `pnpm test:tenant-isolation:mutations`. Esperado: "all 8 checks ok" (las 8 mutaciones se detectan). Plan B: log del CI.
7. Consulta de roles del runbook. Esperado: `app_user`, `migrator`, `host_resolver` con `rolsuper=f` y `rolbypassrls=f`. Plan B: salida guardada del runbook.
8. Abrir Mailpit (`:8025`) y el catálogo semilla `aves` en el celular. Esperado: Mailpit responde 200; el catálogo se ve en 375 px (hoy solo como datos, la vitrina llega en el Sprint 2). Plan B: mostrar el JSON del preset.

Ensayo: no hay ensayo completo en móvil con `dev:up` (paso 4 sin correr). Se registra aquí cuando Cesar lo haga.

## Retro

- Funcionó: CI con 12 barreras y arnés de cruce de tiendas desde el día 1; atacar RLS con 40+ pruebas antes de mezclar.
- No funcionó: el criterio "un comando" exige pasos humanos (`.env.local`) y no se pudo probar en una máquina limpia; `main` sigue sin protección de rama; PRs de zona sensible esperaron a Security.
- Cambiamos: la demo se ensaya en una máquina con internet directo antes del cierre y la protección de `main` pasa a ser lo primero del Sprint 2 (acción de Cesar); QA verifica con el README en mano.

## Deuda

TODO(VIT-xxx): **1** en `src worker tests` (sprint anterior: no existe, es el primer sprint) — sin tendencia aún.
Es `TODO(VIT-126)` en `src/infra/db/client.ts` (reemplazar `console.error` por pino); VIT-126 (#26) está abierto, así que no hay TODO huérfano. Nota: `pnpm todo-check` en QA contó 2 TODO válidos; la diferencia se concilia al finalizar este documento.

Bugs de QA sin resolver: D6 (`main` sin protección, acción de Cesar) y D9 (aviso `middleware` → `proxy`, ya cubierto por VIT-135 / #35, Sprint 2). D1–D5, D7 y D8 se corrigieron en #75 (mergeado); D10 queda por documentar.

## Próximo sprint

Sugerido: Sprint 2 — primera vitrina real (componentes de vitrina, `order_contacts`, pagos múltiples, VIT-135 proxy, enforce de CSP) más las deudas de seguridad VIT-174 y los seguimientos #43/#44/#54/#60–#64/#68. Incluye story y capturas de VIT-113. Se propone al cerrar este Sprint, no antes.

## Resumen para Cesar (borrador)

**Sprint 1: 15 de 16 issues cerrados; falta tu corrida.**

- Visible: CI con 12 checks en verde en `main`; RLS probada con 75 tests de integración y 8 ataques detectados; preset `aves` con el catálogo de Kanuwiñ; threat model y SECURITY.md en `main`.
- Riesgo principal: la demo "un comando" no se ha probado completa (`app`/`worker` no compilan en el contenedor de QA) y `main` no tiene protección de rama.
- TODO: 1 (primer sprint, sin tendencia).
- Demo: se agenda cuando corras `pnpm dev:up`; cierre del sprint 2026-10-14.

Pregunta (responde en un minuto):
1. ¿Cuándo corres `cp .env.example .env.local` + `pnpm dev:up`?
   A) Hoy  B) Antes del 2026-10-14  C) Prefieres que agreguemos un paso de CI que levante el compose con secretos efímeros
   Recomiendo: A o B; C como respaldo para el Sprint 2.
2. ¿Aplicas el ruleset de `main` (13 pasos en `docs/runbooks/ci.md`)?
   A) Hoy  B) Antes de la demo
   Recomiendo: A.

## Archivo de "Últimos cambios" (movido desde STATUS.md)

Según la skill `status-update`, STATUS.md conserva 10 líneas; lo anterior queda aquí.

- 2026-10-08 · — · Cesar respondió pagos, datos del comprador, aviso, moderación y gasto en IA; retención propuesta en ADR-0010
- 2026-10-08 · VIT-113 · Catálogo de Kanuwiñ confirmado: vende directo, precios PVP definitivos, fichas correctas; el contacto de ventas del PDF no se publica
- 2026-10-08 · ADR-0010 · Cesar aprobó la retención: pedido 6 años, contacto del comprador 24 meses
- 2026-10-08 · — · Cesar dijo "Mergea": 9 PRs en main; #55 reemplazado por #66 para que el CI corriera completo
- 2026-10-08 · VIT-111 · Cesar eligió Instantánea (ronda 2, camino 3) como marca provisoria; tokens en PR #65
- 2026-10-08 · VIT-113 · Primera tienda real: semillas para aves exóticas
- 2026-10-07 · VIT-105 · Primera corrida de CI en verde (11 jobs); Security pide job de integración, regla set_config estricta y chequeo de WITH CHECK
- 2026-10-07 · VIT-107/109 · RLS aprobado por Security tras 40+ ataques; arnés genérico de cruce con 8 mutaciones detectadas
- 2026-10-08 · VIT-111 · Cesar descartó la ronda 2; ronda 3 espera su pista
- 2026-10-08 · VIT-105 · Security pidió 2 cambios más en el CI; mejoras menores en VIT-160 a VIT-163
- 2026-10-07 · VIT-111 · Cesar descartó las marcas A y B; ronda 2 con tres caminos nuevos
- 2026-10-07 · — · Seguimientos de los reviews creados: #43, #44, #48–#52, #54, #57–#59
- 2026-10-07 · VIT-108 · Threat model de tenancy listo; brechas G1–G9 agregadas a VIT-103/104/105/107/109
- 2026-10-07 · VIT-101 · Review aprobado; TypeScript fijado en 6.0.3 por compatibilidad con dependency-cruiser
- 2026-10-07 · — · Cesar aprobó el plan del Sprint 1 y los ADR 0001–0004 y 0007 (0002 Aceptado; 0001, 0003, 0004 y 0007 esperan la revisión de Security). Preset 1 parte con rubro ropa.
- 2026-10-07 · VIT-101..116 · Creados los 16 issues del Sprint 1 con Definition of Ready, labels de rol, prioridad y riesgo, y milestone "Sprint 1"
- 2026-10-07 · VIT-117..130 · Creado backlog desde los riesgos altos del pre-mortem
- 2026-10-07 · ADR-0001..0007 · Propuestos los ADRs iniciales (Architect)
- 2026-10-07 · — · Pre-mortem del inicio de la POC (Architect + Security)
- 2026-10-09 · — · Cesar aprobó las recomendaciones de R3, proxy.ts en Sprint 2, ADR-0009 completo y desvíos de ADR-0004
- 2026-10-09 · — · Mantenedor de tiendas para administradores anotado en PENDIENTES como desarrollo futuro
