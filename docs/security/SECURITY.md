# Seguridad de VitrinIA

- Dueño: Security · Actualizado: 2026-10-08 (Sprint 1, VIT-108) · Estado: **línea base**; se extiende en cada sprint con los threat models que entran.
- Fuente de las reglas: `docs/VITRINIA.md` §8, `AGENTS.md` §9. Si este documento y VITRINIA.md difieren, manda VITRINIA.md y se abre un issue.
- Aquí no hay secretos, hosts internos ni datos personales. Si necesitas ponerlos para explicar algo, estás explicando mal.

## 1. Principio de aislamiento

**Un usuario de la tienda A nunca accede a la tienda B.** "Usuario" incluye al vendedor, al comprador, al worker, a la IA del comercio (MCP) y a cualquier código que corra con credenciales de la app.

Se cumple con tres capas independientes (§8.1), y cada capa tiene su prueba. Si falla una, las otras siguen en pie:

| Capa | Mecanismo | Falla cerrada cuando | Prueba |
|---|---|---|---|
| 1. Base de datos | RLS en toda tabla con `store_id`: `ENABLE` + `FORCE ROW LEVEL SECURITY`, política `store_id = NULLIF(current_setting('app.store_id', true), '')::uuid` en `USING` y `WITH CHECK`. Rol de runtime `app_user` sin `BYPASSRLS`, sin ser dueño. Contexto fijado solo por `withStoreTx(storeId, fn)` con `set_config('app.store_id', $1, true)` dentro de la transacción. | No hay contexto, el contexto no es UUID, la conexión viene del pool, el rol es el equivocado. | `tests/integration/tenant-isolation/db.test.ts` (VIT-109); chequeo de `pg_class`/`pg_roles` en CI (VIT-105). |
| 2. Aplicación | Cada caso de uso recibe `StoreId` (shared kernel) y lo compara con la sesión (portal) o con el host resuelto en el servidor (vitrina). El middleware solo enruta; **nunca autoriza** y ningún caso de uso lee sus headers. Acceso cruzado → 404 (no 403) + `audit_log`. | El `storeId` viene del cuerpo, de la query o de un header. | `use-cases.test.ts`, `http.test.ts`, `mcp.test.ts`, `cache.test.ts` (VIT-120, Sprint 2; MCP en Sprint 4). |
| 3. Evidencia | Suite de cruce `seedTwoStores()` en CI, bloqueante, que se extiende con cada tabla, caso de uso, endpoint y tool. Una tabla con `store_id` sin política hace fallar la suite. | — | Job `integration` de CI; prueba de mutación documentada. |

Reglas derivadas, innegociables:

- Nunca `SET app.store_id` sin `LOCAL`; nunca `set_config(..., false)`; nunca acceso a tablas de tienda fuera de `withStoreTx` (Semgrep + dependency-cruiser).
- Las lecturas sin contexto (host → tienda) pasan por una función `SECURITY DEFINER` acotada (`resolve_host`), nunca por un rol con bypass.
- Cookies de sesión con prefijo `__Host-`; el portal vive en `app.vitrinia.cl` y las vitrinas no comparten cookies con él. Nunca `Domain=.vitrinia.cl`.
- Las vitrinas nunca renderizan HTML ni CSS libre del vendedor; el Store Config es un esquema cerrado.
- Consultas globales (panel VitrinIA) necesitan un rol de solo lectura, auditado y un ADR propio. No existen en la POC.

Detalle, amenazas y controles: `threat-models/tenancy.md`.

## 2. Zonas sensibles y veto

Auth, RLS/tenancy, MCP, secretos, datos personales, pedidos, pagos e infraestructura. Un issue en zona sensible lleva threat model **antes** de que el Builder escriba código, y su PR lleva `security-review` después del Reviewer. Sin APROBADO de Security el PR no se mezcla. Riesgos sobre pagos o datos sensibles se escalan a Cesar con opciones y recomendación (`docs/STATUS.md`).

## 3. Inventario de datos personales (Ley 21.719)

Ley 21.719 vigente desde diciembre de 2026, en pleno piloto. Principios que aplicamos desde el Sprint 1: minimización (no se guarda lo que no se usa), finalidad declarada, retención finita, y exportación/borrado de cuenta antes del piloto público (§8.4).

Retención **provisional**: queda firme cuando Cesar responda E2 (datos del comprador) y E3 (retención de eventos y logs) en `docs/STATUS.md`. Las filas marcadas "según E2/E3" cambian con su respuesta.

| Dato | Titular | Dónde | Finalidad | Entra en | Retención provisional | Control |
|---|---|---|---|---|---|---|
| Email del vendedor | Vendedor | `users` (Auth.js), correo de verificación | Login, verificación, avisos de la tienda | Sprint 3 | Mientras la cuenta exista; 30 días tras el borrado de cuenta | RLS no aplica a `users` (tabla global): acceso solo vía Auth.js y casos de uso de `identity`; nunca en logs. |
| Identificador de Google (`sub`) | Vendedor | `accounts` (Auth.js) | Login con Google | Sprint 3 | Igual que el email | Sin vinculación automática de cuentas por email (VIT-124). |
| Tokens de magic link y de verificación | Vendedor | `verification_tokens` | Login sin contraseña | Sprint 3 | 15 minutos o un solo uso, lo que ocurra primero | Hash en BD; URL nunca en logs ni en eventos de analítica. |
| Nombre de la tienda, WhatsApp del negocio (E.164), redes, link de pago | Vendedor (dato de contacto comercial, público por diseño) | Store Config (`stores`), vitrina pública | Que el comprador contacte y pague al vendedor | Sprint 1 (esquema), Sprint 2 (persistencia) | Mientras la tienda exista; tombstone del subdominio sin datos personales | Bajo RLS; cambio del link de pago según E1; escritura auditada. |
| Fotos de productos | Vendedor (pueden contener GPS del domicilio) | `ImageStorage` (disco local; R2/S3 en producción) | Vitrina | Sprint 3 (subida), Sprint 4 (import) | Mientras exista el producto; borrado del archivo en ≤ 30 días tras eliminar el producto | Re-encode sin metadatos, nunca se guarda el original (VIT-123). |
| Datos del comprador en el pedido | Comprador | `orders` | Registro del pedido (GMV) | Sprint 2 | **Según E2**. Recomendación de Security: ninguno (el contacto queda en el WhatsApp del vendedor). Si Cesar elige guardarlos: 90 días desde el pedido, luego anonimización. | Snapshot inmutable bajo RLS; si E2 = a), el esquema no tiene esas columnas. |
| Mensaje de WhatsApp del pedido | Comprador | No se persiste (se arma en el servidor y se devuelve la URL) | Checkout | Sprint 2 | 0 (no se guarda) | Construido con `encodeURIComponent` desde datos validados; nunca en logs. |
| `visitor_id`, `session_id`, dispositivo, `referrer` sin query, `utm_*` en allowlist | Comprador (seudónimo) | `events` (particionada por mes) | Analítica del vendedor y del negocio | Sprint 2 | **Según E3**. Recomendación: crudos 13 meses, agregados `store_daily_metrics` indefinidos. | `visitor_id = hash(sal diaria ‖ store_id ‖ IP truncada ‖ UA)`; la sal se destruye al rotar; no es enlazable entre días ni tiendas (VIT-125). |
| Dirección IP | Vendedor y comprador | Solo en memoria (rate limit, `visitor_id`); logs de acceso | Anti-abuso | Sprint 2 | Nunca se persiste completa; en logs, truncada (/24 IPv4, /48 IPv6) y según retención de logs | Regla de logs §4; test de redact. |
| Texto de búsqueda (`search_performed`) | Comprador (puede contener email o teléfono) | `events.properties` | Analítica | Sprint 2 | Igual que eventos; largo máximo | Filtro de patrón email/teléfono antes de persistir (descartar o enmascarar). |
| `actor_id` y acción en `audit_log` | Vendedor | `audit_log` append-only | Trazabilidad de cambios y de intentos de cruce | Sprint 2 | Vida de la tienda + 12 meses | Solo IDs y nombres de acción; nunca payload con PII. |
| Respaldos de Postgres | Todos | Volumen local (POC); almacenamiento del proveedor (piloto) | Recuperación | Sprint 2 (VIT-118) | 30 días; cifrados en reposo cuando salgan del PC de Cesar | Mismo tratamiento que el dato original; restauración probada. |
| Mailpit (local) | Vendedor de prueba | Contenedor local | Desarrollo | Sprint 1 | Volátil; nunca expuesto por el túnel | Checklist `tunnel-demo`. |

Fuera de inventario por diseño: no hay cookies de rastreo, no hay terceros de analítica, VitrinIA no toca fondos ni guarda datos de tarjetas (§2.3), no hay dirección del comprador salvo decisión E2 = c), que Security no recomienda.

Pendientes antes del piloto público (§8.4): aviso de privacidad (E4), exportación y borrado de cuenta del vendedor, procedimiento de respuesta a solicitudes de titulares, confirmación legal de plazos y del deber de notificar brechas.

## 4. Reglas de logs

Aplican a pino, Sentry, salida de consola, cuerpos de error, mensajes de excepción, `audit_log` y reportes de CSP. Test obligatorio (VIT-126): la suite de logs falla si una línea contiene `@` o `+569` fuera de la allowlist de pruebas.

Nunca se registra:

- Emails, teléfonos, nombres de compradores, direcciones.
- Tokens, cookies, headers `Authorization`/`Cookie`/`Set-Cookie`, magic links, URLs con `token=`, `code=` o similares, claves de API, `DATABASE_URL`.
- IP completa (se trunca antes de loguear).
- Cuerpos de request/response ni filas de BD. En un error de RLS o de validación se loguea el nombre de la tabla/campo y el código, no el valor.
- Payloads de eventos de analítica (van a `events`, no a pino ni a Sentry).
- Contenido del catálogo (descripciones, captions importados): es contenido no confiable y puede contener instrucciones o PII.
- Valores de variables de entorno al arrancar (VIT-106 AC6).

Siempre se registra, en formato estructurado:

- `request_id`, `store_id` (UUID, no es PII), `actor_id` (UUID de usuario), ruta sin query, método, status, duración.
- Eventos de seguridad con nombre fijo: `security.tenant_mismatch` (sesión A pide B), `security.rls_denied` (error de política o contexto vacío), `security.host_unresolved`, `security.rate_limited`, `security.upload_rejected`, `security.csp_violation`. Son la señal temprana de los riesgos del pre-mortem; se cuentan como métrica.

Mecánica: pino con `redact` sobre las rutas conocidas (`req.headers.authorization`, `req.headers.cookie`, `*.email`, `*.phone`, `*.token`, `*.password`) **más** un serializador que enmascara patrones de email y teléfono chileno en cualquier string; `beforeSend` de Sentry con la misma función. Retención de logs: según E3 (recomendación: 30 días). Nivel por defecto `info` en producción; `debug` nunca se activa contra datos reales.

## 5. Índice de threat models

| Feature | Archivo | Issue | Estado | Sprint |
|---|---|---|---|---|
| Aislamiento entre tiendas (tenancy, RLS, host, cookies) | `threat-models/tenancy.md` | VIT-108 | Vigente v1 | 1 |
| Pedidos y link de pago (checkout) | `threat-models/checkout.md` | VIT-127 | Pendiente (depende de E1, E2) | 2 |
| Analítica first-party (re-identificación, retención, abuso del endpoint) | `threat-models/analytics.md` | VIT-125 | Pendiente (depende de E3) | 2 |
| Auth.js, cookies y onboarding anti-abuso | `threat-models/auth.md` | VIT-124, VIT-121 | Pendiente | 3 |
| Pipeline de imágenes (EXIF, tipo real, tamaño) | `threat-models/images.md` | VIT-123 | Pendiente | 3 |
| MCP (scopes, prepare→confirm, prompt injection, link de pago) | `threat-models/mcp.md` | VIT-122 | Pendiente | 4 |

Un threat model se escribe antes del código del issue (skill `threat-model`), vive en `docs/security/threat-models/<feature>.md`, y sus controles entran como criterios de aceptación en los issues. Cuando una feature cambia (nuevo proveedor, nueva tool, nuevo rol), el threat model se versiona; no se reescribe el historial.

Documentos relacionados: `pre-mortem-security-2026-10-08.md` (riesgos S1–S10, controles mínimos del Sprint 1, exigencias a los ADRs, escalados E1–E4).

## 6. Cómo reportar un incidente o una vulnerabilidad

Un incidente es cualquier sospecha de: acceso a datos de otra tienda, secreto expuesto (commit, log, túnel), cuenta tomada, tienda de phishing bajo `*.vitrinia.cl`, dependencia comprometida, o pérdida de datos.

**Quién puede reportar:** cualquier agente, Cesar, un vendedor o un tercero.

**Canal interno (agentes y Cesar):**

1. Crear un issue en `cesardonosov/vitrinia` con título `[SEC] <resumen sin detalles explotables>`, etiqueta `security`, prioridad P0, asignado a Security y mencionando a Cesar. El issue **no** contiene secretos, tokens, datos personales ni pasos de explotación completos; eso se entrega a Cesar por el canal privado que él indique.
2. Si el incidente involucra un secreto: rotarlo primero, reportar después. La rotación no espera aprobación.
3. Si hay un túnel de demo abierto: cerrarlo (`tunnel-demo`) antes de investigar.
4. Si hay sospecha de cruce entre tiendas: escribir primero el test que lo reproduce (`tenant-isolation-test`), después el arreglo. Ningún arreglo de aislamiento se mezcla sin su test.

**Canal externo (vendedores y terceros):** pendiente de que exista el dominio y el correo. Hasta entonces, el contacto es el de Cesar como Product Owner; cuando `vitrinia.cl` esté delegado, se publica una dirección dedicada y una política de divulgación responsable en este archivo (acción de Cesar registrada en `docs/STATUS.md`).

**Severidad y respuesta inicial:**

| Severidad | Ejemplo | Primera acción | Quién decide |
|---|---|---|---|
| Crítica | Datos de una tienda vistos por otra; `migrator` o `AUTH_SECRET` expuestos; link de pago alterado | Contener (rotar, cerrar túnel, despublicar), test que reproduce, aviso a Cesar el mismo día | Cesar |
| Alta | Vulnerabilidad explotable sin evidencia de explotación; dependencia con CVE alta en runtime | Issue P0, parche o mitigación antes de la siguiente demo | Security |
| Media | Hallazgo de Semgrep/gitleaks en PR, header faltante, log con PII en desarrollo | Issue con fecha, bloquea el PR afectado | Security |
| Baja | Mejora de hardening | Backlog | Security |

**Datos personales:** si el incidente afecta datos de vendedores o compradores, la Ley 21.719 obliga a notificar a la Agencia de Protección de Datos Personales y, según el caso, a los titulares. Plazos, formato y responsable se confirman con asesoría legal antes del piloto público (pendiente E4); hasta entonces, toda brecha con datos personales se escala a Cesar como Crítica y se documenta en `docs/security/incidents/<fecha>-<slug>.md` (post-mortem sin culpas: qué pasó, qué datos, qué se hizo, qué test lo impide ahora).

## 7. Barreras automáticas (resumen)

| Barrera | Dónde | Issue |
|---|---|---|
| gitleaks | lefthook pre-commit y CI | VIT-106, VIT-105 |
| Semgrep con reglas propias (`SET` sin `LOCAL`, `set_config(..., false)`, `sql.raw`, `dangerouslySetInnerHTML`, `eval`) | CI | VIT-105 |
| Chequeo de RLS (`pg_class`, `pg_roles`) | CI | VIT-105 |
| Suite de cruce entre tiendas | CI, `tests/integration/tenant-isolation/` | VIT-109 |
| dependency-cruiser (capas; acceso a BD solo desde `infrastructure/`) | CI | VIT-103 |
| Variables de entorno con Zod, `NEXT_PUBLIC_*` sin secretos | Arranque de app y worker | VIT-106 |
| Dependencias: lockfile congelado, scripts bloqueados, Actions por SHA, Renovate con edad mínima | CI | VIT-105 |
| Headers y CSP con nonce (report-only → enforce en Sprint 2) | App | VIT-115 |
| Branch protection en `main` | GitHub | VIT-105 |
