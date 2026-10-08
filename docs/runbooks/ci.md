# Runbook: CI (GitHub Actions)

Zona sensible. `.github/workflows/*` es archivo protegido: solo DevOps lo edita y Security lo revisa (AGENTS.md §5). Fuente: issue VIT-105, skill `ci-pipeline`, threat model de tenancy (C1, C3, C6, C11, C15) y pre-mortem de Security (controles 3, 6, 8).

## Qué corre y en qué orden

`.github/workflows/ci.yml` corre en cada `pull_request` y en `push` a `main`. Cada job depende (`needs`) del anterior: falla rápido y barato primero. Los nombres de job son los checks requeridos de `main`; **no renombrar un job sin actualizar la protección de rama**, o el merge queda bloqueado.

| # | Job | Qué protege | Cómo reproducirlo local |
|---|---|---|---|
| 1 | `install` | Lockfile consistente; scripts de instalación bloqueados | `pnpm install --frozen-lockfile` |
| 2 | `typecheck` | Tipos strict | `pnpm typecheck` |
| 3 | `lint` | Estilo y errores (Biome) | `pnpm biome ci .` |
| 4 | `commitlint` | Commits semánticos | `pnpm commitlint --from origin/main --to HEAD` |
| 5 | `architecture` | Reglas de capas (VIT-103) | `pnpm arch` |
| 6 | `todo-check` | Solo `TODO(VIT-xxx)` con issue abierto; migraciones aplicadas inmutables (A18/C15) | `pnpm todo-check` (solo formato) · `GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=cesardonosov/vitrinia bash infra/ci/check-todos.sh` · `bash infra/ci/test-check-todos.sh` |
| 7 | `gitleaks` | Secretos en el historial del PR | `gitleaks detect --redact` |
| 8 | `semgrep` | Reglas propias de tenancy y XSS + `p/typescript` + `p/owasp-top-ten` | `pnpm semgrep:test` · `semgrep scan --error --severity ERROR --config .semgrep/rules .` |
| 9 | `unit` | Tests y cobertura ≥ 90 % (umbral en `vitest.config.mts`) | `pnpm test:coverage` |
| 10 | `rls-check` | RLS y roles en un Postgres efímero (service) | ver abajo |
| 11 | `build` | `pnpm build` y `docker build --target app` / `worker` (sin push) | `pnpm build && docker build --target app .` |

Pendientes de agregar cuando existan sus insumos: `integration` (arnés de cruce de tiendas, VIT-109), `e2e` (Playwright) y `perf-budget`.

`.github/workflows/todo-huerfanos.yml` corre los lunes 12:00 UTC (y a mano): si hay TODOs con issue cerrado o inexistente, abre o actualiza el issue `chore: TODOs huérfanos`.

### Reglas propias de Semgrep (`.semgrep/rules/vitrinia.yml`)

Todas son `ERROR` y bloquean. Cada una tiene fixture positivo y negativo en `.semgrep/rules/vitrinia.ts(x)`; el job corre `semgrep --test` antes del escaneo.

- `SET app.store_id` sin `LOCAL` (también `SET SESSION`).
- `set_config(..., false)`.
- `sql.raw` con argumento no literal o con plantilla interpolada.
- `dangerouslySetInnerHTML`, `innerHTML=`, `outerHTML=`. Excepción única: el serializador JSON-LD aprobado en `src/shared/seo/json-ld.tsx` (cualquier cambio ahí lo revisa Security).
- `eval`, `new Function`, `Function(...)`.
- G8 (middleware nunca autoriza): leer con `.get("x-vitrinia-*" | "x-store-*" | "x-tenant-*" | "x-user-*" | "x-middleware-*" | "x-forwarded-host")` en `src/**` salvo `src/middleware.ts`. **Convención:** todo header que el middleware escriba para código posterior lleva el prefijo `x-vitrinia-`. Si Builder necesita otro nombre, se agrega al regex de la regla (pasa por Security).

`.semgrepignore` excluye `.semgrep/` porque los fixtures contienen violaciones a propósito.

### Chequeo de RLS y roles (`rls-check`)

`infra/ci/check-rls.sql` falla nombrando al culpable si:

- falta `app_user`, `migrator` o `host_resolver` (para que el chequeo no pase en vacío), o `host_resolver` puede iniciar sesión o tiene `CREATEROLE`/`CREATEDB`;
- `app_user`, `migrator` o `host_resolver` tienen `rolsuper` o `rolbypassrls`;
- `app_user` tiene `CREATEROLE`/`CREATEDB`, es dueño de alguna relación o es miembro de `pg_read_all_data`, `pg_write_all_data` u otros roles de servidor;
- una tabla o partición (`relkind IN ('r','p')`) con columna `store_id`, o la tabla `stores`, no tiene `relrowsecurity` y `relforcerowsecurity`, o no tiene ninguna política.

`infra/ci/rls-check.sh` primero corre el chequeo real y después ocho autopruebas que deben fallar (tabla sin RLS, RLS sin FORCE, `bypassrls` en `app_user`, `migrator` y `host_resolver`, `host_resolver` con LOGIN, superusuario, `app_user` dueño de tabla). Hoy no hay tablas, así que el chequeo real pasa casi en vacío; las autopruebas demuestran que sabe fallar. Cuando exista `drizzle/migrations/`, el job aplica las migraciones como `migrator` con `pnpm db:migrate` (script que debe aportar VIT-107, lee `DATABASE_URL`).

Local, contra un Postgres desechable (nunca el de desarrollo):

```bash
docker run --rm -d --name pgci -e POSTGRES_PASSWORD=x -e POSTGRES_DB=vitrinia -p 127.0.0.1:55432:5432 postgres:16.15-alpine
psql postgresql://postgres:x@127.0.0.1:55432/vitrinia -v migrator_pw=a -v app_pw=b -f infra/docker/postgres/init/roles.psql
ADMIN_DATABASE_URL=postgresql://postgres:x@127.0.0.1:55432/vitrinia bash infra/ci/rls-check.sh
docker rm -f pgci
```

## Reglas del pipeline (no negociables)

- Actions fijadas por SHA de commit completo, con el tag en un comentario. Renovate las actualiza.
- `permissions: contents: read` a nivel de workflow; un job que necesite más lo declara solo para sí (`todo-check`: `issues: read`; `gitleaks`: `pull-requests: read`).
- Prohibido `pull_request_target`. Los checkouts usan `persist-credentials: false`.
- `pnpm install --frozen-lockfile`; Node desde `.nvmrc`, pnpm desde `packageManager`.
- Scripts de instalación bloqueados: `pnpm.onlyBuiltDependencies` en `package.json` está vacío. Para permitir uno, agregarlo ahí con justificación en el PR y review de Security.
- Datos de PR (SHA, refs) llegan a los scripts por variables de entorno, nunca interpolados en `run:`.

## Renovate

`renovate.json`: edad mínima de release de 7 días (14 para dependencias de runtime), sin automerge de ningún tipo, actions e imágenes Docker fijadas por digest, avisos de vulnerabilidad sin espera. Hay que instalar la app Renovate en el repo (paso de Cesar, abajo).

## Protección de la rama `main` (la configura Cesar)

Los agentes no llaman a la API de protección. Pasos en GitHub (`Settings` del repo `cesardonosov/vitrinia`):

1. Entrar a **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Nombre `main`; **Enforcement status: Active**.
3. **Target branches → Add target → Include default branch**.
4. Activar **Restrict deletions** y **Block force pushes**.
5. Activar **Require linear history**.
6. Activar **Require a pull request before merging**: marcar **Dismiss stale pull request approvals when new commits are pushed**. Aprobaciones requeridas: 1 si hay otra cuenta que pueda aprobar; si Cesar es la única cuenta, dejar 0 (el PR sigue siendo obligatorio y nadie empuja directo).
7. Activar **Require status checks to pass** y **Require branches to be up to date before merging**. En **Add checks** agregar exactamente (nombre del job): `install`, `typecheck`, `lint`, `commitlint`, `architecture`, `todo-check`, `gitleaks`, `semgrep`, `unit`, `rls-check`, `build`. Los checks aparecen en el buscador solo después de que corrieron una vez: abrir primero un PR con el pipeline.
8. **Bypass list: vacía** (sin bypass para admins).
9. **Create**.
10. Instalar Renovate: <https://github.com/apps/renovate> → Configure → repositorio `vitrinia`.
11. **Settings → Actions → General → Workflow permissions**: elegir **Read repository contents and packages permissions** y desmarcar **Allow GitHub Actions to create and approve pull requests**. En **Fork pull request workflows** dejar **Require approval for all outside collaborators**.
12. **Settings → Advanced Security**: activar **Secret scanning** y **Push protection** (gratis en repos públicos; en privados depende del plan).

Verificación (una vez): intentar `git push origin main` desde una copia local debe ser rechazado; abrir un PR con un `TODO` suelto debe dejar `todo-check` en rojo y el botón de merge bloqueado; revertir.

## Estado conocido

- `architecture` ejecuta `pnpm arch`, que define VIT-103 (rama `feat/VIT-103-dependency-cruiser`). Hasta que esa rama se mezcle el script no existe y el pipeline queda rojo desde ese job; como los jobs son encadenados, los siguientes (incluido `gitleaks`) se saltan en esos PRs.
- La regla de `dangerouslySetInnerHTML` supone que el serializador JSON-LD vivirá en `src/shared/seo/json-ld.tsx`; si Builder lo pone en otro lado, se ajusta la exclusión en `.semgrep/rules/vitrinia.yml`.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `commitlint` rojo | Reescribir el mensaje: `tipo(alcance): descripción` en inglés (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`). |
| `todo-check` rojo | Cambiar el marcador a `TODO(VIT-xxx)` con un issue abierto, o resolverlo. `FIXME` y `HACK` están prohibidos. |
| `gitleaks` rojo | Tratar el secreto como filtrado: rotarlo primero, después limpiar el historial. Falso positivo: `.gitleaksignore` con huella, review de Security. |
| `semgrep` rojo | Corregir el código. No existe `nosemgrep` aceptado sin aprobación de Security. |
| `rls-check` rojo | El mensaje nombra la tabla o el rol. Corregir la migración (nueva migración, nunca editar una aplicada). |
