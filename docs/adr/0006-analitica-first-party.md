# ADR-0006: Analítica first-party de vitrinas

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — datos sensibles del comportamiento de compradores)
- Issue: VIT-125
- Zona sensible: sí (datos personales, §7.1 "privacidad por diseño") — requiere threat-model de Security antes de pasar a Aceptado

## Contexto

- §7.1: todo lo que hacen los compradores se registra desde el Sprint 2; "un evento que no se capturó no se recupera". Es valor para el vendedor, insumo de producto y respaldo de GMV.
- §7.1 fija: tabla `events` (particionada por mes), beacon liviano, endpoint con rate limit → outbox → worker, puerto `AnalyticsSink`, agregados `store_daily_metrics`, sin Google Analytics ni terceros, `visitor_id` anónimo y rotativo (hash diario con sal), sin cookies de rastreo, IPs nunca completas, retención definida con Security antes del piloto (Ley 21.719).
- Presupuesto de vitrina: JS < 100 KB. OPEX: tier gratis de Postgres gestionado en el piloto.
- Pre-mortem 2026-10-08: T3 (outbox pierde eventos) y C1 (`events` llena la BD) son riesgos altos.

## Decisión

Usaremos **analítica propia, sin terceros, sobre Postgres detrás del puerto `AnalyticsSink`**:

1. **Captura:** script inline mínimo (objetivo < 2 KB) que envía con `navigator.sendBeacon` al mismo host de la vitrina (`/api/e`). Sin cookies. `session_id` aleatorio en `sessionStorage`. Eventos del catálogo versionado de `docs/arquitectura/eventos.md` (a crear en el Sprint 2), cada uno con `schema_version`.
2. **Endpoint:** valida con Zod (nombre del catálogo, propiedades por evento y tamaño máximo), aplica rate limit por IP y tienda, resuelve la tienda por host (ADR-0003) y escribe en el outbox. Responde 204 sin esperar más.
3. **`visitor_id`:** se calcula **en el servidor** como `hash(sal_diaria ‖ store_id ‖ IP truncada ‖ user-agent)`. La sal rota cada día y se descarta; la IP se usa solo en memoria y nunca se persiste. No es posible enlazar visitantes entre días ni entre tiendas.
4. **Worker:** consume el outbox en lotes agrupados por tienda, con `withStoreTx` (ADR-0003, sin `BYPASSRLS`), enriquece (origen Instagram/WhatsApp por `referrer`/`utm_*`, tipo de dispositivo) e inserta en `events` vía `AnalyticsSink`. Inserción idempotente por `(event_id, occurred_at)` (en tablas particionadas la clave única debe incluir la columna de partición; `event_id` es UUID v7); reintentos con dead-letter; alerta si el backlog supera 5 min.
5. **Almacenamiento:** `events` con particionado nativo mensual por `occurred_at`; el worker crea las particiones con anticipación. Job diario calcula `store_daily_metrics` y deriva `cart_abandoned`. Retención: borrado por partición (`DETACH` + archivo) según la política que apruebe Security; propuesta inicial: eventos crudos 13 meses, agregados indefinidos.
6. **Gatillo de almacén analítico** (ClickHouse/BigQuery): solo cuando el volumen lo exija, con ADR nuevo.

## Alternativas consideradas

1. **First-party sobre Postgres con outbox (elegida)**
   - Pros: datos propios que no salen (§7.1); USD 0; mismo modelo de aislamiento que el resto; el sink se cambia sin tocar la captura.
   - Contras: Postgres no es un almacén analítico; doble escritura (outbox + `events`).
2. **Google Analytics 4 o similar SaaS**
   - Pros: paneles listos, gratis.
   - Contras: prohibido por §7.1; datos fuera del negocio; cookies de rastreo; JS pesado.
3. **PostHog/Umami/Plausible self-hosted**
   - Pros: paneles maduros, también first-party.
   - Contras: servicio y BD extra (OPEX, mantenimiento); modelo de datos ajeno, difícil de unir con pedidos y tiendas con RLS.
4. **Insertar directo en `events` desde el endpoint (sin outbox)**
   - Pros: más simple, una escritura menos.
   - Contras: enriquecimiento en la ruta de la request; cambiar de sink obliga a tocar el endpoint; picos de tráfico pegan directo en la tabla particionada.

## Consecuencias

- Positivas: activo de datos desde el Sprint 2; privacidad por diseño verificable; cero dependencias de terceros.
- Negativas / deuda:
  - Sin cookies, el `visitor_id` diario subestima visitantes recurrentes y no permite atribución de varios días.
  - Los ad blockers pueden filtrar el endpoint si su nombre o patrón se parece a trackers conocidos.
  - El worker es punto único de falla para la ingesta: si cae, el outbox crece (monitorear).
  - Mantener particiones, retención y agregados es trabajo operativo continuo.
- Reversibilidad: **reversible** para el sink (puerto `AnalyticsSink`); **irreversible** para eventos no capturados o capturados sin propiedades.
- Seguridad: sin PII del comprador ni IP persistida; propiedades validadas por Zod (sin campos libres que puedan contener datos personales); rate limit contra inflado de métricas.
- OPEX: USD 0 en POC. En el piloto, `events` es el mayor consumidor de espacio de la BD; vigilar crecimiento mensual (pre-mortem C1).

## Pendiente para Aceptado

- Threat-model de Security (re-identificación por hash, retención, abuso del endpoint).
- Política de retención aprobada por Security; OK de Cesar.
