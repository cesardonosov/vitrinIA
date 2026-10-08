# Sprint 1 — Fundaciones y marca

- Fechas propuestas: jueves 2026-10-08 → miércoles 2026-10-14 (milestone "Sprint 1")
- Estado: **Plan aprobado por Cesar (2026-10-07).** En ejecución.
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
