# ADR-0001: Stack técnico de la POC

- Estado: Propuesto
- Fecha: 2026-10-08
- Decide: Cesar (aprobación requerida: sí — arquitectura fundamental y riesgo de lock-in)
- Issue: VIT-101
- Zona sensible: sí (infraestructura, auth, secretos) — requiere threat-model de Security antes de pasar a Aceptado

## Contexto

- VITRINIA.md §5 fija el stack; este ADR registra el porqué y las alternativas para que cambiarlo después tenga un punto de partida.
- Restricciones: POC con USD 0 de infraestructura (todo local), OPEX techo USD 50/mes en etapa gratis (§2.3), hosting futuro pendiente (D4: Railway o Vercel + worker), prohibidos Kafka, Kubernetes, microservicios y API Gateway (§6.5).
- Equipo: 9 agentes de IA y un Product Owner humano. El stack debe ser muy conocido por los modelos y tener tipos estrictos que atrapen errores antes del review.
- Dos superficies en una sola base: portal (`app.vitrinia.cl`) y vitrinas (`*.vitrinia.cl`), con multi-tenant por host (ADR-0003).

## Decisión

Usaremos **una sola app Next.js (App Router) en TypeScript strict**, con PostgreSQL + Drizzle, Zod en todos los bordes, Auth.js (Google + magic link), outbox en Postgres + worker pg-boss, Tailwind + shadcn/ui en el portal y componentes propios registrados en la vitrina, Vitest + Playwright + axe, pnpm con versiones fijadas, docker-compose local (Postgres, Mailpit, app, worker) y Cloudflare Tunnel para demos. Todo lo externo (storage, email, BD gestionada, IA) queda detrás de puertos (§6.1.4) para que la ruta POC → producción (§5.1) sea cambiar adaptadores.

## Alternativas consideradas

1. **Next.js monolito + Postgres + Drizzle (elegida)**
   - Pros: una sola app y un solo deploy; SSR para la vitrina (LCP < 2,5 s en 4G); ecosistema que los modelos conocen bien; Drizzle genera SQL legible y migraciones revisables; Postgres da RLS, FTS con `unaccent`/`pg_trgm`, particionado y jsonb sin servicios extra.
   - Contras: Next.js cambia rápido (App Router, caché, middleware) y tiene historial de vulnerabilidades en middleware; acoplamiento a su modelo de render; Drizzle es más joven que Prisma.
2. **Remix/React Router o SvelteKit + Postgres**
   - Pros: modelo de datos más simple que App Router; menos "magia" de caché.
   - Contras: menos componentes listos (shadcn/ui es React; Svelte no lo tiene); menos ejemplos y conocimiento en los agentes; Auth.js con soporte menos maduro.
3. **Backend separado (NestJS/Fastify) + frontend SPA/Next**
   - Pros: separación física de capas; API reutilizable para MCP remoto.
   - Contras: dos deploys y más OPEX; duplica validación y tipos; es un paso hacia microservicios que §6.5 prohíbe sin necesidad.
4. **Plataforma "todo en uno" (Supabase Auth + Storage + Edge Functions, o Firebase)**
   - Pros: menos código propio; tier gratis generoso.
   - Contras: lock-in fuerte (auth, storage y reglas propietarias); Firebase no es Postgres (sin RLS SQL ni FTS); contradice "POC 100 % local" y los puertos de §5.1.
5. **Prisma en vez de Drizzle**
   - Pros: más maduro, más documentación.
   - Contras: control de SQL y de `SET LOCAL` por transacción menos directo; motor adicional; migraciones menos transparentes para revisar políticas RLS.

## Consecuencias

- Positivas:
  - Un solo lenguaje y un solo repositorio para los 9 agentes; tipos compartidos desde Zod hasta la UI.
  - Postgres concentra datos, outbox, colas (pg-boss), búsqueda y analítica de la POC: cero servicios extra.
  - La app dockerizada evita amarrarse a Vercel o Railway (D4 sigue abierta).
- Negativas / deuda:
  - El worker pg-boss es un proceso aparte: en Vercel exige un segundo servicio (impacta D4 y OPEX).
  - Dependemos de la evolución de Next.js; las actualizaciones mayores requieren su propio ADR o issue.
  - Postgres como cola y como almacén de eventos tiene techo de volumen; el gatillo está en ADR-0006.
  - Auth.js v5 obliga a fijar versión y a revisar cada actualización (zona sensible).
- Reversibilidad: **media**. Cambiar ORM, auth o storage es reversible por los puertos. Cambiar de framework web es caro (reescribe presentación) pero no toca dominio ni aplicación gracias a Clean Architecture. Cambiar de Postgres es caro (RLS, FTS, pg-boss) y se considera irreversible en la POC.
- Seguridad: Zod en bordes, TypeScript strict, Semgrep, gitleaks y Renovate desde el Sprint 1; Next.js obliga a seguir avisos de seguridad (Renovate + revisión de Security).
- OPEX: USD 0 en la POC. En el piloto: BD gestionada (tier gratis de Supabase o Neon) + app + worker; estimación pendiente de D4.

## Pendiente para Aceptado

- Threat-model de Security sobre auth (Auth.js) e infraestructura local/túnel.
- OK de Cesar (agregar a STATUS.md → "Esperando a Cesar").
