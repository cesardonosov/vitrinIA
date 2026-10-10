# Sprint 1 — Fundaciones y marca

- Fechas propuestas: jueves 2026-10-08 → miércoles 2026-10-14 (milestone "Sprint 1")
- Estado: **Cerrado el 2026-10-10 (16/16).** Plan aprobado por Cesar (2026-10-07). El cierre está al final de este documento.
- Objetivo (VITRINIA.md §3.5): repo, CI completo, Clean Architecture, Postgres + RLS, Store Config v1, Docker, Storybook, marca y preset 1.
- Demo de cierre: el proyecto levanta con un comando y pasa todas las barreras de CI.

## Plan

### Objetivos del sprint
1. **Levanta con un comando:** `docker compose up` deja Postgres, Mailpit, app y worker sanos, con `app_user` sin BYPASSRLS.
2. **Nada roto llega a `main`:** CI con typecheck, lint, capas, tests, gitleaks, Semgrep, commitlint y TODOs; `main` protegida.
3. **Base segura y con marca:** RLS con test de cruce en CI, Store Config v1 cerrado, marca VitrinIA con tokens y preset 1.

### Capacidad
16 issues: architect 4, devops 3, builder 3, designer 3, security 2, qa 1. Reviewer revisa todos los PRs; Security revisa los 7 en zona sensible (cuello de botella previsto).

No hay velocidad previa (es el primer sprint): el plan de recorte está pensado para sacar hasta 3 issues sin tocar la demo.

### Issues (orden de la ruta crítica)

| VIT | Issue | Rol | Prio | Riesgo | Depende de |
|---|---|---|---|---|---|
| [101](https://github.com/cesardonosov/vitrinia/issues/1) | Inicializar la app Next.js con pnpm y TS strict | builder | P0 | 🟡 | ADR-0001 |
| [108](https://github.com/cesardonosov/vitrinia/issues/8) | Threat model de tenancy y RLS + SECURITY.md | security | P0 | 🟠 | ADR-0003 |
| [102](https://github.com/cesardonosov/vitrinia/issues/2) | Shared kernel: Money, StoreId, Result | architect | P0 | 🟡 | 101 |
| [103](https://github.com/cesardonosov/vitrinia/issues/3) | Reglas de capas con dependency-cruiser | architect | P0 | 🟡 | 101 |
| [106](https://github.com/cesardonosov/vitrinia/issues/6) | Secretos con dotenvx y env con Zod | devops | P0 | 🟠 | 101 |
| [104](https://github.com/cesardonosov/vitrinia/issues/4) | Entorno local con docker-compose | devops | P0 | 🟠 | 101, ADR-0003 |
| [107](https://github.com/cesardonosov/vitrinia/issues/7) | Esquema base multi-tenant con RLS | builder | P0 | 🔴 | 102, 104, 108 |
| [110](https://github.com/cesardonosov/vitrinia/issues/10) | Store Config v1 con Zod y versionado | architect | P0 | 🟡 | 102, ADR-0004 |
| [105](https://github.com/cesardonosov/vitrinia/issues/5) | Pipeline de CI con todas las barreras | devops | P0 | 🟠 | 101, 103, 106 |
| [109](https://github.com/cesardonosov/vitrinia/issues/9) | Harness de tests de cruce entre tiendas | security | P0 | 🔴 | 105, 107, 108 |
| [114](https://github.com/cesardonosov/vitrinia/issues/14) | Verificar la demo en máquina limpia | qa | P1 | 🟡 | 104, 105 |
| [111](https://github.com/cesardonosov/vitrinia/issues/11) | Marca VitrinIA | designer | P1 | 🟢 | — |
| [112](https://github.com/cesardonosov/vitrinia/issues/12) | Design tokens + Tailwind + Storybook | designer | P1 | 🟢 | 101, 111 |
| [116](https://github.com/cesardonosov/vitrinia/issues/16) | ADR para ampliar deny de settings.json | architect | P1 | 🟠 | — |
| [113](https://github.com/cesardonosov/vitrinia/issues/13) | Preset 1 de vitrina | designer | P2 | 🟢 | 110, 112, rubro |
| [115](https://github.com/cesardonosov/vitrinia/issues/15) | Headers de seguridad y CSP report-only | builder | P2 | 🟡 | 101, 108 |

Ruta crítica: ADR-0001/0003 aprobados → 101 → 102 + 104 + 106 → 107 (con 108 listo) → 105 → 109 → 114.

### Riesgos del sprint
- Security es cuello de botella (7 issues en zona sensible) → threat model (108) primero, el día 1.
- 101 bloquea casi todo → builder parte por 101 apenas Cesar apruebe ADR-0001.
- RLS mal aplicada por el pool (T1) → helper único `withStoreTx` y test con pool de 1 conexión en 107.
- Storybook incompatible con la versión de Next → `@storybook/nextjs` y recortar Storybook antes que la demo.
- Rubro del preset 1 sin definir → por defecto "ropa" hasta que Cesar diga otro.

### Plan de recorte (en este orden)
1. VIT-113 Preset 1 (pasa al Sprint 2 junto con el preset 2).
2. VIT-115 Headers y CSP report-only (pasa al Sprint 2, donde se activa enforce).
3. Storybook de VIT-112 (los tokens se quedan).

### Fuera del sprint
Backlog creado desde el pre-mortem: VIT-117 a VIT-130, con sprint objetivo en cada issue. Pre-mortem: [`docs/pre-mortem-2026-10-08.md`](../pre-mortem-2026-10-08.md).

## Tablero en GitHub Projects

No se pudo crear desde la sesión de Claude: GitHub Projects solo se administra con la API GraphQL y permisos de usuario, que esta sesión no tiene. Labels, milestone e issues sí están creados. Para crear el tablero (2 minutos, desde un computador con `gh`):

```bash
gh auth refresh -s project
gh project create --owner cesardonosov --title "VitrinIA"      # anota el número N que devuelve
gh project link N --owner cesardonosov --repo cesardonosov/vitrinia
for i in $(seq 1 30); do gh project item-add N --owner cesardonosov --url https://github.com/cesardonosov/vitrinia/issues/$i; done
```

O desde la web: Projects → New project → Board → agregar los issues con el filtro `repo:cesardonosov/vitrinia milestone:"Sprint 1"`. Columnas sugeridas: Ready, In Progress, In Review, Done.

---

## Cierre del Sprint 1

Estado: **cerrado el 2026-10-10** (16/16 issues). Cifras verificadas con `gh api` el 2026-10-10. El plan está más arriba en este mismo documento. El milestone "Sprint 1" lo cierra Cesar.

Fechas: 2026-10-08 a 2026-10-14 (cerrado antes de plazo).

### Resultado

Objetivo: **cumplido** — el proyecto levanta con un comando y pasa todas las barreras de CI (CI verde en `main`; `compose up --build --wait` verificado desde cero).

Issues: **16 cerrados de 16.** Cerrados el 2026-10-10: VIT-102 (#38, `4cdf4a1`), VIT-108 (#39, `d79c4e0`), VIT-113 (tal como está) y VIT-114 (criterio 1 verificado en el contenedor de QA sobre `c3f150d`; evidencia en el comentario de #14). Movidos al Sprint 2 con motivo:

- Story y capturas a 375 px del preset `aves` (parte de VIT-113): necesitan los componentes de vitrina. Issue #77.
- README: solución de problemas con un volumen `pgdata` viejo (S3): #78.

Seguimientos de review que viven en el milestone y no cuentan en las 16: #43, #44, #54, #60–#64, #68 (todos abiertos) y VIT-174 (#74, ADR-0003: las particiones no heredan RLS, Architect). Ninguno bloquea la demo; el Orchestrator los reparte al planificar el Sprint 2.

Mergeado hoy 2026-10-09: #69, #70, #71, #72 (ADR-0009, deny de secretos) y #73 (dominio `vitrinia.cl`).

### DoD por issue

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
| VIT-114 Verificar la demo | OK. Criterio 1: `compose up --build --wait` desde cero en 3 min 22 s sobre `c3f150d`, 4 servicios `healthy`, app responde 200, `migrate` sale con 0 en volumen limpio, 2 tablas con FORCE RLS, 3 roles sin superuser ni bypassrls (comentario de #14). Criterio 2: CI verde y reproducido en local (`docs/qa/sprint-01-demo.md`, #75). Criterio 3: bugs listados y seguimientos creados (#78) | D6 (acción de Cesar) y D9 (VIT-135) siguen abiertos |
| VIT-115 Headers y CSP | OK. #42, modo report-only | Enforce en Sprint 2 |
| VIT-116 Deny de secretos | OK. ADR-0009 aprobado y aplicado (#72) | Matriz §5 de Security (ver VIT-106) |

Ningún issue se da por cerrado sin review y CI; Los 16 issues están cerrados con review y CI.

### Guion de demo

Máx. 8 pasos, en viewport móvil donde aplique. Datos de prueba solamente (catálogo semilla de Kanuwiñ, ya publicado por Cesar; sin datos de compradores). Pasos 2 y 4–7 los ejecutó QA en un contenedor.

1. Mostrar `main` en GitHub: 12 checks en verde y la lista de PRs mezclados. Esperado: todos `success`. Plan B: captura de `check-runs` de `7e79040`.
2. Clonar y `pnpm install --frozen-lockfile`. Esperado: termina sin errores (aviso "Ignored build scripts" es intencional). Plan B: caché de pnpm.
3. `cp .env.example .env.local` y completar los 4 secretos (paso humano, ADR-0009; no se muestran en pantalla). Esperado: archivo listo.
4. `docker compose up --build --wait` (equivalente de `pnpm dev:up`). Esperado: Postgres, Mailpit, app y worker `healthy` en menos de 10 min; `http://localhost:3000` responde. **Resultado real (QA, `c3f150d`, desde cero): 3 min 22 s, 4 servicios `healthy`, app 200, `migrate` con código 0, 2 tablas con FORCE RLS.** Plan B: `docker compose up -d --wait postgres mailpit` y `pnpm dev` para la app.
5. `pnpm test:integration` y `pnpm test:tenant-isolation`. Esperado: 75/75 y 23/23. Plan B: mostrar el job `integration` del CI.
6. `pnpm test:tenant-isolation:mutations`. Esperado: "all 8 checks ok" (las 8 mutaciones se detectan). Plan B: log del CI.
7. Consulta de roles del runbook. Esperado: `app_user`, `migrator`, `host_resolver` con `rolsuper=f` y `rolbypassrls=f`. Plan B: salida guardada del runbook.
8. Abrir Mailpit (`:8025`) y el catálogo semilla `aves` en el celular. Esperado: Mailpit responde 200; el catálogo se ve en 375 px (hoy solo como datos, la vitrina llega en el Sprint 2). Plan B: mostrar el JSON del preset.

Ensayo: pasos 2 y 4–7 ejecutados por QA. El paso 8 en el celular (375 px) y el paso 3 (secretos reales de Cesar) no se ensayaron; Cesar los verá en la demo.

### Retro

- Funcionó: CI con 12 barreras y arnés de cruce de tiendas desde el día 1; atacar RLS con 40+ pruebas antes de mezclar.
- No funcionó: el criterio "un comando" exige pasos humanos (`.env.local`) y tardó en verificarse en una máquina limpia; `main` sigue sin protección de rama; los PRs de zona sensible esperaron a Security.
- Cambiamos: la demo se ensaya con el README en mano antes del cierre y la protección de `main` es lo primero del Sprint 2 (acción de Cesar).

### Deuda

TODO(VIT-xxx): **2** (conteo de `pnpm todo-check`/CI; sprint anterior: ninguno, es el primer sprint) — sin tendencia aún.
Son `TODO(VIT-126)` en `src/infra/db/client.ts` (pino en lugar de `console.error`) y `TODO(VIT-140)` en `docker-compose.yml` (healthcheck `/api/health`). Ambos apuntan a issues abiertos (#26 y #40), sin TODO huérfanos. El grep de la skill (`src worker tests`) cuenta solo 1 porque no cubre `docker-compose.yml`; se usa el conteo del CI.

Bugs de QA sin resolver: D6 (`main` sin protección, acción de Cesar) y D9 (aviso `middleware` → `proxy`, ya cubierto por VIT-135 / #35, Sprint 2). D1–D5, D7 y D8 se corrigieron en #75; D10 queda por documentar.

### Próximo sprint

Sugerido: Sprint 2 — primera vitrina real (componentes de vitrina, `order_contacts`, pagos múltiples, VIT-135 proxy, enforce de CSP) más las deudas de seguridad VIT-174 y los seguimientos #43/#44/#54/#60–#64/#68. Incluye #77 (story y capturas de `aves`) y #78 (README, volumen viejo). Se propone al cerrar este Sprint, no antes.

### Resumen para Cesar

**Sprint 1: cumplido, 16 de 16 issues cerrados.**

- Visible: `compose up --build --wait` levanta los 4 servicios en 3 min 22 s; CI con 12 checks en verde; RLS probada con 75 tests de integración y 8 ataques detectados.
- Riesgo principal: `main` no tiene protección de rama (D6) hasta que apliques el ruleset.
- TODO: 2 (primer sprint, sin tendencia).
- Demo: cuando quieras, antes del cierre del 2026-10-14.

Pregunta (responde en un minuto):
1. ¿Aplicas el ruleset de `main` (13 pasos en `docs/runbooks/ci.md`) y cerramos el milestone?
   A) Hoy  B) Antes de la demo
   Recomiendo: A.

### Archivo de "Últimos cambios" (movido desde STATUS.md)

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

- 2026-10-09 · — · Cesar pausó el trabajo durante el día
- 2026-10-09 · — · Cesar dijo "ok merge": #69 (decisiones de datos) y #70 (preset aves y catálogo Kanuwiñ) en main
