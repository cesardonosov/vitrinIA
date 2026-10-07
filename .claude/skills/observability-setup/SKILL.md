---
name: observability-setup
description: Configura logs estructurados con pino (request_id y store_id, sin datos personales), Sentry gratis, endpoint de health check, monitor externo gratuito y alertas; úsala al montar o ampliar la observabilidad.
---

# observability-setup

## Cuándo usarla
- Sprint 1 (base) y antes del primer deploy (monitor externo y alertas).
- Al agregar un módulo, un worker job o un flujo crítico nuevo.
- Cuando un incidente no se pudo diagnosticar con lo que había.

## Entradas
- DSN de Sentry (plan free), cuenta de UptimeRobot o Better Stack (free).
- Esquema de env (`src/infra/env.ts`) y skill `env-secrets`.
- Lista de flujos críticos: pedido, onboarding, login, MCP, worker.

## Pasos
1. Logger único en `src/infra/logger.ts` con pino: JSON en producción, `pino-pretty` solo en dev. Campos fijos: `time`, `level`, `service` (`app`|`worker`), `request_id`, `store_id`, `event`, `duration_ms`.
2. `request_id`: generado en el borde (o tomado de `cf-ray`/`x-request-id` de Cloudflare), propagado con `AsyncLocalStorage` hasta casos de uso, outbox y jobs de pg-boss (se guarda en el payload del evento).
3. `store_id` viene de la sesión verificada en el caso de uso, no de headers del middleware.
4. Sin datos personales ni secretos: `redact` de pino para `*.email`, `*.phone`, `*.password`, `*.token`, `authorization`, `cookie`, `*.address`. Se loguean IDs (UUID), nunca nombres, emails, teléfonos ni cuerpos de pedidos. Test unitario que falla si un log contiene `@` o `+569`.
5. Sentry (`@sentry/nextjs` y worker): `tracesSampleRate` 0.05, `sendDefaultPii: false`, `beforeSend` que borra emails/teléfonos/cookies/headers, `environment` y `release` = SHA. Respeta la cuota gratuita; sin session replay.
6. `GET /api/health`: devuelve `{status, version, db}` con `SELECT 1` y timeout de 2 s; no expone detalles internos. Variante `GET /api/health/worker` o heartbeat en tabla para pg-boss. Sin autenticación y con rate limit en Cloudflare.
7. Monitor externo gratuito: chequeo HTTP cada 5 min a `https://app.vitrinia.cl/api/health` y a una vitrina de prueba (palabra clave esperada); monitor de heartbeat para el backup diario.
8. Alertas: email a Cesar al fallar 2 chequeos seguidos; Sentry avisa solo issues nuevos y regresiones; alerta si la cola outbox crece (> 100 jobs pendientes por 10 min).
9. Verifica: provoca un error de prueba y confirma `request_id` idéntico en log, Sentry y respuesta; confirma que Sentry no muestra PII; apaga la BD en staging y confirma que el health falla y llega la alerta.

## Salida
`src/infra/logger.ts`, configuración Sentry, ruta `/api/health`, `docs/runbooks/observabilidad.md` con tabla alerta → causa probable → primer paso.

## Checklist
- [ ] Todo log lleva `request_id`; los de tenant llevan `store_id`.
- [ ] `redact` probado con test.
- [ ] Sentry sin PII y dentro de cuota free.
- [ ] Health check con DB y worker.
- [ ] Monitor externo y alerta de prueba recibida.
- [ ] Costo adicional: USD 0 (si no, justificar frente al techo de USD 50).

## Errores comunes
- Loguear el objeto `req`/`body` completo.
- `console.log` suelto (Biome `noConsole` lo bloquea).
- Health que siempre responde 200 sin tocar la BD.
- Mandar `store_id` desde el cliente como dato de log confiable.
- Sampling 100% y agotar la cuota de Sentry en una semana.
- Monitor que pega al dominio detrás de Turnstile/WAF y recibe 403.
