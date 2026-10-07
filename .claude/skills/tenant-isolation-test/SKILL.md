---
name: tenant-isolation-test
description: Escribe y mantiene los tests que intentan cruzar tiendas en cada capa (BD con app_user y SET LOCAL, caso de uso, endpoint, MCP, caché host a tienda) y que corren en CI; úsala en cada módulo o tabla nueva con datos por tienda.
---

# tenant-isolation-test

## Cuándo usarla
- Al crear una tabla, caso de uso, endpoint o tool MCP con datos por tienda.
- Al tocar RLS, `domains`, la caché host→tienda o el contexto de sesión.
- Tercera capa del aislamiento (VITRINIA.md §8.1): si el test no existe, la capa no existe.

## Entradas
- Postgres de test aislado (service de CI o compose de test), nunca el de desarrollo.
- Roles `migrator` y `app_user` (sin `BYPASSRLS`) creados por el script de init.
- Fixtures: `storeA`, `storeB`, usuarios dueños de cada una, productos y pedidos en ambas.

## Pasos
1. Estructura: `tests/integration/tenant-isolation/{db,use-cases,http,mcp,cache}.test.ts` y un helper `seedTwoStores()` que crea A y B con datos equivalentes.
2. **BD** (conectado como `app_user`):
   ```ts
   await db.transaction(async (tx) => {
     await tx.execute(sql`SELECT set_config('app.store_id', ${storeA.id}, true)`);
     const rows = await tx.select().from(products).where(eq(products.id, productB.id));
     expect(rows).toHaveLength(0);                    // SELECT cruzado
     await expect(tx.insert(products).values({ ...p, storeId: storeB.id })).rejects.toThrow(); // WITH CHECK
     expect(await tx.update(products).set({ name: "x" }).where(eq(products.id, productB.id)).returning()).toHaveLength(0);
   });
   ```
   Casos: sin `SET LOCAL` → 0 filas (fail-closed); `SET LOCAL` de A tras commit no persiste en la siguiente transacción; `SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'` es `false`; test que **enumera todas las tablas con `store_id`** (`information_schema`) y exige RLS `FORCE` + política en cada una.
3. **Caso de uso**: invocar cada uno con sesión de A y `StoreId` de B → `Result` con error `Forbidden`/`NotFound`, sin efectos y con entrada en `audit`. Parametriza sobre el listado de casos de uso para que uno nuevo sin test falle.
4. **Endpoint**: con cookie de A, pedir `/api/.../<id de B>`: lecturas, escrituras y borrados → 404 (no 403, para no revelar existencia). Probar con host de B y cookie de A (la cookie `__Host-` no viaja entre hosts).
5. **MCP**: token emitido para la tienda A llamando cada tool con ids de B → rechazo; token de A en `confirm` de un `prepare` de B → rechazo (ver `mcp-security`).
6. **Caché host→tienda**: poblar con A, renombrar/eliminar el dominio de A, verificar invalidación; un host nuevo no hereda la tienda anterior; host desconocido → 404; header `Host`/`X-Forwarded-Host` manipulado no cambia la tienda autorizada.
7. Bug de aislamiento encontrado = primero un test que falla, luego el arreglo (AGENTS.md §11).
8. Verifica que el job `integration` de CI incluya la carpeta y falle si se omite: `pnpm vitest run tests/integration/tenant-isolation`.

## Salida
Archivos de test + sección "Aislamiento" en `docs/arquitectura/modulos/<modulo>.md` con la matriz capa × caso probado.

## Checklist
- [ ] Todas las tablas con `store_id` cubiertas automáticamente.
- [ ] Conexión de test con `app_user`, no con el dueño.
- [ ] Cada caso de uso y endpoint nuevo aparece en la matriz.
- [ ] Corre en CI en cada PR y bloquea el merge.
- [ ] Comprueba lecturas, escrituras, borrados y conteos/agregados.
- [ ] Sin datos aleatorios que hagan el test intermitente.

## Errores comunes
- Probar con el rol dueño o superusuario: RLS no aplica y el test pasa en falso.
- Una sola tienda en el fixture.
- Usar `SET` en vez de `SET LOCAL` con pool de conexiones: fuga entre requests.
- Verificar solo SELECT y olvidar UPDATE/DELETE/INSERT.
- Revisar sólo códigos HTTP y no que el dato realmente no cambió.
- Compartir el Postgres de test con desarrollo.
