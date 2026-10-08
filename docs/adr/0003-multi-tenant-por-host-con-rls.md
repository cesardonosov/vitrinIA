# ADR-0003: Multi-tenant por host con RLS y triple aislamiento

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — arquitectura fundamental y datos de todas las tiendas)
- Aprobación de Cesar: sí, 2026-10-07 (plan del Sprint 1). Pasa a Aceptado cuando Security cierre su revisión (VIT-108; zona sensible).
- Issue: VIT-107, VIT-108, VIT-109
- Zona sensible: sí (RLS/tenancy, auth, cookies) — requiere threat-model de Security antes de pasar a Aceptado

## Contexto

- Todas las tiendas comparten una sola app y una sola base de datos (§6.1). Principio de Security: un usuario de la tienda A nunca accede a la tienda B.
- §8.1 fija triple aislamiento: RLS con `app_user` sin `BYPASSRLS` y `SET LOCAL app.store_id`; verificación de `StoreId` en cada caso de uso; tests de cruce en CI. El middleware solo resuelve host → tienda.
- §7 exige tabla `domains` (host → tienda, `verified_at`); §8.2 exige cookies `__Host-` y nunca `Domain=.vitrinia.cl`.
- Hechos técnicos: un `SET` sin `LOCAL` persiste en la conexión y el pool la entrega a la siguiente request; `SET LOCAL` no acepta parámetros enlazados; los poolers en modo transacción (PgBouncer en Supabase/Neon) solo respetan estado dentro de una transacción; en 2025 hubo un bypass de middleware de Next.js mediante un header interno (CVE-2025-29927).
- Pre-mortem 2026-10-08: T1 (pool) y S1 (confiar en header) son riesgos altos.

## Decisión

Usaremos **resolución de tienda por host y aislamiento en tres capas**:

1. **Host → tienda.** Tabla `domains(host PK, store_id, verified_at, created_at)`. Los subdominios `*.vitrinia.cl` se insertan verificados al crear la tienda; dominios propios quedan sin verificar hasta su gatillo (§6.5). La búsqueda por host, que ocurre antes de conocer la tienda, se hace con una función `SECURITY DEFINER` que devuelve solo `store_id` para un host verificado. Caché host→tienda en memoria con TTL corto e invalidación explícita desde los casos de uso que renombran, despublican o reasignan.
2. **Middleware:** solo normaliza el host y lo resuelve para enrutar `(portal)` o `(vitrina)`. **Nunca autoriza.** Ningún caso de uso lee un header puesto por el middleware para decidir acceso; la vitrina vuelve a resolver la tienda desde el host en el servidor y el portal obtiene `StoreId` de la sesión y de la membresía del usuario.
3. **RLS:** toda tabla con datos de tienda tiene `store_id NOT NULL`, `ENABLE` y `FORCE ROW LEVEL SECURITY`, y una política `store_id = NULLIF(current_setting('app.store_id', true), '')::uuid` (sin contexto devuelve cero filas: falla cerrado). Las migraciones corren con un rol `migrator` dueño de las tablas; la app y el worker usan `app_user` sin `BYPASSRLS` y sin ser dueño.
4. **Contexto por transacción:** un único helper `withStoreTx(storeId, fn)` abre la transacción y ejecuta `select set_config('app.store_id', $1, true)` (equivalente parametrizable de `SET LOCAL`). Queda prohibido acceder a tablas de tienda fuera del helper (regla de dependency-cruiser/Semgrep) y prohibido `SET` de sesión.
5. **Casos de uso:** reciben `StoreId` (tipo del shared kernel) y verifican contra la sesión o el host; las FKs entre tablas de tienda son compuestas `(store_id, id)` para impedir referencias cruzadas.
6. **Cookies:** prefijo `__Host-` (Secure, `Path=/`, sin `Domain`). El portal vive en `app.vitrinia.cl`; las vitrinas no comparten cookies de sesión con él.
7. **Tests de cruce** en CI en cada capa, incluido uno con pool de una sola conexión que alterna tiendas.

## Alternativas consideradas

1. **Base compartida + RLS + verificación en aplicación (elegida)**
   - Pros: un esquema y una migración para todas las tiendas; costo mínimo; la BD falla cerrado aunque la app se equivoque.
   - Contras: depende de disciplina en el manejo de conexiones; RLS añade costo por consulta y complica el debug.
2. **Schema por tienda**
   - Pros: aislamiento físico fuerte por `search_path`.
   - Contras: migraciones × N tiendas; miles de schemas con el plan gratis; `search_path` sufre el mismo problema del pool.
3. **Base por tienda**
   - Pros: aislamiento máximo.
   - Contras: inviable con OPEX USD 50/mes y miles de tiendas gratis.
4. **Solo filtro `WHERE store_id` en la aplicación (sin RLS)**
   - Pros: simple, sin costo de RLS.
   - Contras: un solo olvido filtra datos; contradice §8.1.
5. **Rutas por path (`vitrinia.cl/tienda`) en vez de host**
   - Pros: sin DNS comodín ni certificados por subdominio.
   - Contras: todas las tiendas comparten origen (cookies, storage y CSP comunes); contradice §1 (`tutienda.vitrinia.cl`).

## Consecuencias

- Positivas: aislamiento verificable en tres capas; compatible con poolers en modo transacción; dominios propios futuros solo agregan filas en `domains`.
- Negativas / deuda:
  - Todo acceso a datos de tienda paga una transacción, incluso las lecturas.
  - La función `SECURITY DEFINER` y el rol `migrator` son superficie a revisar en cada cambio.
  - La caché host→tienda puede servir datos viejos dentro del TTL (pre-mortem T7).
  - Las consultas globales (panel VitrinIA, §7.1) necesitarán un rol y un ADR propios.
  - En local, `__Host-` exige contexto seguro: validar `*.localhost` y el túnel en el Sprint 1.
- Reversibilidad: **irreversible en la práctica** una vez que existan tiendas reales (cambiar el modelo de tenancy implica migrar todos los datos).
- Seguridad: es el control central de §8.1; un error aquí es una fuga entre tiendas.
- OPEX: neutro (USD 0); RLS no requiere servicios extra.

## Pendiente para Aceptado

- Threat-model de Security (tenancy, cookies, función `SECURITY DEFINER`, caché host→tienda).
- OK de Cesar.
