---
name: schema-change
description: Hace un cambio de esquema completo y seguro (Zod + tabla Drizzle + migración nueva + política RLS + test de cruce de tiendas + data-model y schemaVersion del Store Config); úsala siempre que cambie una tabla o el Store Config.
---

# schema-change

Rol principal: Architect (diseño); el Builder aplica con `db-migration`. Todo cambio de esquema es zona sensible (tenancy): requiere Security.

## Cuándo usarla

- Tabla o columna nueva, cambio de tipo o índice.
- Cambio del Store Config (JSON validado con Zod).
- Nunca se hace solo una de las partes: las seis van juntas en el mismo PR.

## Entradas

- Issue `VIT-xxx` con el modelo deseado.
- `docs/arquitectura/data-model.md` (generado) y migraciones existentes en `drizzle/migrations/`.
- Convenciones de VITRINIA.md §7 y §8.1.

## Pasos

1. **Zod**: define el schema en el borde del módulo (`presentation` o `application`) con tipos inferidos; el dominio no importa Zod.
2. **Tabla Drizzle** en `src/modules/<m>/infrastructure/schema.ts`, con:
   - `id uuid` UUID v7 (generado en la app, no `gen_random_uuid()` v4).
   - `store_id uuid not null` con FK y índice (toda tabla de tienda).
   - `created_at` y `updated_at` como `timestamp({ withTimezone: true })`, UTC.
   - `version integer not null default 1` para concurrencia optimista (`WHERE version = $n`).
   - Dinero como `integer`/`bigint` más `currency text not null default 'CLP'`; nunca `numeric` ni float.
   - Teléfonos E.164 con `check`.
3. **Migración nueva**: `pnpm drizzle-kit generate`. Nunca edites una migración ya aplicada; si te equivocaste, crea otra. Revisa el SQL generado a mano.
4. **RLS** en la misma migración:
   ```sql
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders FORCE ROW LEVEL SECURITY;
   CREATE POLICY store_isolation ON orders TO app_user
     USING (store_id = current_setting('app.store_id')::uuid)
     WITH CHECK (store_id = current_setting('app.store_id')::uuid);
   GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
   ```
   `app_user` no tiene `BYPASSRLS`; el repositorio abre transacción y ejecuta `SET LOCAL app.store_id = '<uuid>'`. Audit log: solo `INSERT` y `SELECT`.
5. **Test de cruce de tiendas** en `tests/integration/`: crea datos en la tienda A, fija `app.store_id` de la B y comprueba que `SELECT`, `UPDATE` y `DELETE` afectan 0 filas y que un `INSERT` con otro `store_id` falla. Debe fallar si quitas la política.
6. **Store Config**: si cambia su forma, sube `schemaVersion`, añade una función de migración de configuración `vN -> vN+1` con test que migra un fixture real, y mantiene compatibilidad con datos guardados.
7. **Docs**: regenera `data-model` (`pnpm docs:data-model`), actualiza `docs/arquitectura/modulos/<m>.md` y, si hay decisión de diseño, un ADR.
8. Aplica en Postgres de test aislada: `pnpm db:migrate` y `pnpm test:integration`.
9. Pide `tenant-isolation-test` y `security-review` a Security (issue si falta).

## Salida

Un PR con: schema Zod, tabla Drizzle, migración nueva, política RLS, test de cruce, data-model regenerado y `schemaVersion` migrado si aplica, más HANDOFF a Reviewer y Security.

## Checklist de verificación

- [ ] Ninguna migración aplicada fue modificada (`git diff main --stat -- drizzle/migrations` solo muestra archivos nuevos).
- [ ] La tabla tiene `store_id`, `version`, `timestamptz`, UUID v7 y dinero entero + `currency`.
- [ ] `ENABLE` y `FORCE ROW LEVEL SECURITY` presentes con política `USING` y `WITH CHECK`.
- [ ] El test de cruce falla sin la política y pasa con ella.
- [ ] `schemaVersion` y su migración existen si cambió el Store Config.
- [ ] data-model regenerado en el diff.

## Errores comunes a evitar

- Olvidar `WITH CHECK` (permite insertar en otra tienda).
- Usar el rol dueño de la tabla en la app: salta la RLS.
- `SET` en vez de `SET LOCAL` (se filtra entre conexiones del pool).
- Guardar precios con decimales o fechas sin zona horaria.
- Confiar en el middleware o en un header para aislar tiendas.
