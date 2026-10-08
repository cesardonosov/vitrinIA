# Aislamiento de tiendas: arnés de cruce (capa BD)

Zona sensible (RLS/tenancy). Dueño: Security. Fuente: VIT-109, threat model `docs/security/threat-models/tenancy.md` (C2, C5, C6, C7, G1, G2, G3), VITRINIA.md §8.1 (tercera capa del triple aislamiento).

Principio: **un usuario de la tienda A nunca accede a la tienda B**. Este arnés es la evidencia automática de que la base de datos lo cumple para **toda** tabla con datos por tienda, hoy y en cada tabla futura.

## Qué hay

| Ruta | Qué es |
|---|---|
| `tests/integration/tenant-isolation/db.test.ts` | Suite generada desde el catálogo: los mismos tests para cada tabla de tienda |
| `tests/integration/tenant-isolation/catalog.ts` | Enumeración en `pg_catalog` (como `migrator`): tablas con `store_id` + `public.stores`, `relkind IN ('r','p')`, particiones vía `pg_inherits`, políticas, grants de `app_user`, columnas y FKs |
| `tests/integration/tenant-isolation/seeders.ts` | Siembra por tabla como `app_user` dentro de `withStoreTx`; registro explícito (`stores`, `domains`) + seed genérico para tablas simples |
| `tests/integration/tenant-isolation/mutation-check.ts` | Prueba de mutación: rompe el aislamiento a propósito y exige que la suite falle nombrando la tabla; revierte siempre |
| `tests/integration/tenancy.test.ts` | Suite del Builder (VIT-107): pool, `resolve_host`, roles, formato de ids. Complementaria, no duplicada |

Comandos (`package.json`):

```bash
pnpm test:tenant-isolation            # la suite
pnpm test:tenant-isolation:mutations  # prueba de mutación (corre la suite 8 veces)
```

## Cómo correrlo en local

Siempre contra la Postgres de test aislada (`docker-compose.test.yml`, puerto 55432, datos en tmpfs), nunca la de desarrollo. Los helpers leen solo `TEST_*`, rechazan hosts no locales y rechazan una URL igual a `DATABASE_URL`.

```bash
export POSTGRES_ADMIN_PASSWORD=$(openssl rand -hex 16) MIGRATOR_PASSWORD=$(openssl rand -hex 16) APP_USER_PASSWORD=$(openssl rand -hex 16)
export TEST_MIGRATOR_DATABASE_URL=postgres://migrator:$MIGRATOR_PASSWORD@127.0.0.1:55432/vitrinia
export TEST_DATABASE_URL=postgres://app_user:$APP_USER_PASSWORD@127.0.0.1:55432/vitrinia
pnpm test:db:up && pnpm db:migrate:test
pnpm test:tenant-isolation
pnpm test:tenant-isolation:mutations
pnpm test:db:down
```

## Qué prueba, por cada tabla de tienda

Dos tiendas A y B se siembran antes de cada test con datos equivalentes (1 fila en `stores`, 2 en cada otra tabla), **como `app_user` dentro de `withStoreTx`** (nunca como dueño: un seed que la política rechaza falla aquí). Cada test de cruce afirma `current_user = 'app_user'` y `is_superuser = off` dentro de la transacción (G2) y el conteo propio esperado (> 0), de modo que la suite no puede pasar con la base vacía ni con el rol equivocado.

| # | Caso | Contexto | Esperado | Criterio |
|---|---|---|---|---|
| S1 | `relrowsecurity` y `relforcerowsecurity` | catálogo | ambos `true` | AC2, C2, C6 |
| S2 | Dueño de la tabla | catálogo | no es `app_user` | C1 |
| S3 | Toda política permisiva alcanzable por `app_user` (o `PUBLIC`) | catálogo | `USING` y `WITH CHECK` **exactamente** `store_id = NULLIF(current_setting('app.store_id', true), '')::uuid` (`id` en `stores`); sin `OR`, sin `IS NULL`, sin `true` | C2 |
| S4 | Cada privilegio que `app_user` tiene (`SELECT/INSERT/UPDATE/DELETE`) | catálogo | cubierto por una política | C2 |
| S5 | Partición | catálogo | su padre está en el catálogo; si `app_user` tiene acceso directo, tiene política propia | G3 |
| D1 | `SELECT`, `count(*)`, `count(distinct store_id)` | A y B | solo filas propias, conteo propio = sembrado, 0 filas de la otra | AC1, C5 |
| D2 | `SELECT` | sin contexto | 0 filas (fail-closed) | C2 |
| D3 | `UPDATE ... WHERE store_id = B` y `UPDATE` sin `WHERE` | A | 0 filas / solo filas propias; B intacta | AC1, C5 |
| D4 | `DELETE ... WHERE store_id = B` | A | 0 filas; B intacta (o `permission denied` si no hay grant, p. ej. `stores`) | AC1, C5 |
| D5 | `INSERT` de una fila con `store_id = B` | A | error `row-level security` (`WITH CHECK`); B intacta | G1 |
| D6 | `UPDATE` de una fila propia a `store_id = B` | A | error `row-level security`; A y B intactas | G1 |
| D7 | Tabla particionada: suma de conteos por partición = conteo del padre | A | igual | G3 |
| D8 | Partición sin grant directo | A | `permission denied` (solo se llega por el padre) | G3 |

Si `app_user` no tiene un privilegio sobre la tabla, el test correspondiente exige `permission denied` en vez de 0 filas (no se asume: se prueba).

## Cómo queda cubierta una tabla nueva

No se escribe ningún test. Al existir en el catálogo con columna `store_id` (o ser `public.stores`) la suite le genera S1–D8. Lo único que puede hacer falta es la siembra:

1. Tabla simple (columnas `NOT NULL` sin default de tipo uuid, text, número, boolean, timestamp, json): el seed genérico la llena solo.
2. Tabla con FK a otra tabla de tienda, enum o `CHECK` que el genérico no satisface: la suite **falla nombrando la tabla** con `UnseedableTableError`; se agrega una entrada en `seeders.ts` (una función de 3 líneas que inserta una fila para `storeId`). El seed corre como `app_user` dentro de `withStoreTx`, así que debe ser una inserción legítima.
3. Particiones: se llenan por el padre; no necesitan seeder.

Regla de `schema-change` / `db-migration`: la migración de la tabla nueva incluye `ENABLE` + `FORCE ROW LEVEL SECURITY`, la política exacta de S3 y el `GRANT` mínimo. Si falta cualquiera, esta suite y `infra/ci/rls-check.sh` (VIT-105) fallan nombrando la tabla.

## Prueba de mutación (AC4)

`pnpm test:tenant-isolation:mutations` aplica como `migrator` cada mutación, corre la suite, la revierte en `finally` y termina corriendo la suite limpia. Resultado del 2026-10-08:

| Mutación | Esperado | Resultado | La salida nombra |
|---|---|---|---|
| `DROP POLICY domains_tenant` | falla | OK | `public.domains` |
| `domains` con `NO FORCE ROW LEVEL SECURITY` | falla | OK | `public.domains`, `FORCE ROW LEVEL SECURITY missing` |
| Política de `domains` reemplazada por `USING (true) WITH CHECK (true)`, corriendo **solo** los tests dinámicos | falla | OK (6 tests: D1, D2, D3, D4, D5, D6) | `public.domains` |
| Tabla nueva `public.notes` con `store_id` y sin RLS | falla | OK | `public.notes`, `ROW LEVEL SECURITY missing` |
| Tabla nueva `public.notes` bien protegida | pasa | OK: recibe los 10 tests sin código nuevo | `tenant table public.notes > ...` |
| Tabla particionada `public.events` + partición `events_2026` bien protegidas | pasa | OK: ambas enumeradas (`relkind p`, `pg_inherits`) | `public.events`, `public.events_2026` |
| Partición `events_2026` sin `FORCE` | falla | OK | `public.events_2026`, `FORCE ROW LEVEL SECURITY missing` |
| Suite limpia tras revertir | pasa | OK (23 tests) | — |

Mutación manual equivalente (lo que un revisor puede repetir en 1 minuto):

```bash
psql "$TEST_MIGRATOR_DATABASE_URL" -c "drop policy domains_tenant on domains;"
pnpm test:tenant-isolation   # debe fallar nombrando public.domains
psql "$TEST_MIGRATOR_DATABASE_URL" -c "create policy domains_tenant on domains for all to app_user
  using (store_id = NULLIF(current_setting('app.store_id', true), '')::uuid)
  with check (store_id = NULLIF(current_setting('app.store_id', true), '')::uuid);"
pnpm test:tenant-isolation   # vuelve a pasar
```

## CI (AC3)

El job `integration` de `.github/workflows/ci.yml` (archivo protegido: lo edita DevOps, Security lo revisa) ya existe en este PR. Corre en cada PR contra el Postgres **efímero** del runner (service `postgres:16.15-alpine`), nunca contra una base compartida, con los roles creados por `infra/docker/postgres/init/roles.psql` y las migraciones aplicadas como `migrator`. Después de `pnpm test:integration` ejecuta los dos pasos del arnés (DevOps está quitando los `hashFiles` que hoy los condicionan, por eso se muestran sin ellos):

```yaml
- name: Cross-tenant harness (VIT-109)
  env:
    TEST_DATABASE_URL: postgresql://app_user:${{ env.APP_PW }}@127.0.0.1:5432/vitrinia
    TEST_MIGRATOR_DATABASE_URL: ${{ env.MIGRATOR_URL }}
  run: pnpm test:tenant-isolation
- name: Cross-tenant harness can fail (mutation check)
  env:
    TEST_DATABASE_URL: postgresql://app_user:${{ env.APP_PW }}@127.0.0.1:5432/vitrinia
    TEST_MIGRATOR_DATABASE_URL: ${{ env.MIGRATOR_URL }}
  run: pnpm test:tenant-isolation:mutations
```

`APP_PW` se exporta a `GITHUB_ENV` junto a `MIGRATOR_URL` en el paso que crea los roles; ambos se enmascaran con `::add-mask::`. Las credenciales de administrador viven solo en ese paso.

## Fuera de alcance y pendientes

- Cruce a nivel caso de uso, endpoint, MCP y caché host→tienda: VIT-120 (Sprint 2). La matriz de esas capas se agrega a este documento cuando existan.
- Roles con `BYPASSRLS`/`SUPERUSER`: el arnés ya lo afirma directamente. `assertAppUser` consulta `pg_roles` para `current_user` en la misma conexión/transacción de cada chequeo y exige `{ u: "app_user", rolsuper: false, rolbypassrls: false }`; si alguien hace `ALTER ROLE app_user BYPASSRLS`, la suite falla con un mensaje explícito. `infra/ci/rls-check.sh` (VIT-105 AC6) y `tenancy.test.ts` lo siguen verificando por separado.
- `app_user` puede reclamar hosts reservados (`app`, `www`, ...) en `domains` (hallazgo del security-review de VIT-107, issue #50): es regla de caso de uso (VIT-121), no de RLS, y VIT-109 no la pide; no se incluye aquí como `it.fails`.
