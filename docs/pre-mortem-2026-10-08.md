# Pre-mortem — Sprint 1 "Fundaciones y marca" / inicio de la POC (2026-10-08)

Premisa: estamos en **abril de 2027** y VitrinIA fracasó. ¿Por qué?

- Facilita: Architect. Filas de Seguridad: Architect, complementadas por el aporte de Security en [`security/pre-mortem-security-2026-10-08.md`](security/pre-mortem-security-2026-10-08.md) (ver sección "Aporte de Security").
- Fuentes: `docs/VITRINIA.md` (v2.0), `docs/PENDIENTES.md`, `.claude/settings.json`, ADR-0001 a ADR-0007 (todos en estado Propuesto).
- No existen aún `docs/producto/COMPETENCIA.md`, `docs/security/SECURITY.md` ni pre-mortems previos; este es el primero.
- Clase: Alta = A/A, A/M o M/A · Media = M/M, A/B o B/A · Baja = resto.
- Las acciones apuntan a issues VIT-xxx creados por el Orchestrator el 2026-10-08 (Sprint 1 o backlog con sprint objetivo).

## Matriz

### Técnico

| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| T1 | Técnico | RLS anulada por el pool de conexiones: un `SET` sin `LOCAL`, o una consulta fuera de transacción, deja `app.store_id` de la request anterior en la conexión reutilizada y la siguiente request lee datos de otra tienda | M | A | Alta | ADR-0003 + [VIT-107](https://github.com/cesardonosov/vitrinia/issues/7) + [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) Helper único withStoreTx con set_config local y test de cruce con pool de 1 conexión | Test de cruce con pool de tamaño 1 en CI en verde; nº de accesos a tablas con `store_id` fuera de `withStoreTx` (regla dependency-cruiser/Semgrep) = 0 |
| T2 | Técnico | Un cambio de Store Config sin migración de `schemaVersion` rompe las vitrinas ya creadas (configs que dejan de validar con Zod), o se edita una migración Drizzle ya aplicada | M | A | Alta | ADR-0004 + [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) Migraciones de Store Config con fixtures de todas las versiones en CI | Configs que fallan validación al cargar (contador en logs) > 0; PR que modifica archivo existente en `drizzle/migrations/` |
| T3 | Técnico | El outbox/worker pierde eventos de analítica o pedidos (worker caído sin alerta, sin reintentos, sin idempotencia); §7.1: "un evento que no se capturó no se recupera" | M | A | Alta | ADR-0006 + [VIT-117](https://github.com/cesardonosov/vitrinia/issues/17) Outbox idempotente con reintentos, dead-letter y alerta de backlog | Edad del registro pendiente más antiguo en outbox > 5 min; beacons aceptados por el endpoint ≠ filas en `events` del día |
| T4 | Técnico | Las tiendas reales de la POC viven en el Postgres local del PC de Cesar (Docker); se pierde el volumen (`docker compose down -v`, falla de disco) y no hay respaldo restaurado nunca | M | A | Alta | [VIT-118](https://github.com/cesardonosov/vitrinia/issues/18) Respaldo local de Postgres con restauración probada antes de la primera tienda real | Días desde la última restauración probada > 7 mientras existan tiendas reales |
| T5 | Técnico | `vitrinia.cl` sigue sin registrar: sin zona en Cloudflare no hay DNS comodín ni túnel con nombre, y el multi-tenant por host no se puede demostrar en el celular de un vendedor ni ante inversionistas | M | A | Alta | Acción de Cesar: registrar vitrinia.cl y delegar DNS a Cloudflare (en `docs/STATUS.md`) | Dominio no registrado al cerrar el Sprint 1 |
| T6 | Técnico | El túnel o el PC fallan durante la demo de la Puerta A (corte de internet, PC suspendido, túnel caído) | M | A | Alta | [VIT-119](https://github.com/cesardonosov/vitrinia/issues/19) Runbook de demo con túnel, ensayo completo y plan B grabado | Ensayo de demo completo fallido o no realizado 48 h antes de la demo |
| T7 | Técnico | Caché host→tienda desactualizada sirve una tienda despublicada o renombrada (o la tienda equivocada tras reasignar un subdominio) | B | A | Media | ADR-0003 (invalidación explícita desde el caso de uso, TTL corto) | Respuestas servidas desde caché para tiendas con `published=false` > 0 |
| T8 | Técnico | Deuda: `TODO(VIT-xxx)` crecientes, PRs grandes de agentes y CI lento o inestable que la gente empieza a saltarse | M | M | Media | Backlog: conteo y tendencia en sprint-close; presupuesto de tiempo de CI | Tendencia de TODO(VIT-xxx) creciente 2 sprints seguidos; CI > 15 min |

### Seguridad

| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| S1 | Seguridad | Cruce entre tiendas porque un caso de uso confía en el `store_id` puesto por el middleware (header) en vez de derivarlo de la sesión; hay antecedentes de bypass de middleware en Next.js (2025) | M | A | Alta | ADR-0003 + [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) + [VIT-120](https://github.com/cesardonosov/vitrinia/issues/20) Tests de cruce de tiendas por capa (BD, caso de uso, endpoint) en CI | Regla Semgrep "header del middleware usado en autorización" con 0 hallazgos; test de cruce por capa presente en cada módulo con datos por tienda |
| S2 | Seguridad | Abuso del formulario público "Pide tu tienda": tiendas de phishing o estafa bajo `*.vitrinia.cl` que llevan el dominio completo a listas negras (Safe Browsing) y matan todas las vitrinas | M | A | Alta | [VIT-121](https://github.com/cesardonosov/vitrinia/issues/21) Anti-abuso de Pide tu tienda (Turnstile, rate limit, cuotas, publicación tras verificar email) + moderación escalada a Cesar | Tiendas creadas por IP/hora > umbral; tiendas creadas sin email verificado > 0 publicadas; alerta de Safe Browsing |
| S3 | Seguridad | Prompt injection vía catálogo: la descripción de un producto contiene instrucciones y la IA del comercio ejecuta por MCP cambios masivos o destructivos | M | A | Alta | [VIT-122](https://github.com/cesardonosov/vitrinia/issues/22) Threat-model del MCP y confirmación prepare/confirm con mismo principal | Tests adversariales de inyección en CI; acciones destructivas ejecutadas sin `confirm` = 0 en audit log |
| S4 | Seguridad | EXIF con GPS en fotos subidas filtra el domicilio del vendedor (muchos venden desde su casa) | M | A | Alta | [VIT-123](https://github.com/cesardonosov/vitrinia/issues/23) Pipeline de imágenes con validación de tipo real y borrado de EXIF | Test que sube JPEG con GPS y verifica salida sin metadatos, en verde |
| S5 | Seguridad | Datos personales (vendedor y comprador) recolectados sin minimización ni retención; la Ley 21.719 rige desde dic-2026, en pleno piloto | M | A | Alta | [VIT-108](https://github.com/cesardonosov/vitrinia/issues/8) + [VIT-125](https://github.com/cesardonosov/vitrinia/issues/25) Política de minimización, retención y borrado de datos personales (Sprint 1, §8.4) + escalado a Cesar | Campos con datos personales en el modelo de datos sin clasificación ni plazo de retención > 0; PII detectada en logs > 0 |
| S6 | Seguridad | Sesión del portal expuesta a una vitrina (subdominio hermano) por cookie con `Domain=.vitrinia.cl` o *cookie tossing* | B | A | Media | ADR-0003 (cookies `__Host-`, portal en host propio) | Test E2E que verifica atributos de cookies en cada respuesta |
| S7 | Seguridad | Token MCP del vendedor filtrado (queda en texto plano en la config de Claude Desktop) o magic link reenviado; secuestro de la tienda | B | A | Media | Mitigación en threat-model MCP: scopes, expiración, revocación, rate limit | Uso de un mismo token desde > N IPs/día |
| S8 | Seguridad | Secreto commiteado por un agente; los `deny` de `.claude/settings.json` son patrones evitables (p. ej. `git push origin HEAD:main`, `cat .env`), así que la barrera real debe ser branch protection + gitleaks | M | M | Media | ADR-0007 (guardrails en capas) + backlog DevOps | Hallazgos de gitleaks en CI > 0; branch protection de `main` no activa al cerrar Sprint 1 |

### Producto

| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| P1 | Producto | El vendedor no termina el onboarding en < 15 min (criterio de la Puerta A) porque el formulario pide demasiado o las fotos tardan | M | A | Alta | [VIT-129](https://github.com/cesardonosov/vitrinia/issues/29) Prueba cronometrada del onboarding con un vendedor real al cierre del Sprint 3 | Mediana de tiempo de onboarding en prueba > 15 min; abandono por paso > 30 % |
| P2 | Producto | Las vitrinas parecen plantilla: con 2 presets y sin análisis de URL de referencia (fuera de la POC), la promesa "diseñada desde tu Instagram" no se ve en la demo | A | M | Alta | [VIT-128](https://github.com/cesardonosov/vitrinia/issues/28) Validar presets 1 y 2 con 3 vendedores reales antes de la demo | < 2 de 3 vendedores dicen "se ve profesional" al ver su tienda en el celular |
| P3 | Producto | Scope creep: 4 sprints de 1 semana con onboarding, portal, MCP e import de Instagram; se llega a la demo con todo a medias | A | M | Alta | ADR-0002 + escalado a Cesar (scope) | Al día 4 de un sprint, < 60 % de los issues del sprint en review o cerrados |
| P4 | Producto | Los vendedores no cambian: ya usan catálogo de WhatsApp, Take App o Kyte y no ven razón para mover el link de su bio | M | A | Alta | [VIT-130](https://github.com/cesardonosov/vitrinia/issues/30) Entrevistas de validación con 5 vendedores (pendiente de PENDIENTES §3) + escalado a Cesar | Tiendas creadas que no ponen el link en su bio en 7 días > 50 % |
| P5 | Producto | El "GMV estimado" no es creíble: un clic en WhatsApp no es una venta y los inversionistas descuentan la métrica | A | M | Alta | ADR-0005 + [VIT-127](https://github.com/cesardonosov/vitrinia/issues/27) Definir métrica GMV estimado y confirmación de pedido por el vendedor | Pedidos sin estado confirmado por el vendedor > 80 % tras 2 semanas de piloto |
| P6 | Producto | Instagram bloquea o cambia el formato del export, y el import (Sprint 4) no funciona | M | M | Media | Backlog: import tratado como opcional (§3.3), detrás de un adaptador | Export de prueba con formato distinto al de los fixtures |
| P7 | Producto | La competencia copia lo visible (MCP, diseño) en semanas; "lo técnico se copia" (§1.1) | A | B | Media | Monitoreo trimestral en `docs/producto/COMPETENCIA.md` (por crear) | Feature equivalente anunciada por un competidor |
| P8 | Producto | Cuello de botella en Cesar: decisiones en "Esperando a Cesar" frenan sprints de 1 semana | M | M | Media | Backlog: preguntas con opciones y recomendación, legibles desde el celular | Ítems en "Esperando a Cesar" con más de 48 h |

### Costo

| ID | Categoría | Riesgo | Prob. | Impacto | Clase | Acción | Señal temprana |
|---|---|---|---|---|---|---|---|
| C1 | Costo | La tabla `events` crece sin retención ni agregación y llena el tier gratis del Postgres gestionado del piloto (Supabase/Neon), forzando plan pago o perdiendo datos | A | M | Alta | ADR-0006 + [VIT-125](https://github.com/cesardonosov/vitrinia/issues/25) Retención, agregación y particionado de eventos aprobados por Security | Crecimiento de `events` en MB/semana proyecta llenar el 50 % del tier en < 3 meses |
| C2 | Costo | Hosting del piloto (Vercel + worker, o Railway) supera USD 50/mes con app + worker + BD + storage | M | M | Media | Decisión D4 de Cesar; app dockerizada (ADR-0001) | Estimación mensual de hosting > USD 35 |
| C3 | Costo | Imágenes del celular (3–8 MB) sin variantes: storage y egress se disparan y la vitrina rompe el presupuesto de LCP | M | M | Media | Variantes WebP con gatillo "primer deploy" (§6.5); límite de tamaño | Peso promedio por imagen servida > 300 KB |
| C4 | Costo | Correos transaccionales (magic link) superan el tier gratis o caen en spam, y el vendedor no puede verificar su email | M | M | Media | Backlog: proveedor con tier gratis y SPF/DKIM/DMARC antes del piloto | Tasa de verificación de email < 70 % de los formularios enviados |
| C5 | Costo | Costo de tokens de 9 agentes (Fable/Opus/Sonnet/Haiku) no presupuestado; no está dentro del techo de OPEX de §2.3 | M | M | Media | Escalado a Cesar (presupuesto); medir gasto por sprint | Gasto semanal de tokens sin registro o creciendo > 30 % por sprint |
| C6 | Costo | Contracargos o problemas de liquidez si se empieza a tocar dinero antes del ledger y `webhook_inbox` | B | A | Media | ADR-0005 (VitrinIA nunca toca fondos en V1) | Cualquier issue que proponga recibir o mover fondos sin ADR aprobado |
| C7 | Costo | Lock-in con servicios propietarios del proveedor de BD (auth o storage de Supabase) encarece la migración posterior | B | M | Baja | Aceptado: puertos y adaptadores (ADR-0001) | Import de SDK del proveedor fuera de `infrastructure/` |
| C8 | Costo | Límites del plan gratuito de Cloudflare (túnel, reglas WAF) | B | B | Baja | Aceptado y registrado | — |

## Altos -> acciones

- T1 -> ADR-0003 / [VIT-107](https://github.com/cesardonosov/vitrinia/issues/7) + [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) Helper único withStoreTx con set_config local y test de cruce con pool de 1 conexión
- T2 -> ADR-0004 / [VIT-110](https://github.com/cesardonosov/vitrinia/issues/10) Migraciones de Store Config con fixtures de todas las versiones en CI
- T3 -> ADR-0006 / [VIT-117](https://github.com/cesardonosov/vitrinia/issues/17) Outbox idempotente con reintentos, dead-letter y alerta de backlog
- T4 -> [VIT-118](https://github.com/cesardonosov/vitrinia/issues/18) Respaldo local de Postgres con restauración probada antes de la primera tienda real
- T5 -> Acción de Cesar: registrar vitrinia.cl y delegar DNS a Cloudflare (en `docs/STATUS.md`)
- T6 -> [VIT-119](https://github.com/cesardonosov/vitrinia/issues/19) Runbook de demo con túnel, ensayo completo y plan B grabado
- S1 -> ADR-0003 / [VIT-109](https://github.com/cesardonosov/vitrinia/issues/9) + [VIT-120](https://github.com/cesardonosov/vitrinia/issues/20) Tests de cruce de tiendas por capa (BD, caso de uso, endpoint) en CI
- S2 -> [VIT-121](https://github.com/cesardonosov/vitrinia/issues/21) Anti-abuso de Pide tu tienda (Turnstile, rate limit, cuotas, publicación tras verificar email)
- S3 -> [VIT-122](https://github.com/cesardonosov/vitrinia/issues/22) Threat-model del MCP y confirmación prepare/confirm con mismo principal
- S4 -> [VIT-123](https://github.com/cesardonosov/vitrinia/issues/23) Pipeline de imágenes con validación de tipo real y borrado de EXIF
- S5 -> [VIT-108](https://github.com/cesardonosov/vitrinia/issues/8) + [VIT-125](https://github.com/cesardonosov/vitrinia/issues/25) Política de minimización, retención y borrado de datos personales
- P1 -> [VIT-129](https://github.com/cesardonosov/vitrinia/issues/29) Prueba cronometrada del onboarding con un vendedor real al cierre del Sprint 3
- P2 -> [VIT-128](https://github.com/cesardonosov/vitrinia/issues/28) Validar presets 1 y 2 con 3 vendedores reales antes de la demo
- P3 -> ADR-0002
- P4 -> [VIT-130](https://github.com/cesardonosov/vitrinia/issues/30) Entrevistas de validación con 5 vendedores
- P5 -> ADR-0005 / [VIT-127](https://github.com/cesardonosov/vitrinia/issues/27) Definir métrica GMV estimado y confirmación de pedido por el vendedor
- C1 -> ADR-0006 / [VIT-125](https://github.com/cesardonosov/vitrinia/issues/25) Retención, agregación y particionado de eventos aprobados por Security

Dueño sugerido y fecha: el Orchestrator asigna rol y sprint al crear cada issue. Prioridad sugerida: T1, S1, S5, T4 y T2 en Sprint 1 (son fundaciones); T3, C1, P5 y S4 en Sprint 2; S2, P1 en Sprint 3; S3, T6 en Sprint 4; T5, P2, P4 dependen de Cesar y deberían resolverse antes del Sprint 2.

## Medios y bajos

- **Medios** (mitigación en backlog y monitoreo): T7, T8, S6, S7, S8, P6, P7, P8, C2, C3, C4, C5, C6. Cada uno tiene su mitigación en la columna "Acción"; se revisan en cada sprint-close.
- **Bajos** (aceptados y registrados): C7, C8.

## Aporte de Security

El agente Security trabajó la categoría por separado: [`docs/security/pre-mortem-security-2026-10-08.md`](security/pre-mortem-security-2026-10-08.md) (S1–S10 de Security, 9 altos y 1 medio). Lo que suma a esta matriz:

- **Nuevos riesgos altos** que no estaban arriba: sesión expuesta entre subdominios por cookies de Auth.js con prefijo `__Secure-` en vez de `__Host-` ([VIT-124](https://github.com/cesardonosov/vitrinia/issues/24)); XSS o inyección CSS/JSON-LD desde el Store Config sin HTML libre ([VIT-110](https://github.com/cesardonosov/vitrinia/issues/10), [VIT-115](https://github.com/cesardonosov/vitrinia/issues/15)); desvío del link de pago por prompt injection en el MCP ([VIT-122](https://github.com/cesardonosov/vitrinia/issues/22)); cadena de suministro npm y Actions ([VIT-105](https://github.com/cesardonosov/vitrinia/issues/5)).
- **Sube S8 a Alta** (secretos): `.claude/settings.json` no niega `.env.keys` ni la lectura de `.env*` por Bash. Archivo protegido: ADR propuesto en [VIT-116](https://github.com/cesardonosov/vitrinia/issues/16), lo aprueba Cesar.
- **11 controles mínimos para Sprint 1**, ya incorporados como criterios de aceptación en VIT-104 a VIT-110.
- **Exigencias a los ADR 0003 a 0006** para aprobarlos (sección "Qué exijo a los ADRs" del aporte).
- **4 decisiones para Cesar** (E1 a E4: links de pago aceptados, datos del comprador, retención, aviso de privacidad), copiadas a `docs/STATUS.md`.

## Escalado a Cesar

Solo decisiones que le corresponden según VITRINIA.md §11.4. El Orchestrator debe copiarlas a `docs/STATUS.md` → "Esperando a Cesar".

1. **Datos sensibles (S5).** ¿Qué datos del comprador guarda la POC? Opciones: (a) ninguno: el pedido solo guarda el snapshot de productos y el comprador habla con el vendedor por WhatsApp; (b) nombre y comentario opcionales. **Recomendación:** (a) en la POC; (b) solo con política de retención aprobada.
2. **Scope (P3).** Confirmar el orden "vitrina primero" (ADR-0002) y que el import de Instagram queda como opcional y es lo primero que se recorta. **Recomendación:** confirmar.
3. **Dominio (T5).** Registrar `vitrinia.cl` en NIC Chile y delegar DNS a Cloudflare antes del inicio del Sprint 2. **Recomendación:** hacerlo esta semana; sin dominio el multi-tenant por host solo se demuestra en local.
4. **Moderación (S2).** Quién revisa las tiendas nuevas durante la POC. Opciones: (a) publicación automática tras verificar email + revisión posterior manual de Cesar; (b) aprobación manual previa a publicar. **Recomendación:** (b) mientras haya < 20 tiendas; impide que una tienda de estafa se publique bajo el dominio.
5. **Validación de mercado (P4).** Entrevistas a 5 vendedores antes de la demo (pendiente de PENDIENTES §3) y rubro de la primera tienda real. **Recomendación:** definir rubro antes del Sprint 2 (lo exige el preset 2).
6. **Presupuesto de agentes (C5).** El techo USD 50/mes cubre infraestructura, no tokens de IA. ¿Hay presupuesto mensual para el equipo de agentes? **Recomendación:** fijar un techo y medirlo en cada sprint-close.
7. **Aprobación de ADRs.** ADR-0001 a ADR-0007 requieren su aprobación (arquitectura fundamental, scope, datos sensibles o pagos). Ver `docs/adr/README.md`.
