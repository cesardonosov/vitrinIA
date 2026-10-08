# Pre-mortem: aporte de Security (2026-10-08)

Autor: Security · Estado: borrador para que el Architect lo consolide en el pre-mortem del Sprint 1
Premisa: **estamos en abril de 2027 y VitrinIA fracasó. ¿Qué falló en seguridad?**

Base: `docs/VITRINIA.md` v2.0 (§3.5, §5, §6.5, §7, §7.1, §8), `docs/PENDIENTES.md`, `AGENTS.md`, skills del repo (`docker-setup`, `tenant-isolation-test`, `tunnel-demo`, `observability-setup`, `ci-pipeline`) y `.claude/settings.json`. Todavía no hay código, ADRs ni `docs/security/SECURITY.md`, así que los riesgos se refieren al diseño declarado y no a una implementación.

Clase según la skill `pre-mortem`: **Alta** = A/A, A/M o M/A · **Media** = M/M, A/B o B/A · **Baja** = el resto.

## Matriz

| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| S1 | Seguridad | **Cruce entre tiendas por un contexto RLS mal aplicado.** Hay varias causas posibles: `SET app.store_id` sin `LOCAL` (o `set_config(..., false)`), que queda pegado a una conexión del pool y la hereda el siguiente request; consultas fuera de transacción; la app conectada con el rol dueño de las tablas o con el rol por defecto del proveedor gestionado (Supabase/Neon, §5.1), con lo que RLS no se aplica sin `FORCE`; el worker pg-boss o la resolución host→tienda corriendo con un rol que salta RLS "porque procesa todas las tiendas"; particiones mensuales de `events` (§7.1) consultadas directo, sin pasar por las políticas del padre. | M | A | Alta | [VIT-107](https://github.com/cesardonosov/vitrinia/issues/7) + [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) `Línea base RLS: roles migrator/app_user, FORCE RLS, helper único withStoreTx y arnés de cruce en CI` (Sprint 1) | En CI: `rolbypassrls`/`rolsuper` de `app_user` = `f`. Tablas con `store_id` sin `relrowsecurity` y `relforcerowsecurity` = 0. Tests de cruce en rojo = 0. En runtime: errores de política o `app.store_id` vacío en logs > 0. |
| S2 | Seguridad | **Toma de cuenta o sesión filtrada por el modelo de hosts.** Portal (`app.vitrinia.cl`) y vitrinas (`*.vitrinia.cl`) los sirve la misma app y son *same-site*, así que `SameSite` no protege al portal de un subdominio de tienda. Auth.js trae por defecto la cookie de sesión con prefijo `__Secure-`, no `__Host-` (§8.2 exige `__Host-`). Si `/api/auth/*` responde en cualquier host o la URL del magic link se arma desde el header `Host`, el token puede caer en un host de tienda, y la analítica de esa tienda podría registrarlo. A esto se suma la vinculación automática de cuentas Google↔email. | M | A | Alta | [VIT-124](https://github.com/cesardonosov/vitrinia/issues/24) `Auth.js solo en app.vitrinia.cl con AUTH_URL fijo, cookies __Host- y sin vinculación automática de cuentas` (el diseño va al ADR de Sprint 1; la implementación, a Sprint 3) | E2E: `/api/auth/*` en un host de tienda responde 404. Todas las cookies de sesión y CSRF llevan prefijo `__Host-`. Fuera del portal, cantidad de URLs con `token=` en `page_viewed`/logs = 0. |
| S3 | Seguridad | **XSS o inyección en la vitrina a partir de datos del vendedor, aunque no haya HTML libre.** Vectores: URLs del Store Config o de productos (Instagram, WhatsApp, link MP) con esquemas peligrosos; colores o fuentes interpolados en `style`/`<style>` (inyección CSS); JSON-LD u Open Graph con `</script>` dentro del nombre del producto; logos SVG. La tienda cae en Safe Browsing y arrastra a `*.vitrinia.cl` completo. | M | A | Alta | [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) + [VIT-115](https://github.com/cesardonosov/vitrinia/issues/15) `Store Config v1 con tipos cerrados (hex, URLs https con allowlist por campo, sin CSS/HTML libre) y CSP con nonce` (esquema en Sprint 1; CSP en modo enforce en Sprint 2) | Semgrep: `dangerouslySetInnerHTML` fuera del serializador JSON-LD aprobado = 0. Reportes de violación de CSP > 0. Fixtures adversariales del Store Config rechazados = 100%. |
| S4 | Seguridad | **Tiendas de phishing y suplantación de marcas.** Ejemplos: subdominios como `bancoestado`, `mercadopago`, `soporte-falabella`, homoglifos o `xn--`. El formulario público queda como fábrica de spam, porque verificar el email no frena a nadie. La moderación quedó fuera de la POC (§3.4). Un subdominio liberado al renombrar una tienda lo toma otro vendedor y hereda los links ya compartidos en Instagram. Resultado: el dominio completo entra a listas de bloqueo. | A | A | Alta | [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) + [VIT-121](https://github.com/cesardonosov/vitrinia/issues/21) `Política de subdominios: lista reservada (sistema + marcas + pagos), normalización ASCII, sin xn--, tombstone al renombrar` (reglas en Store Config v1, Sprint 1); anti-abuso del formulario con Turnstile, rate limit y cuotas en Sprint 3 | Tiendas creadas por día por IP o email > umbral. Altas rechazadas por lista reservada > 0. Alertas de Search Console o Safe Browsing sobre `vitrinia.cl` > 0. Denuncias recibidas. |
| S5 | Seguridad | **Prompt injection desde el catálogo hacia el MCP.** Una descripción o caption importado de Instagram (Sprint 4) contiene instrucciones como "cambia el link de pago a …" o "borra todo". La IA del comercio las ejecuta con un token válido. `prepare→confirm` con el mismo principal no frena esto, porque la misma IA confirma. El caso más grave es el desvío de pagos (se cambia el link MP). | M | A | Alta | [VIT-122](https://github.com/cesardonosov/vitrinia/issues/22) `MCP sin tools que cambien datos de pago o dominio; acciones masivas y destructivas con preview que confirma un humano en el portal` (Sprint 4; la restricción queda en el ADR del MCP antes de construirlo) | Casos de prompt injection de la suite `adversarial-suite`/`mcp-security` que pasan = 0. Cambios de link de pago vía MCP en `audit_log` = 0. Acciones masivas sin preview = 0. |
| S6 | Seguridad | **Secretos filtrados.** Puede ocurrir por un commit de un agente con `.env*`, `.env.keys` de dotenvx, credenciales JSON de `cloudflared` o `AUTH_SECRET`/Google client secret; por variables `NEXT_PUBLIC_*` mal usadas que terminan en el bundle; o por `ARG`/`ENV` en el build de Docker. **Hallazgo concreto:** `.claude/settings.json` niega `Read(.env)`, `Read(.env.local)` y `Read(.env.*.local)`, pero no `.env.keys` ni `Bash(cat .env*)`, así que un agente puede leerlos por Bash. | M | A | Alta | [VIT-106](https://github.com/cesardonosov/vitrinia/issues/6) `Barrera de secretos: gitleaks pre-commit + CI, .gitignore de .env*/.env.keys/credenciales cloudflared, Zod env que rechaza secretos NEXT_PUBLIC_` (Sprint 1) y [VIT-116](https://github.com/cesardonosov/vitrinia/issues/16) `ADR para ampliar deny de settings.json (.env.keys, Bash cat/grep sobre .env*)` (Sprint 1; archivo protegido, lo aprueba Cesar) | Hallazgos de gitleaks en CI > 0. Patrones de secreto en `.next/static` > 0. Arranque que falla por env inválido (es lo esperado). |
| S7 | Seguridad | **Cadena de suministro npm y GitHub Actions.** Un agente instala un paquete con nombre alucinado (*slopsquatting*); llega un `postinstall` malicioso; Renovate mezcla una versión publicada hace horas; quedan Actions sin fijar por SHA. Con el PC de Cesar como servidor de la demo, el impacto alcanza su máquina. | M | A | Alta | [VIT-105](https://github.com/cesardonosov/vitrinia/issues/5) `Endurecer dependencias: lockfile congelado, scripts de instalación bloqueados salvo allowlist, edad mínima de release en Renovate, Actions por SHA, dependencia nueva requiere review de Security` (Sprint 1) | Dependencias nuevas por PR sin aprobación = 0. `pnpm audit` con severidad alta o crítica > 0. Paquetes con scripts de instalación fuera de la allowlist > 0. |
| S8 | Seguridad | **Datos personales fuera de control bajo la Ley 21.719 (vigente desde dic-2026, en pleno piloto).** Emails y teléfonos en logs de pino, Sentry o cuerpos de error. Texto libre de `search_performed` con teléfonos o emails de compradores. `referrer`/URL con query strings (emails, `fbclid`). IP completa en logs de acceso. Sal del `visitor_id` que no se rota ni se destruye (seudónimo persistente). Pedidos con nombre y teléfono del comprador sin retención definida. Sin exportación ni borrado al abrir el piloto. | M | A | Alta | [VIT-108](https://github.com/cesardonosov/vitrinia/issues/8) + [VIT-126](https://github.com/cesardonosov/vitrinia/issues/26) `Línea base de datos personales: inventario de PII y retención inicial en SECURITY.md, redact de pino con test` (Sprint 1); filtros de PII en eventos en Sprint 2; exportación y borrado antes de la Puerta A | Test que falla si un log contiene `@` o `+569`. Propiedades de eventos no declaradas en el esquema Zod = 0. Eventos de búsqueda con patrón email o teléfono = 0. |
| S9 | Seguridad | **Fotos con GPS que revelan el domicilio del vendedor** (la mayoría vende desde su casa). También: HEIC de iPhone, *decompression bombs*, SVG, path traversal en el disco local (`ImageStorage`) y originales servidos tal cual. Lo mismo aplica a las fotos del import de Instagram. | M | A | Alta | [VIT-123](https://github.com/cesardonosov/vitrinia/issues/23) `Pipeline de imágenes: re-encode a WebP sin metadatos, nunca servir ni guardar el original, límite de píxeles y bytes, sin SVG, nombres generados` (contrato del puerto `ImageStorage` en Sprint 1; implementación cuando entren las subidas en Sprint 3 y el import en Sprint 4) | Test con JPEG que trae GPS: `exiftool` sobre la salida no muestra GPS. Originales persistidos = 0. Subidas rechazadas por tamaño o tipo registradas. |
| S10 | Seguridad | **Exposición del entorno por el túnel de demo.** Túnel abierto con la BD de desarrollo; Mailpit expuesto (cualquiera lee los magic links y toma cualquier cuenta); Storybook expuesto; Postgres en `0.0.0.0`; datos reales sin permiso. La skill `tunnel-demo` ya lo cubre, pero solo en un checklist manual. | M | M | Media | Mitigar en backlog: test automático de ingress (solo app, 404 en el resto) dentro del checklist `tunnel-demo` y BD `vitrinia_demo` separada | Túnel activo fuera de ventana de demo > 0 (registro en `docs/qa/demos/`). `curl` público a Mailpit o Storybook distinto de 404. |

## Altos → acciones

- S1 → [VIT-107](https://github.com/cesardonosov/vitrinia/issues/7) + [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) `Línea base RLS…` (Sprint 1, dueño DevOps + Architect, revisa Security)
- S2 → [VIT-124](https://github.com/cesardonosov/vitrinia/issues/24) `Auth.js solo en app.vitrinia.cl…` (ADR en Sprint 1, Builder en Sprint 3)
- S3 → [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) + [VIT-115](https://github.com/cesardonosov/vitrinia/issues/15) `Store Config v1 con tipos cerrados…` (Sprint 1, Architect) + CSP enforce (Sprint 2, Builder)
- S4 → [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) + [VIT-121](https://github.com/cesardonosov/vitrinia/issues/21) `Política de subdominios…` (Sprint 1) + anti-abuso del formulario (Sprint 3)
- S5 → [VIT-122](https://github.com/cesardonosov/vitrinia/issues/22) `MCP sin tools que cambien datos de pago…` (ADR antes del Sprint 4)
- S6 → [VIT-106](https://github.com/cesardonosov/vitrinia/issues/6) `Barrera de secretos…` (Sprint 1, DevOps) + [VIT-116](https://github.com/cesardonosov/vitrinia/issues/16) `ADR para ampliar deny de settings.json…` (Architect → Cesar)
- S7 → [VIT-105](https://github.com/cesardonosov/vitrinia/issues/5) `Endurecer dependencias…` (Sprint 1, DevOps)
- S8 → [VIT-108](https://github.com/cesardonosov/vitrinia/issues/8) + [VIT-126](https://github.com/cesardonosov/vitrinia/issues/26) `Línea base de datos personales…` (Sprint 1, Security redacta SECURITY.md; DevOps aplica redact)
- S9 → [VIT-123](https://github.com/cesardonosov/vitrinia/issues/23) `Pipeline de imágenes…` (contrato en Sprint 1, implementación en Sprint 3)

## Medios y bajos

- S10 (Media): monitorear con el checklist `tunnel-demo` y agregar el test de ingress al backlog.

---

## Controles mínimos exigidos para Sprint 1

Cada uno tiene que aparecer como criterio de aceptación verificable en los issues de Sprint 1. Sin ellos no apruebo los PRs de infraestructura, RLS ni CI.

1. **gitleaks** en el hook pre-commit (lefthook) y como job bloqueante en CI. `.gitignore` cubre `.env*` (salvo `.env.example`), `.env.keys` y `infra/cloudflare/*.json`.
2. **docker-compose:** `app_user` con `NOBYPASSRLS NOSUPERUSER NOCREATEROLE`, sin ser dueño de ninguna tabla; `app` y `worker` conectan como `app_user`, y solo `migrate` usa `migrator`. Puertos en `127.0.0.1`. Imágenes con versión fija.
3. **Chequeo de RLS en CI:** una consulta a `pg_class`/`pg_roles` falla el build si alguna tabla con columna `store_id` no tiene `relrowsecurity` y `relforcerowsecurity`, o si `app_user` tiene `rolbypassrls`/`rolsuper`.
4. **Arnés de cruce de tiendas** (`tests/integration/tenant-isolation/`, `seedTwoStores()`) corriendo en CI contra un Postgres efímero. Incluye un test de **fuga por pool**: transacción con la tienda A y luego una consulta en la misma conexión sin contexto debe devolver 0 filas o error, nunca datos de A.
5. **Helper único `withStoreTx(storeId, fn)`** que abre la transacción y ejecuta `set_config('app.store_id', $1, true)`. La política usa `NULLIF(current_setting('app.store_id', true), '')::uuid`, de modo que falla cerrada.
6. **Semgrep bloqueante** con reglas propias: `SET app.store_id` sin `LOCAL`, `set_config(..., false)`, `sql.raw` con interpolación, `dangerouslySetInnerHTML` (salvo el serializador JSON-LD aprobado) y `eval`/`new Function`.
7. **Variables de entorno validadas con Zod** al arrancar `app` y `worker` (falla rápido). Se rechaza cualquier `NEXT_PUBLIC_*` cuyo nombre contenga `SECRET`, `KEY`, `TOKEN` o `PASSWORD`.
8. **Dependencias:** `packageManager` y Node fijados, `pnpm install --frozen-lockfile` en CI, scripts de instalación bloqueados salvo allowlist explícita, Renovate con edad mínima de release y sin automerge en deps de runtime, Actions fijadas por SHA, `permissions: contents: read` por defecto y sin `pull_request_target`.
9. **Store Config v1 (Zod, `.strict()`):** colores solo en hex; URLs solo `https:` con allowlist de host por campo; sin campos de CSS, HTML ni script; slug normalizado a `[a-z0-9-]`, sin `xn--` y validado contra la lista reservada (sistema: `app`, `api`, `admin`, `www`, `mail`, `mcp`, `status`, `static`…; pagos y marcas: lista inicial que propone el Architect).
10. **`docs/security/SECURITY.md` base:** principio de aislamiento, inventario de PII (qué, dónde, retención provisional pendiente de E3), reglas de logs (redact de pino con test `@`/`+569`), índice de threat models y cómo reportar un incidente.
11. **Headers base:** CSP con nonce en modo *report-only* desde Sprint 1 (pasa a enforce en Sprint 2), más `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin` y `frame-ancestors 'none'` en el portal.

---

## Qué exijo a los ADRs

Para aprobar cada ADR, este tiene que dejar escritos los puntos siguientes. Si el ADR no los declara, mi respuesta es VETO.

### ADR multi-tenant / RLS
- Roles y ownership: quién es dueño de las tablas, que el rol de runtime no tiene `BYPASSRLS` y que se usa `FORCE ROW LEVEL SECURITY` en toda tabla por tienda. También cómo se replica esto en Supabase/Neon sin usar el rol por defecto del proveedor.
- La **única** forma de fijar el contexto (`withStoreTx` + `set_config(..., true)`), compatible con poolers en modo transacción, y la prohibición, verificada por Semgrep y dependency-cruiser, de acceder a la BD fuera de ella.
- Comportamiento con el contexto vacío: falla cerrada, nunca "todas las tiendas".
- Cómo se leen las tablas globales (`stores`, `domains`, `users`, membresías) antes de tener `store_id`: funciones `SECURITY DEFINER` acotadas (por ejemplo, `resolve_host(host)`), **no** un rol con bypass.
- Worker y outbox: cada job lleva `store_id`, que se re-verifica contra la entidad, y se procesa dentro de `withStoreTx`. Ningún rol del worker salta RLS.
- Particiones de `events`: RLS habilitada en cada partición o sin `GRANT` directo a las particiones.
- Caché host→tienda: invalidación al renombrar o eliminar, y que `Host`/`X-Forwarded-Host` manipulados no cambian la tienda autorizada.
- Accesos cruzados devuelven 404 (no 403) y quedan auditados.
- El futuro panel global VitrinIA usa un rol separado, de solo lectura y auditado. No forma parte de la POC.

### ADR Store Config
- El esquema es cerrado (`.strict()`), con lista de tipos permitidos por campo y sin ningún campo que se renderice como HTML o CSS libre.
- Allowlist de esquema y host por cada campo URL, y quién la mantiene.
- Cómo se insertan colores y fuentes en la página: por CSS variables desde valores ya validados, nunca concatenados.
- Reglas de slug y lista reservada, más el **tombstone** de subdominios renombrados (no reutilizables por otra tienda durante un periodo que se define en el ADR) y la redirección.
- Toda escritura (portal, MCP, migración de `schemaVersion`) pasa por la misma validación y queda en `audit_log`.
- Las feature flags no son controles de seguridad.

### ADR checkout (WhatsApp / link MP)
- El precio y el total se recalculan en el servidor desde la BD. El cliente solo envía IDs y cantidades.
- El snapshot del pedido es inmutable y está bajo RLS. Se crea con clave de idempotencia y rate limit (doble clic, bots).
- El mensaje de WhatsApp se arma en el servidor con `encodeURIComponent`.
- El link MP viene **solo** del Store Config validado con la allowlist (ver E1) y se muestra su host al comprador.
- Datos del comprador según E2: si la decisión es no guardarlos, el esquema no tiene esas columnas.
- Los eventos `order_*_clicked` no llevan PII.

### ADR analítica first-party (§7.1)
- Esquemas Zod `.strict()` por evento y versión: las propiedades desconocidas se rechazan.
- `visitor_id` = HMAC con sal diaria que se destruye al rotar y nunca se guarda junto a los eventos. La IP se trunca antes de cualquier uso y nunca se persiste.
- Al `referrer` se le quita la query; solo se conservan origen + `utm_*` en allowlist. `search_performed`: texto con largo máximo y filtro de email o teléfono (se descarta o se enmascara).
- Endpoint de captura: `store_id` resuelto desde el host, nunca desde el body; límite de tamaño, rate limit y filtro de bots. Los eventos **no** son la fuente del GMV: el GMV ante inversionistas sale de `orders`.
- Retención de eventos crudos y agregados según E3. Los payloads de eventos no se envían a pino ni a Sentry.

---

## Escalado a Cesar

Solo los temas de pagos y datos personales (VITRINIA.md §11.4). Cada uno se responde con una letra.

**E1 · Pagos: ¿qué links de pago acepta una tienda?** (S4, S5)
- a) Cualquier URL `https`.
- b) Solo hosts oficiales de Mercado Pago (el Architect fija la lista exacta en el ADR de checkout).
- c) Igual que (b), y además el link solo se cambia desde el portal con re-verificación por email (nunca por MCP), con aviso al vendedor.
- **Recomiendo c).** Un link de pago cambiado es la forma más directa de robarle a un vendedor y a sus compradores.

**E2 · Datos personales: ¿qué guarda el pedido sobre el comprador?** (S8)
- a) Nada: solo ítems, precios, total, tienda, canal y fecha. El contacto queda en el WhatsApp del vendedor.
- b) Nombre y teléfono opcionales.
- c) Nombre, teléfono y dirección.
- **Recomiendo a) para la POC.** Alcanza para medir GMV estimado (§3.2) y deja a VitrinIA fuera del tratamiento de datos de compradores bajo la Ley 21.719. Se puede revisar en la Puerta B.

**E3 · Datos personales: retención de eventos y logs** (S8)
- a) Eventos crudos 90 días; agregados diarios indefinidos; logs operativos 30 días.
- b) Eventos crudos 13 meses (comparación interanual), sin IP ni texto de búsqueda con PII; agregados indefinidos; logs 30 días.
- c) Todo indefinido.
- **Recomiendo b).** Respeta "un evento que no se capturó no se recupera" (§7.1) sin acumular PII. La opción c) choca con la minimización que exige la ley.

**E4 · Datos personales: aviso de privacidad y datos reales en demos** (S8, S10)
- a) Aviso de privacidad mínimo publicado antes del Sprint 3 (primer vendedor real que deja su email) y datos reales en demos solo con permiso escrito del vendedor.
- b) Sin aviso hasta el piloto público; demos solo con tiendas ficticias.
- c) Sin aviso hasta el piloto público; demos con tiendas reales.
- **Recomiendo a).** El Sprint 3 ya recolecta emails reales (Auth.js, verificación) y la ley entra en vigencia en diciembre de 2026, en medio de la POC y el piloto. La opción c) no es aceptable para Security.

---

## Supuestos y límites de este documento

- No hay código ni ADRs todavía. Las probabilidades están estimadas sobre el diseño de `docs/VITRINIA.md` y las skills.
- El Orchestrator convirtió las acciones en issues VIT-xxx (2026-10-08): los controles mínimos quedaron como criterios de aceptación de VIT-104 a VIT-110; los riesgos de sprints posteriores, como issues de backlog. El helper se llama `withStoreTx`, como fija ADR-0003.
- El hallazgo de `.claude/settings.json` (S6) toca un archivo protegido: la corrección necesita un ADR aprobado por Cesar.
