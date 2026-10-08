# Módulo store-config (base de tenancy)

Estado: Sprint 1 (VIT-107). Contiene por ahora solo las tablas raíz de tenancy `stores` y `domains`; el Store Config validado con Zod (ADR-0004) llega con VIT-110. Contrato de seguridad: [`docs/security/threat-models/tenancy.md`](../../security/threat-models/tenancy.md) §5 (C1 a C15) y ADR-0003.

## Archivos

| Ruta | Qué es |
|---|---|
| `src/modules/store-config/infrastructure/schema.ts` | Tablas Drizzle `stores` y `domains` (columnas, checks, únicos) |
| `drizzle/migrations/0000_tenancy_base.sql` | Migración: tablas generadas + sección escrita a mano (RLS, grants, `resolve_host`) |
| `drizzle/rollbacks/0000_tenancy_base.down.sql` | Rollback (destruye datos: en producción, backup + migración correctiva) |
| `src/infra/db/client.ts` | `createDatabase()`: pool `pg` + Drizzle. Solo con la URL de `app_user` |
| `src/infra/db/with-store-tx.ts` | `withStoreTx(storeId, fn)`: **la única puerta** a tablas de tienda |
| `src/infra/uuid-v7.ts` | `uuidv7()`: generador de ids (el kernel solo valida) |
| `drizzle.config.ts` | Config de drizzle-kit (corre como `migrator`) |
| `tests/integration/tenancy.test.ts` | 51 tests contra Postgres de test, conectados como `app_user` |

## Roles (creados por `infra/docker/postgres/init`)

| Rol | Login | Rol en tenancy |
|---|---|---|
| `migrator` | sí | Dueño de tablas y de `public`; solo lo usa el servicio `migrate`. Sin `BYPASSRLS`/`SUPERUSER`. Es miembro de `host_resolver` solo para poder asignarle la función |
| `app_user` | sí | `app` y `worker`. Sin `BYPASSRLS`, no es dueño de nada. `SELECT/INSERT/UPDATE` en `stores`; `SELECT/INSERT/UPDATE/DELETE` en `domains`; `EXECUTE` en `resolve_host` |
| `host_resolver` | no | Dueño de `resolve_host`. `SELECT (host, store_id, verified_at)` sobre `domains` y política propia `verified_at IS NOT NULL` |

## Cómo se aísla (capa 1, la base de datos)

- `ENABLE` + `FORCE ROW LEVEL SECURITY` en ambas tablas; política `FOR ALL TO app_user` con `USING` y `WITH CHECK` idénticos: `store_id = NULLIF(current_setting('app.store_id', true), '')::uuid` (en `stores` compara `id`).
- Sin contexto: `NULLIF` da `NULL`, la comparación nunca es verdadera, 0 filas (falla cerrado). Con un valor que no es UUID, el cast lanza error: nunca devuelve filas. No hay escape `OR ... IS NULL`.
- `withStoreTx` abre una transacción y ejecuta `select set_config('app.store_id', $1, true)`. El `true` lo hace local a la transacción: `COMMIT` y `ROLLBACK` lo descartan, y el pool no puede entregar la conexión con la tienda anterior. Revalida el `StoreId` con el kernel en tiempo de ejecución y lanza `InvalidStoreContextError` (sin eco del valor) si no es un UUID v7.
- Prohibido fuera del helper: `SET app.store_id`, `set_config(..., false)`, usar el cliente directamente sobre tablas de tienda (reglas Semgrep VIT-105 y dependency-cruiser VIT-103).
- Para crear una tienda nueva el caso de uso llama `withStoreTx(nuevoId, ...)` y inserta `stores` y `domains` dentro: el `WITH CHECK` exige que el contexto coincida con el `id` insertado.

## `resolve_host(host text) returns uuid`

Resuelve host → `StoreId` antes de conocer la tienda (sin contexto). `SECURITY DEFINER`, `STABLE`, `SET search_path = pg_catalog, public`, dueño `host_resolver`, `EXECUTE` revocado de `PUBLIC` y concedido solo a `app_user`. Normaliza (minúsculas, sin puerto, sin punto final, máx. 253, sin comodines). Valida una lista blanca ASCII **antes** de `lower()` porque algunos caracteres Unicode (signo Kelvin) pasan a letras ASCII y suplantarían otro host. Host desconocido, no verificado o mal formado: `NULL` (indistinguibles; la vitrina responde el mismo 404). Devuelve solo el `store_id`. La columna `released_at` (tombstone, VIT-121) existe pero **todavía no tiene lógica** y la función no la consulta.

## Convenciones aplicadas

UUID v7 generado por la app (sin `DEFAULT`; un `CHECK` rechaza otras versiones), `timestamptz`, `version integer not null default 1`, `host` guardado ya normalizado con `CHECK` de formato. `domains` tiene `UNIQUE (store_id, id)` para que las tablas futuras la referencien con FK compuesta `(store_id, id)` (C9). `domains.store_id → stores.id` es FK simple porque `stores` es la raíz y no tiene `store_id`.

## Cómo agregar una tabla de tienda

Sigue `schema-change` y `db-migration`: `store_id uuid not null`, `UNIQUE (store_id, id)`, FK compuestas, índice con `store_id` primero, y en la misma migración `ENABLE`/`FORCE` RLS, política con `USING` y `WITH CHECK` con la expresión de arriba y el `GRANT` mínimo. El arnés de cruce de tiendas (`pnpm test:tenant-isolation`, VIT-109) la enumera solo desde el catálogo y le genera todos los tests; si la tabla tiene FK a otra tabla de tienda o `CHECK` que el seed genérico no puede satisfacer, agrega un seeder en `tests/integration/tenant-isolation/seeders.ts` (ver `docs/qa/tenant-isolation.md`).

## Pendiente conocido

- Los seeds de desarrollo deben insertar por tienda dentro de `withStoreTx` (C15); aún no hay seeds.
- `app_user` puede escribir `verified_at` de sus propios dominios: la regla de que un subdominio solo se verifica en el alta y de que los nombres reservados (`app`, `www`, ...) no se pueden reclamar es de los casos de uso (VIT-121).
