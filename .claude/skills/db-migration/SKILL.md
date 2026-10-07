---
name: db-migration
description: Crea una migración nueva con drizzle-kit (nunca edita las aplicadas), revisa el SQL, define RLS e índices, asegura reversibilidad y la prueba contra la BD de test; úsala ante cualquier cambio de esquema.
---

# db-migration

## Cuándo usarla
- Cambios de tablas, columnas, índices, políticas RLS o seeds.
- El Architect ya definió el cambio con `schema-change` (Zod + SQL + RLS juntos).
- Zona sensible (tenancy): Security aprueba el PR.

## Entradas
Issue VIT-xxx, esquema Drizzle en `src/modules/<modulo>/infrastructure/schema.ts`, `drizzle/migrations/`, Postgres de test aislada.

## Pasos
1. Verifica que la BD de test es la correcta: `echo $DATABASE_URL | grep -v prod` y que el nombre contiene `_test`. Nunca corras contra desarrollo ni producción.
2. Modifica solo el esquema Drizzle (nunca el SQL a mano de entrada). Reglas de datos: IDs `uuid` (v7 generado en la app), `timestamptz`, dinero `integer` + `currency text`, `version integer not null default 1`, `store_id uuid not null` en toda tabla de tenant.
3. Genera: `pnpm drizzle-kit generate --name <descripcion_corta>`. Se crea un archivo nuevo y numerado. **Jamás edites ni borres migraciones ya aplicadas** (están protegidas por AGENTS.md §5); si hay error, crea una migración correctiva.
4. Revisa el SQL generado línea por línea. Alerta roja: `DROP COLUMN/TABLE`, `ALTER TYPE`, `NOT NULL` sin default sobre tabla con datos, cambios de tipo con reescritura. Para esas, usa el patrón expandir → migrar datos → contraer en migraciones separadas.
5. **RLS** (tabla de tenant), añade al final del SQL de la misma migración:
   ```sql
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE products FORCE ROW LEVEL SECURITY;
   CREATE POLICY products_tenant ON products
     USING (store_id = current_setting('app.store_id')::uuid)
     WITH CHECK (store_id = current_setting('app.store_id')::uuid);
   GRANT SELECT, INSERT, UPDATE, DELETE ON products TO app_user;
   ```
   `app_user` sin `BYPASSRLS`.
6. **Índices**: `(store_id, ...)` como prefijo en consultas por tienda; unique parciales para slugs; FTS con `unaccent` + `pg_trgm` solo si el issue lo pide. Justifica cada índice con la consulta que sirve.
7. **Reversibilidad**: escribe `drizzle/rollbacks/<n>_<nombre>.down.sql` con el SQL inverso, o documenta en el PR un plan de rollback (restaurar backup + migración correctiva) cuando sea irreversible (borrado de datos).
8. Aplica en la BD de test: `pnpm db:migrate:test`, luego `pnpm test:integration`. Prueba también el ciclo: migrar → rollback → migrar de nuevo.
9. Test de aislamiento: como `app_user` con `app.store_id = A`, no se ve ni se inserta nada de la tienda B. Si falta, la migración no se mergea.
10. Seeds en `drizzle/seeds/` idempotentes (`ON CONFLICT DO NOTHING`), solo datos de desarrollo; sin datos personales reales. Regenera `docs/arquitectura/data-model` desde Drizzle.

## Salida
```
MIGRACIÓN <n>_<nombre>
Cambios: <tablas/columnas/índices>
RLS: sí/no (tabla) · Test de cruce: OK
Rollback: archivo | plan en PR
Aplicada en BD test: OK · Integración: OK
```

## Checklist
- [ ] Archivo nuevo; ninguna migración aplicada tocada.
- [ ] SQL revisado a mano.
- [ ] RLS + `FORCE` + política con `WITH CHECK` en tablas de tenant.
- [ ] Índices justificados; `store_id` primero.
- [ ] Reversible o plan escrito.
- [ ] Probada en BD de test; seeds idempotentes.

## Errores comunes
- Usar `drizzle-kit push` en vez de migraciones versionadas.
- Olvidar `FORCE ROW LEVEL SECURITY` y que el owner la salte.
- Agregar columna `NOT NULL` sin default y romper filas existentes.
- Dinero como `numeric`/`float`.
- Ejecutar contra la BD equivocada.
