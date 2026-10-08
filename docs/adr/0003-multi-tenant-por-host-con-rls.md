# ADR-0003: Multi-tenant por host con RLS y triple aislamiento

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — arquitectura fundamental y datos de todas las tiendas)
- Aprobación de Cesar: sí, 2026-10-07 (plan del Sprint 1). Aprobación de Cesar registrada; revisión de Security pendiente de re-verificación (threat model `docs/security/threat-models/tenancy.md` §9 pidió cambios el 2026-10-08; incorporados en esta versión, a la espera de que Security los re-verifique y el ADR pase a Aceptado).
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

1. **Host → tienda.** Tabla `domains(host PK, store_id, verified_at, released_at, created_at)`. Los subdominios `*.vitrinia.cl` se insertan verificados al crear la tienda; dominios propios quedan sin verificar hasta su gatillo (§6.5); `released_at` (nullable, sin lógica en Sprint 1) deja preparado el tombstone de subdominios renombrados (ADR-0004 §8). La búsqueda por host, que ocurre antes de conocer la tienda, se hace con la función `resolve_host(host text) RETURNS uuid`, acotada así (C8 del threat model):
   - `SECURITY DEFINER`, `STABLE`, con `SET search_path = pg_catalog, public`. **Propiedad del rol `host_resolver`** (`NOLOGIN`, `NOBYPASSRLS`, `NOSUPERUSER`), nunca de `migrator` ni del superusuario: con `FORCE RLS`, el dueño de la función es quien define qué filas ve, y `host_resolver` solo tiene `GRANT SELECT (host, store_id, verified_at)` sobre `domains` más una política propia `FOR SELECT TO host_resolver USING (verified_at IS NOT NULL)`.
   - `REVOKE EXECUTE ON FUNCTION resolve_host FROM PUBLIC; GRANT EXECUTE ... TO app_user`. Devuelve únicamente `store_id`; nunca otra columna ni filas.
   - Normaliza la entrada antes de buscar: minúsculas, sin puerto, sin punto final, largo ≤ 253, sin comodines.
   - **Host desconocido o con `verified_at IS NULL` devuelven `NULL`**, y la vitrina responde el mismo 404 en ambos casos (sin distinguir "no existe" de "no verificado": evita enumeración, A17).
   - **Fuente única del host:** el header `Host` tal como lo entrega Cloudflare. `X-Forwarded-Host` y cualquier otro header se ignoran.
   Caché host→tienda en memoria con TTL ≤ 60 s e invalidación explícita desde los casos de uso que renombran, despublican o reasignan; un host nuevo nunca hereda la tienda anterior (C12).
2. **Middleware:** solo normaliza el host y lo resuelve para enrutar `(portal)` o `(vitrina)`. **Nunca autoriza.** Ningún caso de uso lee un header puesto por el middleware para decidir acceso; la vitrina vuelve a resolver la tienda desde el host en el servidor y el portal obtiene `StoreId` de la sesión y de la membresía del usuario.
3. **RLS:** toda tabla con datos de tienda tiene `store_id NOT NULL`, `ENABLE` y `FORCE ROW LEVEL SECURITY`, y una política con **ambas** cláusulas (C2, C5):

   ```sql
   CREATE POLICY tenant_isolation ON <tabla> FOR ALL TO app_user
     USING      (store_id = NULLIF(current_setting('app.store_id', true), '')::uuid)
     WITH CHECK (store_id = NULLIF(current_setting('app.store_id', true), '')::uuid);
   ```

   `USING` filtra lecturas, `UPDATE` y `DELETE`; `WITH CHECK` rechaza un `INSERT` o `UPDATE` que fije el `store_id` de otra tienda desde la transacción actual (A5). Sin contexto devuelve cero filas (falla cerrado); un valor no UUID en `app.store_id` produce error de política, nunca filas. En `stores` la política compara `id`. **Particiones** (las de `events` desde Sprint 2) heredan `FORCE` y la política de la tabla padre y no reciben `GRANT` directo; la suite de aislamiento enumera `pg_class` con `relkind IN ('r','p')` y `pg_inherits` para que una partición sin cobertura falle en CI (C6).
   Roles (C1): las migraciones corren con `migrator`, dueño de las tablas, sin `BYPASSRLS` ni `SUPERUSER` y usado solo por el servicio `migrate`; la app **y el worker** usan `app_user` (`NOBYPASSRLS NOSUPERUSER NOCREATEROLE NOCREATEDB`, sin ser dueño de nada, sin `pg_read_all_data`/`pg_write_all_data`, solo `SELECT/INSERT/UPDATE/DELETE` sobre tablas de aplicación). **En el proveedor gestionado (Supabase/Neon en el piloto) se crean estos mismos dos roles; nunca se usa el rol por defecto del proveedor**, que suele ser dueño o tener bypass y anula el análisis.
4. **Contexto por transacción:** un único helper `withStoreTx(storeId: StoreId, fn)` abre la transacción y ejecuta `select set_config('app.store_id', $1, true)` (equivalente parametrizable de `SET LOCAL`). Solo acepta un `StoreId` ya validado por el shared kernel; cualquier otro valor se rechaza antes de tocar la BD (C3). Queda prohibido acceder a tablas de tienda fuera del helper (dependency-cruiser: el cliente Drizzle solo se importa desde `infrastructure/`, ADR-0008; Semgrep: `SET app.store_id` sin `LOCAL`, `set_config(..., false)` y `sql.raw` interpolado) y prohibido `SET` de sesión.
5. **Casos de uso:** reciben `StoreId` (tipo del shared kernel) y verifican contra la sesión o el host; las FKs entre tablas de tienda son compuestas `(store_id, id)` para impedir referencias cruzadas (C9). **Todo acceso cruzado responde 404, nunca 403** (no revela existencia), y deja una entrada en `audit_log` más un log `security.tenant_mismatch` con `actor_id`, `store_id` de sesión, `store_id` solicitado y `request_id`; nunca el payload ni filas de la otra tienda (C14). Los errores de política RLS y los `app.store_id` vacíos se cuentan como métrica: son la señal temprana de una fuga.
   **Worker y outbox (C10):** cada job lleva `store_id`; el worker conecta como `app_user` (ningún rol del worker salta RLS), re-verifica el `store_id` contra la entidad que procesa y ejecuta todo dentro de `withStoreTx`. Un job sin `store_id` no se procesa: va a dead-letter. No existe un modo "todas las tiendas"; un barrido global itera tiendas y abre una transacción por cada una.
6. **Cookies:** prefijo `__Host-` (Secure, `Path=/`, sin `Domain`). El portal vive en `app.vitrinia.cl`; las vitrinas no comparten cookies de sesión con él.
7. **Tests de cruce** en CI en cada capa (C4, C5, C7): pool de una sola conexión que alterna tiendas y verifica que ni `COMMIT` ni `ROLLBACK` dejan contexto; `SELECT/UPDATE/DELETE` sobre filas ajenas afectan 0 filas e `INSERT/UPDATE` con `store_id` ajeno son rechazados por `WITH CHECK`; cada test afirma además un conteo propio > 0 y `current_user = 'app_user'` para que una BD vacía o una conexión equivocada no lo haga pasar en falso. Los seeds insertan por tienda dentro de `withStoreTx`, nunca como `migrator` sin contexto (C15).

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

- Threat-model de Security (`docs/security/threat-models/tenancy.md`, VIT-108): hecho; §9 pidió siete cambios, incorporados en los puntos 1, 3, 4, 5 y 7 de la decisión. Falta la re-verificación de Security.
- OK de Cesar: registrado (2026-10-07).

## Historial

- 2026-10-08 · v2: incorpora §9 del threat model de tenancy (propiedad y límites de `resolve_host`; host no verificado → `NULL` → 404 uniforme y `Host` como fuente única; worker y outbox bajo `withStoreTx`; particiones con `FORCE` y política heredadas; 404 + `audit_log` en accesos cruzados; mismos roles en el proveedor gestionado; política con `WITH CHECK`). Agrega `released_at` a `domains` por la pregunta abierta de §8.
