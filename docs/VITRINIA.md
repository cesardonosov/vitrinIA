# VitrinIA — Documento maestro de definiciones

> Versión 2.0 · 7 de octubre de 2026 · Product Owner: Cesar
> Reemplaza al "Prompt maestro Commerce Accelerator" (v1). Toda decisión aquí es vinculante para los agentes. Cambiarla requiere un ADR aprobado por el Product Owner.

---

## 1. Qué es VitrinIA

VitrinIA permite que un vendedor que hoy vende por Instagram o WhatsApp pase de "vendo por mensajes" a "tengo una tienda online profesional" en minutos, gratis y sin conocimientos técnicos.

- **Dominio:** vitrinia.cl (pendiente registrar). Tiendas en `tutienda.vitrinia.cl`.
- **Mercado:** Chile. Moneda CLP. Idioma español (es-CL).
- **Principio:** *free first*. El vendedor no paga en V1. VitrinIA vive con OPEX mínimo y monetiza después (pagos, partners, logística).

### 1.1 Propuesta de valor frente a la competencia

| VitrinIA | Competencia (Take App, Kyte, catálogo WhatsApp, Tiendanube) |
|---|---|
| Tienda diseñada desde el Instagram y la referencia de estilo del vendedor | Plantillas genéricas |
| Hecha para Chile: CLP, Mercado Pago/Webpay, couriers locales, formalización | Globales o de otros países |
| Onboarding con fotos y texto libre | Formularios campo por campo |
| Administración con la IA propia del comercio (MCP) | No existe |
| Tesis de pagos/PSP con experiencia en negocio adquirente | Monetizan por suscripción |

El detalle vive en `docs/producto/COMPETENCIA.md`. **Riesgo principal:** lo técnico se copia; la ventaja sostenible es velocidad, calidad visual, distribución local y datos de GMV.

---

## 2. Modelo de negocio

### 2.1 Secuencia de monetización

1. **Vitrina gratis** (V1): sin ingresos, solo OPEX. Objetivo: generar flujo y datos de GMV.
2. **Graduación a Jumpseller**: comercios que crecen migran; VitrinIA cobra comisión de partner.
3. **Fee por transacción**: fee de marketplace en gateway (Mercado Pago u otro) sin licencia.
4. **PSP**: técnico (sin liquidar) o sub-adquirente (liquida). Decisión con inversionistas.

### 2.2 Regulación PSP (Chile)

Según la norma del Banco Central (Cap. III.J, julio 2024): los PSP que liquidan pagos solo deben registrarse en la CMF como Operador Sub-Adquirente sobre el 50% del umbral (~UF 27 millones liquidados en 12 meses). Bajo eso: sin registro ni capital mínimo. Los PSP que no liquidan quedan fuera de la norma. **Riesgo real a escala inicial: operacional (contracargos, liquidez, KYC), no regulatorio.**

### 2.3 Restricciones económicas

- **OPEX techo:** USD 50/mes en etapa gratis.
- **POC:** USD 0 de infraestructura (todo local).
- **IA en V1:** sin API propia. El comercio usa su propia IA vía MCP. Asistente propio solo si los datos del piloto lo justifican.
- **Dinero:** VitrinIA nunca toca fondos en V1. El comercio es titular de sus cuentas de pago.

---

## 3. Alcance de la POC (1 mes)

### 3.1 Objetivo

Demostrar, a la vez:
- **Técnica:** el flujo funciona de punta a punta.
- **Inversionistas:** demo convincente con tiendas reales que se ven profesionales.
- **Vendedores:** un vendedor real pide su tienda con un formulario simple y agradable, y la tienda se crea sola.

### 3.2 Criterios de éxito (Puerta A)

- 5 o más tiendas reales creadas, al menos 1 sin ayuda.
- Un vendedor nuevo crea su tienda en menos de 15 minutos.
- Pedidos registrados en la base de datos al hacer clic en WhatsApp.
- Demo para inversionistas lista con guion.

### 3.3 Dentro de la POC

- Formulario "Pide tu tienda" → tienda creada → publicada tras verificar email.
- Vitrina multi-tenant mobile first: home, catálogo, ficha, carrito.
- Checkout por WhatsApp + link de Mercado Pago del vendedor.
- Registro de pedidos (snapshot) para medir GMV estimado.
- Login Google + email. Panel mínimo para editar productos.
- Servidor MCP para administrar catálogo con la IA del comercio.
- Importación del export de Instagram (si el Sprint 4 lo permite).
- Exposición vía Cloudflare Tunnel para demos.

### 3.4 Fuera de la POC

Análisis de URL de referencia, Jumpseller, deploy público, asistente IA propio, pagos integrados, couriers, dominio propio de clientes, moderación completa.

### 3.5 Sprints (1 semana cada uno)

| Sprint | Objetivo | Demo de cierre |
|---|---|---|
| **1. Fundaciones y marca** | Repo, agentes, skills, CI completo, Clean Architecture, Postgres + RLS, Store Config v1, Docker, Storybook, marca VitrinIA (logo, tokens, preset 1), pre-mortem. | El proyecto levanta con un comando y pasa todas las barreras de CI. |
| **2. Vitrina y pedidos** | Multi-tenant por host, vitrina mobile first, carrito, checkout WhatsApp/MP, módulo `orders`, **captura de eventos de analítica (§7.1)**, preset 2 según rubro. | Una tienda real se ve profesional en el celular vía túnel y registra pedidos. |
| **3. Pide tu tienda** | Landing, formulario de onboarding, verificación de email, login, panel de productos, anti-abuso. | Un vendedor real crea y publica su tienda solo en menos de 15 minutos. |
| **4. MCP y demo** | Servidor MCP con confirmación en dos pasos, import Instagram, QA adversarial, pasada del Explorer, paquete de demo. | Cesar administra una tienda desde Claude Desktop frente a inversionistas. |

---

## 4. Roadmap posterior y puertas de decisión

```
POC ──[A]──► PILOTO PÚBLICO ──[B]──► MONETIZACIÓN ──[C]──► ESCALA
                                    ├─ Pagos:      MP integrado → fee → PSP
                                    ├─ Logística:  manual → agregador → tarifas propias
                                    ├─ Plataforma: Jumpseller vs motor propio [D]
                                    └─ IA/Canales: MCP remoto → WhatsApp → asistente
```

| Puerta | Cuándo | Criterio | Decisión |
|---|---|---|---|
| A | Fin POC | §3.2 cumplido + interés de inversionistas | Piloto público, financiamiento |
| B | Mes 3 | Tiendas activas con pedidos semanales | Pagos o logística primero |
| C | ~Mes 6 | GMV medido que justifique fee | Fee de gateway o PSP propio |
| D | Con C | % de comercios que requieren stock y boletas | Jumpseller o motor propio |

**Nota estratégica:** si la tesis final es PSP, el motor propio gana (el checkout y el GMV quedan en VitrinIA). Se decide con datos.

---

## 5. Stack técnico

| Capa | Decisión |
|---|---|
| Lenguaje | TypeScript `strict`, sin `any` |
| App | Una sola app **Next.js** (App Router). Portal en `app.vitrinia.cl`, vitrinas en `*.vitrinia.cl` |
| UI | Tailwind + shadcn/ui (portal); componentes propios registrados (vitrina) |
| Catálogo visual | Storybook |
| Base de datos | **PostgreSQL** (local en Docker para la POC) |
| ORM / migraciones | Drizzle |
| Validación | Zod en todos los bordes |
| Auth | Auth.js: Google + email (magic link). Mailpit en local |
| Storage | Disco local detrás del puerto `ImageStorage` |
| Jobs | Outbox en Postgres + worker pg-boss |
| IA | Sin API propia en V1. MCP para la IA del comercio |
| Tests | Vitest, Playwright, axe |
| Calidad | Biome, dependency-cruiser, commitlint, lefthook, gitleaks, Semgrep, Renovate |
| CI | GitHub Actions |
| Monorepo | pnpm (versiones de Node y pnpm fijadas) |
| Infra local | docker-compose: Postgres, Mailpit, app, worker |
| Demos | Cloudflare Tunnel |
| Hosting futuro | **Pendiente** (Railway o Vercel + worker). App dockerizada para no amarrarse |

### 5.1 Ruta POC → producción (por adaptador)

| POC | Producción |
|---|---|
| Postgres local | Supabase o Neon |
| Fotos en disco | R2 / S3 / Supabase Storage |
| Auth.js + Mailpit | Auth.js + proveedor de email real |
| PC + túnel | Railway o Vercel, detrás de Cloudflare |
| MCP local (stdio) | MCP remoto (HTTP + OAuth) |

---

## 6. Arquitectura

### 6.1 Principios

1. **Monolito modular** con **Clean Architecture completa en todos los módulos**.
2. **Multi-tenant** en una sola base de datos, con triple aislamiento.
3. **Config-driven:** una tienda es datos (Store Config), no código. La IA nunca genera HTML.
4. **Puertos y adaptadores** para todo lo externo.
5. **Mobile first** en portal y vitrinas.

### 6.2 Capas por módulo

```
src/modules/<modulo>/
├── domain/          entidades, value objects, reglas, errores. Cero dependencias externas.
├── application/     casos de uso + puertos (interfaces).
├── infrastructure/  adaptadores: Drizzle, storage, proveedores.
└── presentation/    server actions / route handlers / tools MCP: validan con Zod y llaman casos de uso.
```

- **Regla de dependencia:** presentation → application → domain. Verificada por dependency-cruiser en CI.
- **Composition root:** `src/infra/container.ts`.
- **Shared kernel:** `Money` (entero + moneda), `StoreId`, `Result<T,E>`, errores de dominio tipados.

### 6.3 Módulos

`identity` · `store-config` · `catalog` · `storefront` · `checkout` · `orders` · `analytics` · `catalog-agent` (MCP) · `audit` · `outbox`

### 6.4 Estructura del repo

```
vitrinia/
├── AGENTS.md
├── README.md
├── .claude/{agents,skills,settings.json}
├── docs/ (ver §10)
├── src/
│   ├── app/{(portal),(vitrina)}/
│   ├── modules/
│   ├── shared/
│   ├── infra/
│   └── middleware.ts
├── worker/
├── tests/{e2e,integration}/
├── drizzle/migrations/
├── infra/ (docker, cloudflare)
└── .github/{workflows,ISSUE_TEMPLATE}/
```

### 6.5 Componentes de plataforma

**Desde el inicio:** outbox + worker, Cloudflare delante (WAF, DDoS, CDN, bots), caché host→tienda, secretos cifrados (dotenvx), feature flags en Store Config, health check + monitor externo, respaldos probados (desde el primer deploy).

**Preparados (activación por gatillo):**

| Componente | Gatillo |
|---|---|
| `webhook_inbox` idempotente | Primer cobro real |
| Ledger de doble partida | Antes de tocar dinero |
| Verificación DNS de dominios propios | Primer cliente que lo pida |
| Variantes de imagen + URLs firmadas | Primer deploy |
| Puerto `CatalogSearch` | Tienda con más de 5.000 productos |
| Bus de eventos externo | Más de un servicio |

**Prohibido (sobreingeniería):** Kafka, RabbitMQ, Kubernetes, microservicios, API Gateway, Elasticsearch, Vault, multi-región.

---

## 7. Datos

- IDs **UUID v7**.
- Fechas `timestamptz` en UTC; se muestran en `America/Santiago`.
- Dinero: entero + columna `currency` (`CLP`).
- Store Config con `schemaVersion` y migraciones de configuración.
- Pedidos con **snapshot inmutable** (nombre y precio al comprar).
- Tabla `domains` (host → tienda) con `verified_at`.
- Teléfonos E.164 (+569…).
- Búsqueda: Postgres FTS con `unaccent` y `pg_trgm`.
- Columna `version` para concurrencia optimista.
- Audit log append-only.

### 7.1 Analítica de tiendas (activo estratégico)

Todo lo que hacen los compradores en cada vitrina se registra desde el Sprint 2. Es valor agregado para el vendedor, materia prima de las decisiones de producto y el respaldo de GMV ante inversionistas. **Un evento que no se capturó no se recupera.**

**Tres capas de datos, separadas:**

| Capa | Qué es | Dónde |
|---|---|---|
| Logs operativos | Errores, requests, performance | pino + Sentry (§6.5) |
| Audit log | Quién cambió qué en la tienda | Tabla `audit_log` append-only |
| **Eventos de comportamiento** | Qué hacen los compradores | Módulo `analytics`, tabla `events` |

**Eventos mínimos (catálogo versionado en `docs/arquitectura/eventos.md`):**
`store_visited` · `page_viewed` · `product_viewed` · `search_performed` · `category_viewed` · `cart_item_added` · `cart_item_removed` · `cart_viewed` · `checkout_started` · `order_whatsapp_clicked` · `order_mp_link_clicked` · `store_shared` · `cart_abandoned` (derivado).

Cada evento: `event_id` (UUID v7), `store_id`, `occurred_at`, `visitor_id` anónimo, `session_id`, `name`, `schema_version`, `properties` (validadas con Zod), origen (`referrer`, `utm_*`, detecta Instagram/WhatsApp), dispositivo.

**Privacidad por diseño (zona sensible):**
- Analítica first-party propia: sin Google Analytics ni terceros. Los datos son del negocio y no salen.
- `visitor_id` anónimo y rotativo (hash diario con sal), sin cookies de rastreo ni datos personales del comprador en eventos.
- IPs nunca se guardan completas.
- Retención y agregación definidas con Security antes del piloto público (Ley 21.719).

**Arquitectura:**
- Captura liviana en la vitrina (beacon, sin afectar el presupuesto de JS) → endpoint con rate limit → outbox → worker → tabla `events` particionada por mes.
- Puerto `AnalyticsSink`: Postgres en POC y piloto; almacén analítico (ClickHouse/BigQuery) solo con gatillo de volumen.
- Agregados diarios por tienda (`store_daily_metrics`) para dashboards rápidos.

**Entregables por etapa:**
- **POC (Sprint 2):** captura de eventos + pedidos. **(Sprint 4, si alcanza):** panel simple del vendedor: visitas, productos más vistos, embudo visita → carrito → pedido.
- **Piloto:** panel completo del vendedor y panel global VitrinIA (todas las tiendas, GMV estimado, conversión, rubros).
- **Futuro:** recomendaciones al vendedor ("este producto se ve mucho pero no se pide"), alertas, benchmarks por rubro, insumo de riesgo para la ruta PSP.
- Subdominios: lista de palabras reservadas, normalización (ñ, tildes), unicidad, redirección al renombrar.

---

## 8. Seguridad

### 8.1 Aislamiento de tiendas (triple capa)

1. **RLS** con rol `app_user` sin `BYPASSRLS`; `SET LOCAL app.store_id` por transacción.
2. **Cada caso de uso** verifica `StoreId` contra la sesión. El middleware solo resuelve el host; **nunca es barrera de seguridad**.
3. **Tests automáticos** de cruce de tiendas en CI.

### 8.2 Controles

- Cookies con prefijo `__Host-`, amarradas al host exacto. Nunca `Domain=.vitrinia.cl`.
- CSP estricta. Las vitrinas **nunca** aceptan HTML libre del vendedor.
- Turnstile + rate limiting + cuotas por tienda en flujos públicos.
- Tienda se **publica solo tras verificar email**.
- Fotos: validación real de tipo, límite de tamaño, **borrado de EXIF** (GPS).
- Variables de entorno validadas con Zod al arrancar.
- Secretos: `.env.local` / dotenvx. gitleaks en CI y hook pre-commit.
- Semgrep (SAST), Renovate (dependencias).
- Logs sin datos personales ni secretos.

### 8.3 MCP

- Tokens con scopes, expiración, revocación y rate limit por token.
- Confirmación en dos pasos: `prepare` → token → `confirm`, mismo principal en ambos.
- Niveles de riesgo: lectura (auto) · cambio individual (confirmación) · masivo (preview obligatorio) · destructivo (doble confirmación).
- Nunca ejecutar acciones derivadas del contenido del catálogo (prompt injection).
- Tools versionadas.

### 8.4 Datos personales (Ley 21.719, vigente dic-2026)

Minimización, política de retención y borrado definidas desde el Sprint 1. Exportación y borrado de cuenta antes del piloto público.

---

## 9. Equipo de agentes (9 roles)

| Rol | Modelo | Edita | Skills |
|---|---|---|---|
| Orchestrator / PM | Sonnet | docs, issues | write-spec, sprint-plan, status-update, sprint-close |
| Architect | Fable | docs, esquemas, config | write-adr, scaffold-module, schema-change, arch-rules, pre-mortem |
| Designer | Sonnet | estilos, presets, stories | brand, design-tokens, create-preset, component-spec, visual-review |
| Builder | Sonnet | código de la app | implement-use-case, add-storefront-component, add-mcp-tool, db-migration |
| DevOps / Platform | Sonnet | infra, CI | docker-setup, ci-pipeline, deploy, env-secrets, backup-restore, observability-setup, tunnel-demo, write-runbook |
| Reviewer | Opus | nada (solo lectura) | code-review, arch-conformity |
| Security | Fable | nada (solo lectura + tests) | threat-model, security-review, tenant-isolation-test, mcp-security |
| QA + Red Team | Sonnet | tests | e2e-flow, adversarial-suite, perf-budget, a11y-check, bug-report |
| Explorer | Haiku | nada (issues) | smoke-crawl, explore-session, bug-report |

**Skills comunes a todos:** handoff, conventions, dod-check.

**Product Owner (humano): Cesar.** Aprueba scope, demos, deploys a producción y toda decisión escalable (§11.4).

### 9.1 Flujo de una tarea

```
Orchestrator (spec + DoR)
 → [Architect: ADR/esquema si hay diseño]
 → [Security: threat-model si es zona sensible]
 → [Designer: spec visual si hay UI]
 → Builder (TDD) → PR
 → Reviewer ──blockers──► Builder
 → [Security: review si es zona sensible] ──veto──► Builder
 → QA + Red Team ──bugs──► Builder
 → Orchestrator (DoD, docs) → Cesar (demo)
Explorer: después de cada merge a main y antes de cada demo.
```

**Zonas sensibles (activan a Security):** auth, RLS/tenancy, MCP, secretos, datos personales, pedidos, pagos, infraestructura.

### 9.2 Guardrails

- Ningún agente hace push directo a `main` ni ejecuta comandos destructivos.
- Hook bloquea secretos antes del commit.
- Deploy a producción requiere OK explícito de Cesar.
- Un agente que detecta trabajo de otro rol crea un issue; no lo arregla en silencio.

---

## 10. Documentación

**Docs como código.** Si no está en el repo, no existe.

```
AGENTS.md · README.md
docs/
├── README.md · STATUS.md · PENDIENTES.md · VITRINIA.md
├── producto/   PRODUCT, ROADMAP, GLOSSARY, COMPETENCIA
├── arquitectura/ ARCHITECTURE, modulos/, data-model (generado)
├── adr/
├── sprints/
├── design/
├── security/   SECURITY, threat-models/
├── qa/
└── runbooks/
```

- Cada PR actualiza la documentación que toca (DoD).
- Decisiones importantes → ADR (contexto, decisión, alternativas, consecuencias).
- Diagramas en Mermaid.
- Generado: OpenAPI desde Zod, modelo de datos desde Drizzle, changelog desde commits, catálogo en Storybook.
- Prohibida la documentación ficticia.
- `STATUS.md` tiene la sección **"Esperando a Cesar"** con preguntas concretas y opciones.

---

## 11. Metodología

### 11.1 Scrum liviano + spec-driven

Planning (inicio) → ejecución → STATUS.md como daily → demo (cierre) → retro de 3 líneas.

### 11.2 Convenciones

- Código, identificadores y commits en **inglés**; documentación en **español**.
- IDs `VIT-xxx`. Ramas `feat/VIT-xxx-desc`, `fix/VIT-xxx-desc`. PRs chicos.
- Commits semánticos (commitlint). `main` protegida.
- TODO solo como `TODO(VIT-xxx)` con issue existente y abierto (verificado por CI). Prohibidos TODO/FIXME/HACK sueltos.

### 11.3 Definition of Ready / Done

**Ready:** objetivo, historia, criterios de aceptación, fuera de scope, dependencias, riesgos, zona sensible marcada.

**Done:** criterios cumplidos · tipos correctos · tests (unit + integración + E2E si aplica) · estados de error · mobile first · accesibilidad · sin secretos · logs adecuados · docs actualizadas · review aprobado · security aprobado si aplica · QA aprobado · sin blockers.

### 11.4 Escalar a Cesar

Modelo de negocio, pagos, datos sensibles, scope, arquitectura fundamental, vendor lock-in irreversible, deploys a producción. Lo demás se resuelve con docs, ADRs y buenas prácticas.

---

## 12. Pendientes (no bloquean la POC)

- Registrar vitrinia.cl. Revisar marca en INAPI y usuario de Instagram.
- Empresa, socios, términos de uso, política de privacidad.
- Hosting definitivo (Railway vs Vercel + worker).
- Nivel de partner Jumpseller (afiliado vs profesional).
- Disponibilidad del fee de marketplace de Mercado Pago en Chile.
- Moderación de tiendas y denuncia de abuso (antes del piloto público).
- Validación con vendedores: uso de catálogo WhatsApp / Take App / Kyte.
- Rubro de la primera tienda real.
