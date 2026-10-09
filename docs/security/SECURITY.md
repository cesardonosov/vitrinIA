# Seguridad de VitrinIA

- Dueño: Security · Versión: **v1.1** (2026-10-09, Sprint 1, VIT-108) · Estado: **línea base**; se extiende en cada sprint con los threat models que entran. Historial al final.
- Fuente de las reglas: [`docs/VITRINIA.md`](../VITRINIA.md) §8, [`AGENTS.md`](../../AGENTS.md) §9. Si este documento y VITRINIA.md difieren, manda VITRINIA.md y se abre un issue.
- Aquí no hay secretos, hosts internos ni datos personales. Si necesitas ponerlos para explicar algo, estás explicando mal.
- Cada afirmación sobre "lo que hay en `main`" se verificó el 2026-10-09 contra los archivos citados. Cuando un control está pendiente, se dice y se nombra el issue.

## 1. Principio de aislamiento

**Un usuario de la tienda A nunca accede a la tienda B.** "Usuario" incluye al vendedor, al comprador, al worker, a la IA del comercio (MCP) y a cualquier código que corra con credenciales de la app.

Se cumple con tres capas independientes (§8.1), y cada capa tiene su prueba. Si falla una, las otras siguen en pie:

| Capa | Mecanismo | Falla cerrada cuando | Prueba (estado en `main`) |
|---|---|---|---|
| 1. Base de datos | RLS en toda tabla con `store_id`: `ENABLE` + `FORCE ROW LEVEL SECURITY`, política `store_id = NULLIF(current_setting('app.store_id', true), '')::uuid` en `USING` y `WITH CHECK` (en `stores`, por `id`). Rol de runtime `app_user` sin `BYPASSRLS`, sin ser dueño, con `SELECT/INSERT/UPDATE/DELETE` sobre `domains` y solo `SELECT/INSERT/UPDATE` sobre `stores` (borrar una tienda es un flujo aparte, auditado). Contexto fijado solo por `withStoreTx(storeId, fn)` ([`src/infra/db/with-store-tx.ts`](../../src/infra/db/with-store-tx.ts)) con `set_config('app.store_id', $1, true)` dentro de la transacción. | No hay contexto, el contexto no es UUID, la conexión viene del pool, el rol es el equivocado. | Vigente: [`drizzle/migrations/0000_tenancy_base.sql`](../../drizzle/migrations/0000_tenancy_base.sql) (VIT-107, #46); `tests/integration/tenancy.test.ts` (pool de 1, `ROLLBACK`, concurrencia, `resolve_host`); [`tests/integration/tenant-isolation/db.test.ts`](../../tests/integration/tenant-isolation/db.test.ts) (VIT-109, #56); [`infra/ci/rls-check.sh`](../../infra/ci/rls-check.sh) con `check-rls.sql` y autopruebas (VIT-105, #53). |
| 2. Aplicación | Cada caso de uso recibe `StoreId` (shared kernel) y lo compara con la sesión (portal) o con el host resuelto en el servidor (vitrina). El middleware solo enruta; **nunca autoriza** y ningún caso de uso lee sus headers. Acceso cruzado → 404 (no 403) + `audit_log`. | El `storeId` viene del cuerpo, de la query o de un header. | Parcial: regla Semgrep `vitrinia-middleware-header-in-authorization` vigente ([`.semgrep/rules/vitrinia.yml`](../../.semgrep/rules/vitrinia.yml)); tests de caso de uso, endpoint y caché en VIT-120 (Sprint 2); MCP en Sprint 4. |
| 3. Evidencia | Arnés de cruce generado desde el catálogo (`seedTwoStores` equivalente: dos tiendas sembradas por test) en CI, bloqueante, que cubre sola cada tabla nueva con `store_id`. Una tabla sin política hace fallar la suite nombrándola. | — | Vigente: job `integration` de CI con `pnpm test:tenant-isolation` y la prueba de mutación `pnpm test:tenant-isolation:mutations` ([`docs/qa/tenant-isolation.md`](../qa/tenant-isolation.md)). Se extiende a caso de uso, endpoint y tool en VIT-120. |

Reglas derivadas, innegociables:

- Nunca `SET app.store_id` sin `LOCAL`; nunca `set_config(..., false)`; nunca acceso a tablas de tienda fuera de `withStoreTx`. Lo verifican Semgrep (`vitrinia-set-store-id-without-local`, `vitrinia-set-config-session-scope`, `vitrinia-sql-raw-*`) y dependency-cruiser (`drizzle-only-in-infrastructure`, `db-client-only-via-with-store-tx`, [ADR-0008](../adr/0008-reglas-de-dependencia-con-dependency-cruiser.md)).
- Las lecturas sin contexto (host → tienda) pasan por la función `SECURITY DEFINER` acotada `resolve_host`, propiedad del rol `host_resolver` (`NOLOGIN`, `NOBYPASSRLS`), nunca por un rol con bypass.
- Cookies de sesión con prefijo `__Host-`; el portal vive en `app.vitrinia.cl` y las vitrinas no comparten cookies con él. Nunca `Domain=.vitrinia.cl` (VIT-124, Sprint 3).
- Las vitrinas nunca renderizan HTML ni CSS libre del vendedor; el Store Config es un esquema cerrado ([ADR-0004](../adr/0004-store-config-driven.md)).
- Consultas globales (panel VitrinIA) necesitan un rol de solo lectura, auditado y un ADR propio. No existen en la POC.

Detalle, amenazas y controles: [`threat-models/tenancy.md`](threat-models/tenancy.md).

## 2. Zonas sensibles y veto

Auth, RLS/tenancy, MCP, secretos, datos personales, pedidos, pagos e infraestructura. Un issue en zona sensible lleva threat model **antes** de que el Builder escriba código, y su PR lleva `security-review` después del Reviewer. Riesgos sobre pagos o datos sensibles se escalan a Cesar con opciones y recomendación ([`docs/STATUS.md`](../STATUS.md)).

**Cómo se hace cumplir el veto** ([ADR-0007](../adr/0007-equipo-de-9-agentes.md) §2, capa 3). Todos los agentes usan la misma identidad de GitHub, así que *required reviewers* no separa funciones. El mecanismo es un check de CI requerido, `security-gate`, que detecta zona sensible por rutas (`.github/security-paths.txt`) y exige dos evidencias: la etiqueta `security-approved` **y** un comentario de PR con el bloque `SECURITY REVIEW … VEREDICTO: APROBADO` ligado al head SHA (un push posterior lo invalida). Cesar mezcla los PRs de zona sensible (capa 4).

Estado en `main` (2026-10-09): el check **no existe todavía** en [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml); es VIT-149 (DevOps, P1). El ruleset de `main` con checks requeridos tampoco está aplicado: es acción de Cesar (STATUS, punto 11; pasos en [`docs/runbooks/ci.md`](../runbooks/ci.md)). Hasta entonces el veto se cumple por disciplina: Security deja el bloque `SECURITY REVIEW` con head SHA en el PR y Cesar mezcla a mano; ningún agente mezcla un PR sensible sin ese bloque.

## 3. Inventario de datos personales (Ley 21.719)

Ley 21.719 con plena vigencia el 1 de diciembre de 2026, en pleno piloto. Principios que aplicamos desde el Sprint 1: minimización (no se guarda lo que no se usa), finalidad declarada, retención finita, y exportación/borrado de cuenta antes del piloto público (§8.4).

Los plazos de retención están **decididos**: [ADR-0010](../adr/0010-retencion-de-datos.md) (Cesar, 2026-10-08). Los datos del comprador y los medios de pago están decididos en [ADR-0005](../adr/0005-checkout-whatsapp-y-link-de-pago.md) §4–5 (Cesar, 2026-10-08; STATUS puntos 1 y 2). Lo que sigue marcado "propuesta de Security" no está en ningún ADR todavía.

| Dato | Titular | Dónde | Finalidad | Entra en | Retención | Control |
|---|---|---|---|---|---|---|
| Email del vendedor | Vendedor | `users` (Auth.js), correo de verificación | Login, verificación, avisos de la tienda | Sprint 3 | Mientras la cuenta exista; 30 días tras el cierre de cuenta (ADR-0010), salvo pedidos dentro de su plazo | RLS no aplica a `users` (tabla global): acceso solo vía Auth.js y casos de uso de `identity`; nunca en logs. |
| Identificador de Google (`sub`) | Vendedor | `accounts` (Auth.js) | Login con Google | Sprint 3 | Igual que el email | Sin vinculación automática de cuentas por email (VIT-124). |
| Tokens de magic link y de verificación | Vendedor | `verification_tokens` | Login sin contraseña | Sprint 3 | 15 minutos o un solo uso, lo que ocurra primero | Hash en BD; URL nunca en logs ni en eventos de analítica. |
| Nombre de la tienda, WhatsApp del negocio (E.164), redes | Vendedor (dato de contacto comercial, público por diseño) | Store Config (`stores`), vitrina pública | Que el comprador contacte al vendedor | Sprint 1 (esquema, #66), Sprint 2 (persistencia) | Mientras la tienda exista; tombstone del subdominio sin datos personales | Bajo RLS; escritura auditada (ADR-0004 §7). |
| Medios de pago del vendedor: link de Mercado Pago, link de Flow, datos de transferencia (banco, tipo y número de cuenta, titular, RUT y correo del vendedor) | Vendedor (público por diseño: se muestran al comprador) | Store Config, vitrina pública | Que el comprador pague al vendedor | Sprint 2 | Mientras la tienda exista | Links con allowlist de `https:` y hosts de Mercado Pago/Flow; **cambios solo desde el portal con re-verificación, nunca por MCP** (ADR-0005 §4; threat model MCP, VIT-122). Nunca en logs. |
| Fotos de productos | Vendedor (pueden contener GPS del domicilio) | `ImageStorage` (disco local; R2/S3 en producción) | Vitrina | Sprint 3 (subida), Sprint 4 (import) | Mientras exista el producto; borrado del archivo en ≤ 30 días tras eliminar el producto | Re-encode sin metadatos, nunca se guarda el original (VIT-123). |
| Contacto del comprador: nombre y teléfono (siempre), correo y nota (opcionales) | Comprador | `order_contacts` (tabla aparte, RLS por tienda) | Que el vendedor atienda el pedido; resumen por correo si lo pidió | Sprint 2 | **24 meses desde el pedido, luego anonimización**; el pedido queda (ADR-0010). Supresión a pedido del titular antes del plazo. | Fuera de `events` y de logs; snapshot bajo RLS; job diario de retención con registro sin PII (ADR-0005 §5, ADR-0010). |
| Dirección de despacho (región, comuna, calle y número, depto o referencia) | Comprador | `order_contacts` | Despacho | Sprint 2 | 24 meses, luego anonimización (ADR-0010) | **Solo se pide si el comprador elige despacho**; con retiro no existe (ADR-0005 §5). |
| RUT, razón social y giro | Comprador que pide factura (el RUT de una persona natural es dato personal) | `order_contacts` / datos de factura del pedido | Factura del vendedor | Sprint 2 | Datos de factura de empresa: 6 años con el pedido (ADR-0010); RUT de persona natural: se trata como contacto, 24 meses | **Solo si pide factura; nunca por defecto**; RUT validado con módulo 11 (ADR-0005 §5). |
| Pedido sin datos personales (ítems, montos, fecha, canal, estado) | — (dato del vendedor) | `orders`, `order_items` | Registro del pedido, GMV de intención y confirmado | Sprint 2 | **6 años desde el pedido**, luego se borra (ADR-0010) | Snapshot inmutable bajo RLS; `app_user` sin `UPDATE`/`DELETE` en `order_items` (ADR-0005 §2). |
| Mensaje de WhatsApp del pedido | Comprador | No se persiste (se arma en el servidor y se devuelve la URL) | Checkout | Sprint 2 | 0 (no se guarda) | Construido con `encodeURIComponent` desde datos validados; nunca en logs. |
| `visitor_id`, `session_id`, dispositivo, `referrer` sin query, `utm_*` en allowlist | Comprador (seudónimo) | `events` (particionada por mes) | Analítica del vendedor y del negocio | Sprint 2 | **Crudos 13 meses; agregados `store_daily_metrics` sin límite** (ADR-0010) | `visitor_id = hash(sal diaria ‖ store_id ‖ IP truncada ‖ UA)`; la sal se destruye al rotar; no es enlazable entre días ni tiendas (VIT-125). |
| Dirección IP | Vendedor y comprador | Solo en memoria (rate limit, `visitor_id`); logs de acceso | Anti-abuso | Sprint 1 (`/api/csp-report`, #42), Sprint 2 | Nunca se persiste completa; en logs, truncada (/24 IPv4, /48 IPv6) y 30 días (retención de logs) | Regla de logs §4; test de redact (VIT-126). |
| Texto de búsqueda (`search_performed`) | Comprador (puede contener email o teléfono) | `events.properties` | Analítica | Sprint 2 | Igual que eventos; largo máximo | Filtro de patrón email/teléfono antes de persistir (descartar o enmascarar). |
| `actor_id` y acción en `audit_log` | Vendedor | `audit_log` append-only | Trazabilidad de cambios y de intentos de cruce | Sprint 2 | Propuesta de Security: vida de la tienda + 12 meses. **No está en ADR-0010**; se fija al crear la tabla. | Solo IDs y nombres de acción; nunca payload con PII. |
| Respaldos de Postgres | Todos | Volumen local (POC); almacenamiento del proveedor (piloto) | Recuperación | Sprint 2 (VIT-118) | Propuesta de Security: 30 días; cifrados en reposo cuando salgan del PC de Cesar. Se fija en VIT-118. | Mismo tratamiento que el dato original; restauración probada. |
| Mailpit (local) | Vendedor de prueba | Contenedor local | Desarrollo | Sprint 1 (#41) | Volátil; expuesto solo en `127.0.0.1`; nunca por el túnel | Checklist `tunnel-demo`. |

Fuera de inventario por diseño: no hay cookies de rastreo, no hay terceros de analítica, VitrinIA no toca fondos ni guarda datos de tarjetas (§2.3, ADR-0005 §5).

Veredicto de Security sobre ADR-0010 (pendiente en el ADR): **APROBADO**. Los plazos cumplen minimización y finalidad; la única condición es que el job diario de retención entre al Sprint 2 junto con `order_contacts` y tenga test (ya está en "Seguimientos por crear como issue" de STATUS: *Builder + Security, P1, Sprint 2*). Ese issue es también el dueño del threat model de checkout (§5).

Pendientes antes del piloto público (§8.4): aviso de privacidad (borrador por IA en un Claude Doc, STATUS punto 4; revisión de abogado pendiente), exportación y borrado de cuenta del vendedor, procedimiento de respuesta a solicitudes de titulares, confirmación legal de plazos, del rol encargado/responsable con compradores (ADR-0010) y del deber de notificar brechas.

## 4. Reglas de logs

Aplican a pino, Sentry, salida de consola, cuerpos de error, mensajes de excepción, `audit_log` y reportes de CSP. Test obligatorio (VIT-126, Sprint 2): la suite de logs falla si una línea contiene `@` o `+569` fuera de la allowlist de pruebas.

Nunca se registra:

- Emails, teléfonos, nombres de compradores, direcciones, RUT.
- Tokens, cookies, headers `Authorization`/`Cookie`/`Set-Cookie`, magic links, URLs con `token=`, `code=` o similares, claves de API, `DATABASE_URL`.
- IP completa (se trunca antes de loguear).
- Cuerpos de request/response ni filas de BD. En un error de RLS o de validación se loguea el nombre de la tabla/campo y el código, no el valor (`withStoreTx` ya omite el valor en `InvalidStoreContextError`).
- Payloads de eventos de analítica (van a `events`, no a pino ni a Sentry).
- Contenido del catálogo (descripciones, captions importados): es contenido no confiable y puede contener instrucciones o PII.
- Valores de variables de entorno al arrancar (VIT-106 AC6, #34).

Siempre se registra, en formato estructurado:

- `request_id`, `store_id` (UUID, no es PII), `actor_id` (UUID de usuario), ruta sin query, método, status, duración.
- Eventos de seguridad con nombre fijo: `security.tenant_mismatch` (sesión A pide B), `security.rls_denied` (error de política o contexto vacío), `security.host_unresolved`, `security.rate_limited`, `security.upload_rejected`, `security.csp_violation` (ya emitido por `/api/csp-report`, ver [`headers.md`](headers.md)). Son la señal temprana de los riesgos del pre-mortem; se cuentan como métrica.

Mecánica: pino con `redact` sobre las rutas conocidas (`req.headers.authorization`, `req.headers.cookie`, `*.email`, `*.phone`, `*.token`, `*.password`) **más** un serializador que enmascara patrones de email y teléfono chileno en cualquier string; `beforeSend` de Sentry con la misma función. **Retención de logs: 30 días** (ADR-0010). Nivel por defecto `info` en producción; `debug` nunca se activa contra datos reales.

## 5. Índice de threat models

| Feature | Archivo | Issue | Estado | Sprint |
|---|---|---|---|---|
| Aislamiento entre tiendas (tenancy, RLS, host, cookies) | [`threat-models/tenancy.md`](threat-models/tenancy.md) | VIT-108 | Vigente **v1.1** (2026-10-09) | 1 |
| Pedidos, `order_contacts` y medios de pago (checkout) | `threat-models/checkout.md` | **Issue por crear** (STATUS, "Seguimientos por crear": *Builder + Security, P1, Sprint 2: `order_contacts` con RLS, checkout por opción y job de retención*). Insumos: ADR-0005, ADR-0010. VIT-127 (métrica de GMV) es relacionado, no el dueño. | Pendiente; decisiones de Cesar ya tomadas | 2 |
| Analítica first-party (re-identificación, retención, abuso del endpoint) | `threat-models/analytics.md` | VIT-125 | Pendiente; retención fijada en ADR-0010 | 2 |
| Auth.js, cookies y onboarding anti-abuso | `threat-models/auth.md` | VIT-124, VIT-121 | Pendiente | 3 |
| Pipeline de imágenes (EXIF, tipo real, tamaño) | `threat-models/images.md` | VIT-123 | Pendiente | 3 |
| MCP (scopes, prepare→confirm, prompt injection, medios de pago solo por portal) | `threat-models/mcp.md` | VIT-122 | Pendiente | 4 |

Un threat model se escribe antes del código del issue (skill `threat-model`), vive en `docs/security/threat-models/<feature>.md`, y sus controles entran como criterios de aceptación en los issues. Cuando una feature cambia (nuevo proveedor, nueva tool, nuevo rol), el threat model se versiona con un historial; no se reescribe el pasado.

Documentos relacionados: [`pre-mortem-security-2026-10-08.md`](pre-mortem-security-2026-10-08.md) (riesgos S1–S10, controles mínimos del Sprint 1, exigencias a los ADRs, escalados E1–E4, todos resueltos por Cesar el 2026-10-08); [`headers.md`](headers.md) (CSP report-only y headers, VIT-115; se fusiona aquí en VIT-152 al pasar a enforce).

## 6. Cómo reportar un incidente o una vulnerabilidad

Un incidente es cualquier sospecha de: acceso a datos de otra tienda, secreto expuesto (commit, log, túnel), cuenta tomada, tienda de phishing bajo `*.vitrinia.cl`, dependencia comprometida, o pérdida de datos.

**Quién puede reportar:** cualquier agente, Cesar, un vendedor o un tercero.

**Canal interno (agentes y Cesar):**

1. Crear un issue en `cesardonosov/vitrinia` con título `[SEC] <resumen sin detalles explotables>`, etiqueta `security`, prioridad P0, asignado a Security y mencionando a Cesar. El issue **no** contiene secretos, tokens, datos personales ni pasos de explotación completos; eso se entrega a Cesar por el canal privado que él indique.
2. Si el incidente involucra un secreto: rotarlo primero, reportar después. La rotación no espera aprobación.
3. Si hay un túnel de demo abierto: cerrarlo (`tunnel-demo`) antes de investigar.
4. Si hay sospecha de cruce entre tiendas: escribir primero el test que lo reproduce (`tenant-isolation-test`), después el arreglo. Ningún arreglo de aislamiento se mezcla sin su test.

**Canal externo (vendedores y terceros):** el dominio `vitrinia.cl` ya está registrado (Cesar, 2026-10-09). Falta delegar el DNS a Cloudflare y crear el correo dedicado (acciones de Cesar, STATUS punto 11). Hasta entonces, el contacto es el de Cesar como Product Owner; cuando exista el correo, se publica aquí junto con una política de divulgación responsable.

**Severidad y respuesta inicial:**

| Severidad | Ejemplo | Primera acción | Quién decide |
|---|---|---|---|
| Crítica | Datos de una tienda vistos por otra; `migrator`, `SESSION_SECRET` o la clave privada de dotenvx expuestos; medio de pago alterado | Contener (rotar, cerrar túnel, despublicar), test que reproduce, aviso a Cesar el mismo día | Cesar |
| Alta | Vulnerabilidad explotable sin evidencia de explotación; dependencia con CVE alta en runtime | Issue P0, parche o mitigación antes de la siguiente demo | Security |
| Media | Hallazgo de Semgrep/gitleaks en PR, header faltante, log con PII en desarrollo | Issue con fecha, bloquea el PR afectado | Security |
| Baja | Mejora de hardening | Backlog | Security |

**Datos personales:** si el incidente afecta datos de vendedores o compradores, la Ley 21.719 obliga a notificar a la Agencia de Protección de Datos Personales y, según el caso, a los titulares. Plazos, formato y responsable se confirman con asesoría legal antes del piloto público (STATUS punto 4); hasta entonces, toda brecha con datos personales se escala a Cesar como Crítica y se documenta en `docs/security/incidents/<fecha>-<slug>.md` (post-mortem sin culpas: qué pasó, qué datos, qué se hizo, qué test lo impide ahora).

## 7. Barreras automáticas (estado en `main` al 2026-10-09)

| Barrera | Dónde | Estado | Issue / PR |
|---|---|---|---|
| gitleaks | lefthook `pre-commit` (`gitleaks protect --staged`) y job `gitleaks` de CI | Vigente | VIT-106 (#34), VIT-105 (#53) |
| Hook `block-plain-env-files`: ningún `.env*` salvo `.env.example` entra a un commit | lefthook `pre-commit` | Vigente | VIT-106 (#34); VIT-143 amplía a renames y `.envrc` |
| Semgrep con reglas propias (`SET` sin `LOCAL`, `set_config` con tercer argumento distinto de `true`, `sql.raw` interpolado, `dangerouslySetInnerHTML`/`innerHTML`, `eval`, headers del middleware en autorización) + `p/typescript` + `p/owasp-top-ten` | job `semgrep` de CI, con `semgrep --test` de los fixtures | Vigente | VIT-105 (#53); endurecimiento en VIT-159 (ampliar G8, fijar packs) y VIT-161 (`set_config` solo en `withStoreTx`) |
| Chequeo de RLS y roles (`check-rls.sql`: roles sin `BYPASSRLS`/`SUPERUSER`, `app_user` sin DDL ni ownership, ENABLE+FORCE en tablas y particiones con `store_id`, política con `USING` y `WITH CHECK`, sin políticas permisivas abiertas, particiones con privilegio directo, matviews) con **autopruebas** que demuestran que sabe fallar | job `rls-check` de CI ([`infra/ci/rls-check.sh`](../../infra/ci/rls-check.sh)) | Vigente | VIT-105 (#53); endurecimiento en VIT-160 (`pg_has_role`), VIT-162 (`store_id =` en la expresión), VIT-164 (vistas y tablas foráneas) |
| Arnés de cruce entre tiendas generado desde el catálogo + prueba de mutación | job `integration` de CI, [`tests/integration/tenant-isolation/`](../../tests/integration/tenant-isolation/) | Vigente | VIT-109 (#56); capas de caso de uso y endpoint en VIT-120 |
| Tests de integración de tenancy (pool, `resolve_host`, roles, ids) | job `integration`, `tests/integration/tenancy.test.ts` | Vigente | VIT-107 (#46) |
| dependency-cruiser (capas; `drizzle-only-in-infrastructure`: Drizzle y `src/infra/db/` solo desde `src/modules/*/infrastructure/` o `src/infra/`; `db-client-only-via-with-store-tx`) | job `architecture` de CI ([`.dependency-cruiser.cjs`](../../.dependency-cruiser.cjs)) | Vigente | VIT-103 (#45), ADR-0008 |
| Migraciones aplicadas inmutables (`drizzle/migrations/*.sql` no se modifican ni renombran) | job `todo-check` de CI ([`infra/ci/check-migrations-immutable.sh`](../../infra/ci/check-migrations-immutable.sh)) | Vigente | VIT-105 (#53) |
| Variables de entorno con Zod, `NEXT_PUBLIC_*` sin secretos, valores nunca logueados | Arranque de app y worker (`src/infra/env.ts`) | Vigente | VIT-106 (#34); VIT-144 endurece |
| Dependencias: lockfile congelado, scripts de instalación bloqueados, Actions fijadas por SHA, `permissions: contents: read`, sin `pull_request_target` | CI | Vigente | VIT-105 (#53) |
| Renovate con edad mínima de release (7/14 días), sin automerge | `renovate.json` | Config vigente; **falta instalar la app** (Cesar, STATUS 11) | VIT-105 |
| Headers de seguridad (`frame-ancestors 'none'` enforced, `nosniff`, `Referrer-Policy`) y CSP con nonce en **report-only** con endpoint `/api/csp-report` | App ([`headers.md`](headers.md)) | Vigente; enforce pendiente | VIT-115 (#42); VIT-152 (enforce), VIT-148 (E2E) |
| Deny/ask de lectura de secretos para agentes (`.env.keys`, `.env*` sin cifrar, `dotenvx get/decrypt/keypair`, `printenv`/`env`) | [`.claude/settings.json`](../../.claude/settings.json) | Vigente. **Es fricción y tripwire, no barrera** (ADR-0009 §3, ADR-0007 capa 1): la barrera es que `.env.keys` no exista en el checkout de los agentes. Matriz de prueba del punto 5 pendiente (`docs/security/verificaciones/`). | VIT-116 (#72), [ADR-0009](../adr/0009-deny-de-lectura-de-secretos-para-agentes.md) |
| Roles de Postgres: `migrator` dueño (solo servicio `migrate`), `app_user` y `host_resolver` sin bypass; `log_connections=on` como señal de uso indebido de `migrator` | [`docker-compose.yml`](../../docker-compose.yml), [`infra/docker/postgres/init/roles.psql`](../../infra/docker/postgres/init/roles.psql) | Vigente | VIT-104 (#41), VIT-107 (#46) |
| Ruleset de `main`: PR obligatorio, 12 checks requeridos, sin force-push, sin bypass | GitHub | **Pendiente** (acción de Cesar, STATUS 11; pasos en [`docs/runbooks/ci.md`](../runbooks/ci.md)). Hasta entonces el control es la disciplina de los agentes (`deny` de `git push origin main*`) | — |
| `security-gate` (veto de Security ligado al head SHA, §2) | CI | **Pendiente** | VIT-149 |
| Origen alcanzable solo vía Cloudflare (túnel en POC; mTLS y allowlist en piloto) | Infra | **Pendiente** | VIT-158 |

## 8. Historial

- **v1.1 · 2026-10-09** (VIT-108, PR #39, revisión del Reviewer): inventario de datos personales alineado con ADR-0005 y ADR-0010 (contacto del comprador, dirección solo con despacho, RUT/razón social/giro solo con factura, medios de pago múltiples solo por portal, retención 24 meses / 6 años / 13 meses / 30 días); §2 describe `security-gate` y deja explícito que el check y el ruleset están pendientes; §7 pasa a tabla con estado por barrera y agrega el deny de ADR-0009, la inmutabilidad de migraciones y las autopruebas de `rls-check`; canal externo con el dominio ya registrado; links Markdown; veredicto de Security sobre ADR-0010.
- **v1.0 · 2026-10-07** (registrado en STATUS ese día; el documento decía 2026-10-08): línea base con principio de aislamiento, inventario provisional (dependía de E1–E3), reglas de logs, índice de threat models, incidentes y barreras.
