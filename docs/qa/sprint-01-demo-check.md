# Verificación de la demo del Sprint 1 (VIT-114)

- Fecha: 2026-10-09. Commit verificado: `7e79040` (`origin/main`). Rol: QA.
- Demo a probar: "el proyecto levanta con un comando y pasa todas las barreras de CI".
- Método: worktree limpio desde `origin/main`, siguiendo `README.md` y `docs/runbooks/*` como un recién llegado. Solo se informa lo que se ejecutó.

## Veredicto

**Parcial: no se puede dar la demo por verificada.** Los gates de CI reproducibles localmente pasan, y Postgres + Mailpit levantan sanos con los roles correctos. El comando único (`pnpm dev:up`) **no se ejecutó**, porque exige `.env.local` (paso humano, ADR-0009), y el build de las imágenes `app`/`worker` **falló en este contenedor** por falta de acceso a npm dentro de `docker build`. Esa falla es del entorno y no se pudo atribuir al repo.

## Entorno de la prueba (importante para criterio 1)

| Ítem | Estado |
|---|---|
| Node 22.22.0, pnpm 10.28.0 | Presentes (preinstalados; no se usó `nvm`) |
| Docker CLI 29.8.2 + Compose v5.6.0 | Presentes |
| Docker daemon | **No estaba corriendo.** `docker info` dio "Cannot connect to the Docker daemon". Lo levanté a mano con `dockerd` en segundo plano (root, sin otra configuración) y funcionó |
| semgrep, gitleaks | No instalados. semgrep 1.180.0 (la versión de CI) se instaló en un venv aparte; **gitleaks no se pudo ejecutar** |
| Red dentro de `docker build` | **Sin salida a npm** (ver paso 9) |
| Contenedor | No es "limpio con solo Docker, Node y pnpm": venía con `psql`, `openssl`, imágenes `postgres:16.15-alpine` ya en caché y proxy de red. El tiempo de 10 min no es extrapolable |

## Pasos ejecutados

| # | Comando | Resultado |
|---|---|---|
| 1 | `git fetch origin main && git worktree add ... origin/main` | OK, HEAD `7e79040` |
| 2 | `pnpm install --frozen-lockfile` | OK en 2,7 s (caché de pnpm caliente). Aviso: "Ignored build scripts: core-js-pure, esbuild, lefthook" (esperado por `onlyBuiltDependencies` vacío, ver bug D4) |
| 3 | `pnpm typecheck` | OK (5,4 s) |
| 4 | `pnpm biome ci .` | OK, 175 archivos |
| 5 | `pnpm arch` | OK, 0 violaciones (54 módulos). `pnpm arch:fixtures` sale con código 32 **por diseño** (32 violaciones de fixtures), documentado en ARCHITECTURE.md |
| 6 | `pnpm todo-check` (modo offline) | OK, 2 TODOs válidos. Modo online contra GitHub no corrido |
| 7 | `pnpm commitlint --last` | OK (solo el último commit; el rango PR no aplica en `main`) |
| 8 | `pnpm test:coverage` | OK. Statements 100 %, Branches 98,74 %, Functions 100 %, Lines 100 % (umbral 90 %) |
| 9 | `pnpm build` (Next) | OK en 26 s. Rutas `/`, `/_not-found`, `/api/csp-report`. Aviso de Next: convención `middleware` deprecada a favor de `proxy` |
| 10 | `semgrep --test .semgrep/rules` y `scan --error --severity ERROR` con las reglas propias (semgrep 1.180.0 en venv) | OK: 7/7 fixtures, 0 hallazgos. **No** corrí `p/typescript` ni `p/owasp-top-ten` (requieren registry) |
| 11 | Postgres de test: `pnpm test:db:up`, `db:migrate:test`, `test:integration` (secretos aleatorios solo en variables de shell) | OK: 75/75 tests de integración; subida en 7,9 s |
| 12 | `pnpm test:tenant-isolation` y `:mutations` | OK: 23/23; mutation check "all 8 checks ok" |
| 13 | `bash infra/ci/rls-check.sh` contra esa BD | OK: autopruebas y chequeo real ("RLS check ok") |
| 14 | `docker compose up -d --build --wait` (variables en el shell, **sin `.env.local`**) | **FALLA** en `Dockerfile:7`, `corepack prepare pnpm@10.28.0`: error de red al pedir `registry.npmjs.org/pnpm/-/pnpm-10.28.0.tgz`. Reproducido con `docker build --target app`. Causa: el builder de Docker no usa el proxy de este contenedor. No se probó con proxy como build-arg. **Por lo tanto no se verificaron `app`, `worker` ni `migrate`** |
| 15 | `docker compose up -d --wait postgres mailpit` (variables en shell) | OK en 7,8 s, ambos `healthy`. Mailpit UI responde 200 en `:8025` |
| 16 | Consulta de roles del runbook | OK: `app_user`, `migrator`, `host_resolver` con `rolsuper=f`, `rolbypassrls=f`, `rolcreaterole=f`; `host_resolver` `rolcanlogin=f`; `app_user` dueño de 0 relaciones |
| 17 | `docker compose down` (sin `-v`) | OK. Quedó el volumen `pgdata` del contenedor efímero |

Paso humano no ejecutado: `cp .env.example .env.local` y completar secretos (ADR-0009). Nunca leí ni imprimí valores de `.env*`; los secretos de las pruebas 11-16 son aleatorios, generados en el shell, y no se guardaron.

## Criterios de aceptación

| # | Criterio | Estado |
|---|---|---|
| 1 | Contenedor limpio, seguir el README, todo levanta con un comando en < 10 min | **NO VERIFICABLE aquí.** `pnpm dev:up` requiere `.env.local` (humano) y `app`/`worker` no compilan en este contenedor por falta de npm en `docker build`. Evidencia parcial: instalación, gates y Postgres+Mailpit sí funcionan. Pendiente: correrlo en una máquina con internet directo (Cesar o runner de CI con paso `docker compose up`) |
| 2 | Último PR del sprint: checks requeridos en verde | **PASA en `main`**: los 12 checks (`install`, `typecheck`, `lint`, `commitlint`, `architecture`, `todo-check`, `gitleaks`, `semgrep`, `unit`, `rls-check`, `integration`, `build`) están en `success` en `7e79040` (consultado con `gh api .../check-runs`). Reproducí localmente todos menos `gitleaks` y los ruleset remotos de semgrep. **Atención:** la API devuelve `protected: false` y 0 reglas para `main`, es decir la protección de rama que documenta `ci.md` **no está activa** (o no es visible con este token). Sin eso "requeridos" no está garantizado (D6) |
| 3 | Fallos reportados como issue con `bug-report` y severidad | **PARCIAL.** Los bugs de abajo están listados con severidad; **no creé issues** (esta tarea pedía solo el reporte). Siguiente dueño: Orchestrator crea los issues |

## Bugs de documentación y hallazgos

| ID | Sev. | Dónde | Problema | Corrección sugerida |
|---|---|---|---|---|
| D1 | S2 | README "Cómo levantar" / "Entorno completo" | `pnpm dev:up` falla sin `.env.local`, pero el README dice "con un comando". El comando real son 3 pasos: copiar, generar 4 secretos a mano, levantar. La demo "un comando" es engañosa | Documentar el flujo en 3 pasos o un script de bootstrap que genere secretos (con aprobación de Security, ADR-0009) |
| D2 | S2 | README y runbook "Requisitos" | No mencionan que debe estar corriendo el **daemon** de Docker, ni acceso a internet para el `build` (corepack baja pnpm; `pnpm install` en el build). El runbook solo lo dice para `migrate`. En este contenedor el build falló por eso | Añadir requisito de red del build y cómo pasar proxy; considerar fijar pnpm en la imagen vía caché o `npm i -g pnpm@10.28.0` |
| D3 | S3 | README "Requisitos" | Docker/Compose no figura en Requisitos (solo en la sección Docker). `nvm use` se asume instalado; en un contenedor limpio no está | Listar Docker + Compose v2 y nota para quien no use nvm |
| D4 | S4 | README | `pnpm install` imprime un aviso "Ignored build scripts" que asusta a un novato; no se explica que es intencional (CI.md sí lo explica) | Una línea en README |
| D5 | S4 | `docs/runbooks/ci.md` "Estado conocido" | Dice que `pnpm arch` no existe hasta mezclar VIT-103. Ya existe y pasa. Obsoleto | Borrar o actualizar el bloque |
| D6 | S2 | `ci.md` "Protección de la rama `main`" | Paso humano pendiente: `main` aparece sin protección (`protected:false`, sin rulesets). El objetivo del sprint "main protegida" no se cumple al día de hoy | Cesar configura el ruleset (11 pasos del runbook) o confirma que es no visible por permisos |
| D7 | S4 | README "Scripts" | La tabla omite `test`, `test:coverage`, `arch`, `todo-check`, `semgrep:test`, `test:integration`, `test:tenant-isolation`, `db:*`. Un novato no sabe cómo reproducir los 12 checks (están solo en `ci.md`) | Enlazar a la tabla de `ci.md` |
| D8 | S4 | Issue VIT-114 vs tarea | El issue pide actualizar `docs/qa/sprint-01-demo.md`; este reporte está en `docs/qa/sprint-01-demo-check.md` | Alinear nombre en el issue |
| D9 | S4 | `pnpm build` | Aviso de Next: archivo `middleware` deprecado en favor de `proxy`. No bloquea | Issue de Builder para Sprint 2 |
| D10 | S3 | `ci.md` / local | Reproducir `gitleaks` y `semgrep` localmente requiere instalar herramientas no listadas en Requisitos. gitleaks **no verificado** por mí | Documentar instalación (versión fijada) |

Ninguna S1: no hay nada que impida usar el repo con los pasos documentados salvo el entorno de red de este contenedor.

## Lo que falta para cerrar VIT-114

1. Ejecutar `cp .env.example .env.local`, completar secretos y `pnpm dev:up` en una máquina con internet directo; medir tiempo y confirmar los 4 servicios `healthy` y `http://localhost:3000`. Alternativa: agregar un paso de CI que levante el compose con secretos efímeros.
2. Proteger `main` (D6).
3. Correr `gitleaks detect --redact` donde esté instalado.

## HANDOFF
