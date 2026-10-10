# Headers de seguridad

Implementa VIT-115 (pre-mortem de Security, control 11). Esta nota se fusionará en `docs/security/SECURITY.md` (sección headers) cuando esa rama esté en `main`.

## Qué se envía

| Header | Valor | Dónde |
|---|---|---|
| `Content-Security-Policy-Report-Only` | política con `nonce-<por request>` y `'strict-dynamic'` | `src/proxy.ts` (antes `middleware.ts`, ADR-0011) + `src/infra/security/csp.ts` |
| `Content-Security-Policy` | solo `frame-ancestors 'none'` (**enforced**) | `next.config.ts` |
| `X-Frame-Options` | `DENY` | `next.config.ts` |
| `X-Content-Type-Options` | `nosniff` | `next.config.ts` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | `next.config.ts` |

- El nonce se genera en el middleware (16 bytes aleatorios por request). El middleware solo pone headers; **no autoriza**.
- Las páginas son dinámicas (`export const dynamic = "force-dynamic"` en el layout) para que Next marque sus scripts con el nonce.
- `frame-ancestors 'none'` se aplica hoy a toda la app (portal y vitrinas); ninguna debe poder embeberse.
- En desarrollo se agrega `'unsafe-eval'` al `script-src` (lo necesita el dev server). Nunca en producción.

## Por qué el CSP enforced y el report-only van separados

Next toma el nonce del header `Content-Security-Policy` si existe; si ese header no trae `script-src`, no hay nonce y los scripts quedan sin etiquetar. Por eso el header enforced se pone en `next.config.ts` (no pasa por el middleware) y la política con nonce va solo como report-only. En Sprint 2, al pasar a enforce, la política completa reemplaza a ambos en el middleware.

## Endpoint de reportes

`POST /api/csp-report` (`src/app/api/csp-report/route.ts`):

- Acepta `application/csp-report` y `application/reports+json`; valida con Zod (`src/infra/security/csp-report.ts`).
- Límite de 8 KiB (413). JSON o forma inválida: 400. Rate limit en memoria, 30 por minuto por IP (429); falla cerrado si la tabla de claves se llena.
- Responde siempre sin cuerpo (204 en éxito).
- Solo registra el evento `security.csp_violation` con directiva, origen bloqueado, origen del documento y disposición. Se descartan rutas y querystrings (pueden traer tokens o PII). La IP se usa como clave del limitador y nunca se registra.
- El limitador es por proceso: con varias instancias el límite efectivo es por instancia.

## Pendiente para enforce (Sprint 2)

- Revisar los reportes acumulados y ajustar `style-src` (hoy `'unsafe-inline'`) e `img-src`.
- Decidir si se endurece con `Reporting-Endpoints`/`report-to`.
